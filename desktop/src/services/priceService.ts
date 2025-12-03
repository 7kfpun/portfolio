import { priceDataService } from './priceDataService';
import { settingsService } from './settingsService';
import { yahooFinanceService } from './yahooFinanceService';
import { PriceRecord } from '../types/PriceData';
import { ApiCredits } from '../types/ApiCredits';
import { RateLimiter, fetchWithBackoff } from '../utils/rateLimiter';

interface TwelveDataQuoteResponse {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  datetime: string;
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
  average_volume: string;
  is_market_open: boolean;
  fifty_two_week: {
    low: string;
    high: string;
    low_change: string;
    high_change: string;
    low_change_percent: string;
    high_change_percent: string;
    range: string;
  };
}

export class PriceService {
  private readonly baseUrl = 'https://api.twelvedata.com';
  private readonly rateLimiter = new RateLimiter(30);
  private apiCredits: ApiCredits = {
    used: 0,
    remaining: 0,
    total: 0,
    lastUpdated: new Date().toISOString(),
  };
  private creditsListeners: Array<(credits: ApiCredits) => void> = [];


  private toNumber(value?: string): number | undefined {
    if (!value) return undefined;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

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

  private getExchangeAndSymbol(stock: string): { exchange: string | null; symbol: string } {
    if (!stock.includes(':')) {
      return { exchange: null, symbol: stock };
    }

    const [first, second] = stock.split(':', 2);
    const knownExchanges = new Set([
      'NASDAQ',
      'NYSE',
      'NYSEARCA',
      'TWSE',
      'JPX',
      'HKEX',
    ]);

    if (knownExchanges.has(first)) {
      return { exchange: first, symbol: second };
    }

    if (knownExchanges.has(second)) {
      return { exchange: second, symbol: first };
    }

    return { exchange: null, symbol: stock };
  }

  private isApiSupported(stock: string): boolean {
    const { exchange } = this.getExchangeAndSymbol(stock);
    return true;
  }

  private convertToTwelveDataFormat(stock: string): string {
    const { exchange, symbol } = this.getExchangeAndSymbol(stock);

    if (exchange === 'HKEX') {
      return `HKEX:${symbol}`;
    }

    if (exchange === 'TWSE') {
      return `${symbol}.TW`;
    }

    if (exchange === 'JPX') {
      return `${symbol}.T`;
    }

    if (exchange) {
      return `${exchange}:${symbol}`;
    }

    return stock;
  }

  private async requestQuote(stock: string): Promise<TwelveDataQuoteResponse | null> {
    const apiKey = await settingsService.getTwelveDataApiKey();
    if (!apiKey) {
      console.warn('No Twelve Data API key configured');
      return null;
    }

    const twelveDataSymbol = this.convertToTwelveDataFormat(stock);
    const url = new URL(`${this.baseUrl}/quote`);
    url.searchParams.set('symbol', twelveDataSymbol);
    url.searchParams.set('apikey', apiKey);

    try {
      const response = await this.rateLimiter.schedule(() =>
        fetchWithBackoff(() => fetch(url.toString()))
      );

      this.updateApiCredits(response);

      if (!response.ok) {
        console.error(`Failed to fetch quote for ${stock}: ${response.status}`);
        return null;
      }

      const data: TwelveDataQuoteResponse = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching quote for ${stock}:`, error);
      return null;
    }
  }

  private buildRecord(stock: string, quote: TwelveDataQuoteResponse, dateOverride: string): PriceRecord | null {
    const close = this.toNumber(quote.close);
    if (close === undefined) return null;

    return {
      symbol: stock,
      date: dateOverride,
      close,
      open: this.toNumber(quote.open),
      high: this.toNumber(quote.high),
      low: this.toNumber(quote.low),
      volume: this.toNumber(quote.volume),
      source: 'twelve_data',
      updated_at: new Date().toISOString(),
    };
  }

  private async fetchAndStorePrice(stock: string, dateOverride: string): Promise<PriceRecord | null> {
    let record: PriceRecord | null = null;
    const { exchange, symbol } = this.getExchangeAndSymbol(stock);

    if (exchange === 'JPX') {
      record = await yahooFinanceService.getLatestDaily(`${symbol}.T`, stock);
    } else if (exchange === 'TWSE') {
      // Taiwan via Yahoo Finance (e.g., 2330.TW)
      record = await yahooFinanceService.getLatestDaily(`${symbol}.TW`, stock);
    } else {
      const quote = await this.requestQuote(stock);
      if (quote) {
        record = this.buildRecord(stock, quote, dateOverride);
      }
    }

    if (!record) return null;

    await priceDataService.savePrices([record]);
    return record;
  }

  async getLastClosePrice(stock: string): Promise<number | null> {
    try {
      const targetDate = this.getTargetDate();
      const cachedForDate = await priceDataService.getPriceByDate(stock, targetDate);
      if (cachedForDate) {
        return cachedForDate.close;
      }

      const fresh = await this.fetchAndStorePrice(stock, targetDate);
      if (fresh) {
        return fresh.close;
      }

      const fallback = await priceDataService.getLatestPrice(stock);
      return fallback?.close ?? null;
    } catch (error) {
      console.error(`Error resolving price for ${stock}:`, error);
      return null;
    }
  }

  async getQuote(stock: string): Promise<TwelveDataQuoteResponse | null> {
    return this.requestQuote(stock);
  }

  async getCachedPrices(stocks: string[]): Promise<Map<string, number>> {
    const uniqueStocks = Array.from(new Set(stocks));
    const priceMap = new Map<string, number>();

    const allPrices = await priceDataService.loadAllPrices();
    const pricesBySymbol = new Map<string, PriceRecord[]>();

    for (const price of allPrices) {
      if (!pricesBySymbol.has(price.symbol)) {
        pricesBySymbol.set(price.symbol, []);
      }
      pricesBySymbol.get(price.symbol)!.push(price);
    }

    for (const stock of uniqueStocks) {
      const stockPrices = pricesBySymbol.get(stock) || [];
      const sorted = stockPrices.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      if (sorted[0]) {
        priceMap.set(stock, sorted[0].close);
      }
    }

    return priceMap;
  }

  async getBatchPrices(stocks: string[]): Promise<Map<string, number>> {
    const uniqueStocks = Array.from(new Set(stocks));
    const priceMap = new Map<string, number>();
    const needsRefresh: string[] = [];
    const targetDate = this.getTargetDate();

    // Load all prices once instead of loading for each stock
    const allPrices = await priceDataService.loadAllPrices();
    const pricesBySymbol = new Map<string, PriceRecord[]>();

    for (const price of allPrices) {
      if (!pricesBySymbol.has(price.symbol)) {
        pricesBySymbol.set(price.symbol, []);
      }
      pricesBySymbol.get(price.symbol)!.push(price);
    }

    for (const stock of uniqueStocks) {
      const stockPrices = pricesBySymbol.get(stock) || [];
      const cached = stockPrices.find(p => p.date === targetDate);

      if (cached) {
        priceMap.set(stock, cached.close);
        continue;
      }

      if (this.isApiSupported(stock)) {
        needsRefresh.push(stock);
      } else {
        // Use latest price as fallback
        const sorted = stockPrices.sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        if (sorted[0]) {
          priceMap.set(stock, sorted[0].close);
        }
      }
    }

    for (const stock of needsRefresh) {
      const fresh = await this.fetchAndStorePrice(stock, targetDate);
      if (fresh) {
        priceMap.set(stock, fresh.close);
        continue;
      }

      const fallback = await priceDataService.getLatestPrice(stock);
      if (fallback) {
        priceMap.set(stock, fallback.close);
      }
    }

    return priceMap;
  }
}

export const priceService = new PriceService();
