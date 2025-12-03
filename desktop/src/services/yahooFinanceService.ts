import { PriceRecord } from '../types/PriceData';
import { RateLimiter } from '../utils/rateLimiter';

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string;
        symbol?: string;
        exchangeName?: string;
        regularMarketTime?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
}

export class YahooFinanceService {
  private readonly rateLimiter = new RateLimiter(30);

  private toNumber(value?: number | null): number | undefined {
    if (value === undefined || value === null) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private async fetchChart(symbol: string): Promise<YahooChartResponse | null> {
    const url = new URL('https://query1.finance.yahoo.com/v8/finance/chart/' + symbol);
    url.searchParams.set('range', '5d');
    url.searchParams.set('interval', '1d');

    try {
      const body = await this.rateLimiter.schedule(() =>
        invoke<string>('proxy_get', { url: url.toString() })
      );
      const data: YahooChartResponse = JSON.parse(body);
      return data;
    } catch (error) {
      console.error(`Error fetching Yahoo Finance chart for ${symbol}:`, error);
      return null;
    }
  }

  async getLatestDaily(symbol: string, canonicalSymbol: string): Promise<PriceRecord | null> {
    const data = await this.fetchChart(symbol);
    const result = data?.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    const timestamps = result?.timestamp || [];

    if (!quote || timestamps.length === 0) {
      return null;
    }

    const lastIndex = timestamps.length - 1;
    const close = this.toNumber(quote.close?.[lastIndex]);
    if (close === undefined) {
      return null;
    }

    const toDate = (ts: number) => new Date(ts * 1000).toISOString().slice(0, 10);
    const date = toDate(timestamps[lastIndex]);

    return {
      symbol: canonicalSymbol,
      date,
      close,
      open: this.toNumber(quote.open?.[lastIndex]),
      high: this.toNumber(quote.high?.[lastIndex]),
      low: this.toNumber(quote.low?.[lastIndex]),
      volume: this.toNumber(quote.volume?.[lastIndex]),
      source: 'yahoo_finance',
      updated_at: new Date().toISOString(),
    };
  }
}

export const yahooFinanceService = new YahooFinanceService();
import { invoke } from '@tauri-apps/api/tauri';
