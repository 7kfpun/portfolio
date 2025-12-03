import { settingsService } from './settingsService';
import { PriceRecord } from '../types/PriceData';
import { RateLimiter, fetchWithBackoff } from '../utils/rateLimiter';

interface MassiveDailyBar {
  c: number;
  h: number;
  l: number;
  n: number;
  o: number;
  t: number;
  v: number;
  vw: number;
}

interface MassiveResponse {
  ticker: string;
  queryCount: number;
  resultsCount: number;
  adjusted: boolean;
  results: MassiveDailyBar[];
  status: string;
  request_id: string;
  count: number;
}

export class MassiveService {
  private readonly baseUrl = 'https://api.polygon.io';
  private readonly rateLimiter = new RateLimiter(5);

  private toNumber(value?: number): number | undefined {
    if (value === undefined || value === null) return undefined;
    return Number.isFinite(value) ? value : undefined;
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toISOString().slice(0, 10);
  }

  private async requestDailyBars(symbol: string, from: string, to: string): Promise<MassiveResponse | null> {
    const apiKey = await settingsService.getMassiveApiKey();
    if (!apiKey) {
      console.warn('No Massive API key configured');
      return null;
    }

    const url = new URL(`${this.baseUrl}/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}`);
    url.searchParams.set('adjusted', 'true');
    url.searchParams.set('sort', 'desc');
    url.searchParams.set('limit', '1');
    url.searchParams.set('apiKey', apiKey);

    try {
      const response = await this.rateLimiter.schedule(() =>
        fetchWithBackoff(() => fetch(url.toString()))
      );

      if (!response.ok) {
        console.error(`Massive API error for ${symbol}: ${response.status}`);
        return null;
      }

      const data: MassiveResponse = await response.json();

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        console.error(`Massive returned invalid data for ${symbol}`, data);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Error fetching data from Massive for ${symbol}:`, error);
      return null;
    }
  }

  async getQuote(symbol: string): Promise<PriceRecord | null> {
    const to = new Date().toISOString().slice(0, 10);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    const from = fromDate.toISOString().slice(0, 10);

    const response = await this.requestDailyBars(symbol, from, to);
    if (!response || !response.results || response.results.length === 0) return null;

    const latestBar = response.results[0];
    const close = this.toNumber(latestBar.c);
    if (close === undefined) return null;

    return {
      symbol,
      date: this.formatDate(latestBar.t),
      close,
      open: this.toNumber(latestBar.o),
      high: this.toNumber(latestBar.h),
      low: this.toNumber(latestBar.l),
      volume: this.toNumber(latestBar.v),
      source: 'massive',
      updated_at: new Date().toISOString(),
    };
  }
}

export const massiveService = new MassiveService();
