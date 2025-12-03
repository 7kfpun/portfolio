import { fxRateDataService } from './fxRateDataService';
import { settingsService } from './settingsService';
import { FxRateRecord } from '../types/FxRateData';
import { ApiCredits } from '../types/ApiCredits';
import { RateLimiter, fetchWithBackoff } from '../utils/rateLimiter';

interface TwelveDataExchangeRateResponse {
  symbol: string;
  rate: number;
  timestamp: number;
}

export class FxRateService {
  private readonly baseUrl = 'https://api.twelvedata.com';
  private readonly rateLimiter = new RateLimiter(30);
  private apiCredits: ApiCredits = {
    used: 0,
    remaining: 0,
    total: 0,
    lastUpdated: new Date().toISOString(),
  };
  private creditsListeners: Array<(credits: ApiCredits) => void> = [];

  private getTargetDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().slice(0, 10);
  }

  private updateApiCredits(response: Response): void {
    const used = response.headers.get('api-credits-used');
    const remaining = response.headers.get('api-credits-left');

    if (used && remaining) {
      const usedNum = parseInt(used, 10);
      const remainingNum = parseInt(remaining, 10);

      this.apiCredits = {
        used: usedNum,
        remaining: remainingNum,
        total: usedNum + remainingNum,
        lastUpdated: new Date().toISOString(),
      };

      this.creditsListeners.forEach(listener => listener(this.apiCredits));
    }
  }

  onCreditsUpdate(listener: (credits: ApiCredits) => void): () => void {
    this.creditsListeners.push(listener);
    if (this.apiCredits.total > 0) {
      listener(this.apiCredits);
    }
    return () => {
      const index = this.creditsListeners.indexOf(listener);
      if (index > -1) {
        this.creditsListeners.splice(index, 1);
      }
    };
  }

  getApiCredits(): ApiCredits {
    return { ...this.apiCredits };
  }

  private async requestExchangeRate(fromCurrency: string, toCurrency: string): Promise<TwelveDataExchangeRateResponse | null> {
    const apiKey = await settingsService.getTwelveDataApiKey();
    if (!apiKey) {
      console.warn('No Twelve Data API key configured');
      return null;
    }

    const symbol = `${fromCurrency}/${toCurrency}`;
    const url = new URL(`${this.baseUrl}/exchange_rate`);
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('apikey', apiKey);

    try {
      const response = await this.rateLimiter.schedule(() =>
        fetchWithBackoff(() => fetch(url.toString()))
      );

      this.updateApiCredits(response);

      if (!response.ok) {
        console.error(`Failed to fetch FX rate for ${symbol}: ${response.status}`);
        return null;
      }

      const data: TwelveDataExchangeRateResponse = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching FX rate for ${symbol}:`, error);
      return null;
    }
  }

  private buildRecord(fromCurrency: string, toCurrency: string, rate: number, dateOverride: string): FxRateRecord {
    return {
      from_currency: fromCurrency,
      to_currency: toCurrency,
      date: dateOverride,
      rate,
      source: 'twelve_data',
      updated_at: new Date().toISOString(),
    };
  }

  private async fetchAndStoreRate(fromCurrency: string, toCurrency: string, dateOverride: string): Promise<FxRateRecord | null> {
    const response = await this.requestExchangeRate(fromCurrency, toCurrency);
    if (!response) return null;

    const record = this.buildRecord(fromCurrency, toCurrency, response.rate, dateOverride);
    await fxRateDataService.saveRates([record]);
    return record;
  }

  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    try {
      if (fromCurrency === toCurrency) {
        return 1.0;
      }

      const targetDate = this.getTargetDate();
      const cachedForDate = await fxRateDataService.getRateByDate(fromCurrency, toCurrency, targetDate);
      if (cachedForDate) {
        return cachedForDate.rate;
      }

      const fresh = await this.fetchAndStoreRate(fromCurrency, toCurrency, targetDate);
      if (fresh) {
        return fresh.rate;
      }

      const fallback = await fxRateDataService.getLatestRate(fromCurrency, toCurrency);
      return fallback?.rate ?? null;
    } catch (error) {
      console.error(`Error resolving FX rate for ${fromCurrency}/${toCurrency}:`, error);
      return null;
    }
  }

  async getBatchRates(pairs: Array<{ from: string; to: string }>): Promise<Map<string, number>> {
    const rateMap = new Map<string, number>();
    const needsRefresh: Array<{ from: string; to: string }> = [];
    const targetDate = this.getTargetDate();

    for (const pair of pairs) {
      if (pair.from === pair.to) {
        rateMap.set(`${pair.from}_${pair.to}`, 1.0);
        continue;
      }

      const cached = await fxRateDataService.getRateByDate(pair.from, pair.to, targetDate);
      if (cached) {
        rateMap.set(`${pair.from}_${pair.to}`, cached.rate);
        continue;
      }

      needsRefresh.push(pair);
    }

    for (const pair of needsRefresh) {
      const fresh = await this.fetchAndStoreRate(pair.from, pair.to, targetDate);
      if (fresh) {
        rateMap.set(`${pair.from}_${pair.to}`, fresh.rate);
        continue;
      }

      const fallback = await fxRateDataService.getLatestRate(pair.from, pair.to);
      if (fallback) {
        rateMap.set(`${pair.from}_${pair.to}`, fallback.rate);
      }
    }

    return rateMap;
  }
}

export const fxRateService = new FxRateService();
