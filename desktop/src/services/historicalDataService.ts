import { invoke } from '@tauri-apps/api/tauri';
import { StockDataCoverage, SplitHistory, DataReadinessStats } from '../types/HistoricalData';

interface RustStockDataCoverage {
  ticker: string;
  exchange: string;
  currency: string;
  earliest_transaction: string;
  earliest_price: string | null;
  latest_price: string | null;
  total_days: number;
  missing_days: number;
  coverage_percent: number;
  split_count: number;
  last_split: string | null;
  status: string;
  delist_reason?: string;
}

interface RustSplitHistory {
  ticker: string;
  date: string;
  ratio: string;
  numerator: number;
  denominator: number;
  ratio_factor: number;
  before_price: number | null;
  after_price: number | null;
}

interface RustDataReadinessStats {
  total_stocks: number;
  complete_data: number;
  partial_data: number;
  missing_data: number;
  total_price_records: number;
  oldest_date: string | null;
  newest_date: string | null;
}

export class HistoricalDataService {
  private convertCoverage(rust: RustStockDataCoverage): StockDataCoverage {
    return {
      ticker: rust.ticker,
      exchange: rust.exchange,
      currency: rust.currency,
      earliestTransaction: rust.earliest_transaction,
      earliestPrice: rust.earliest_price,
      latestPrice: rust.latest_price,
      totalDays: rust.total_days,
      missingDays: rust.missing_days,
      coveragePercent: rust.coverage_percent,
      splitCount: rust.split_count,
      lastSplit: rust.last_split,
      status: rust.status as 'complete' | 'partial' | 'missing' | 'delisted',
      delistReason: rust.delist_reason,
    };
  }

  private convertSplit(rust: RustSplitHistory): SplitHistory {
    return {
      ticker: rust.ticker,
      date: rust.date,
      ratio: rust.ratio,
      numerator: rust.numerator,
      denominator: rust.denominator,
      ratioFactor: rust.ratio_factor,
      beforePrice: rust.before_price,
      afterPrice: rust.after_price,
    };
  }

  private convertStats(rust: RustDataReadinessStats): DataReadinessStats {
    return {
      totalStocks: rust.total_stocks,
      completeData: rust.complete_data,
      partialData: rust.partial_data,
      missingData: rust.missing_data,
      totalPriceRecords: rust.total_price_records,
      oldestDate: rust.oldest_date,
      newestDate: rust.newest_date,
    };
  }

  async getDataCoverage(includeCompleteness = false): Promise<StockDataCoverage[]> {
    try {
      const result = await invoke<string>('get_data_coverage', {
        includeCompleteness,
      });
      const rustData: RustStockDataCoverage[] = JSON.parse(result);
      return rustData.map(item => this.convertCoverage(item));
    } catch (error) {
      console.error('Failed to get data coverage:', error);
      return [];
    }
  }

  async getSplitHistory(): Promise<SplitHistory[]> {
    try {
      const result = await invoke<string>('get_split_history');
      const rustData: RustSplitHistory[] = JSON.parse(result);
      return rustData.map(item => this.convertSplit(item));
    } catch (error) {
      console.error('Failed to get split history:', error);
      return [];
    }
  }

  async getDataStats(): Promise<DataReadinessStats> {
    try {
      const result = await invoke<string>('get_data_stats');
      const rustData: RustDataReadinessStats = JSON.parse(result);
      return this.convertStats(rustData);
    } catch (error) {
      console.error('Failed to get data stats:', error);
      return {
        totalStocks: 0,
        completeData: 0,
        partialData: 0,
        missingData: 0,
        totalPriceRecords: 0,
        oldestDate: null,
        newestDate: null,
      };
    }
  }

  private convertTickerToYahooSymbol(ticker: string): string {
    const [ex, symbol] = ticker.includes(':')
      ? ticker.split(':')
      : ['', ticker];

    switch (ex?.toUpperCase()) {
      case 'HKEX':
        return `${symbol}.HK`;
      case 'TWSE':
      case 'TPE':
        return `${symbol}.TW`;
      case 'JPX':
      case 'TYO':
        return `${symbol}.T`;
      case 'NYSE':
      case 'NASDAQ':
      case 'NYSEARCA':
      case 'NYSEAMERICAN':
      case 'OTCMKTS':
        return symbol;
      default:
        return ticker;
    }
  }

  async downloadHistoricalData(symbols: string[]): Promise<void> {
    for (const ticker of symbols) {
      await this.downloadSingleTicker(ticker);
    }
  }

  async downloadSingleTicker(ticker: string): Promise<void> {
    const today = new Date();
    const fifteenYearsAgo = new Date();
    fifteenYearsAgo.setFullYear(today.getFullYear() - 15);

    const yahooSymbol = this.convertTickerToYahooSymbol(ticker);
    const period1 = Math.floor(fifteenYearsAgo.getTime() / 1000);
    const period2 = Math.floor(today.getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${period1}&period2=${period2}&interval=1d&events=div,splits&includeAdjustedClose=false`;

    try {
      const response = await invoke<string>('proxy_get', { url });
      const data = JSON.parse(response);

      if (data.chart?.error) {
        throw new Error(
          `Yahoo Finance error: ${data.chart.error.description || 'Unknown error'}`
        );
      }

      const result = data.chart?.result?.[0];
      if (!result) {
        throw new Error('No data returned from Yahoo Finance');
      }

      const timestamps = result.timestamp || [];
      const quote = result.indicators?.quote?.[0];

      if (!quote) {
        throw new Error('No quote data in response');
      }

      const closes = quote.close || [];
      const opens = quote.open || [];
      const highs = quote.high || [];
      const lows = quote.low || [];
      const volumes = quote.volume || [];

      const header = 'date,close,open,high,low,volume,source,updated_at';
      const rows: Array<{ timestamp: number; line: string }> = [];

      for (let i = 0; i < timestamps.length; i++) {
        const date = new Date(timestamps[i] * 1000);
        const close = closes[i];

        if (close !== null && close !== undefined) {
          const dateStr = date.toISOString().split('T')[0];
          const open = opens[i] !== null ? opens[i] : '';
          const high = highs[i] !== null ? highs[i] : '';
          const low = lows[i] !== null ? lows[i] : '';
          const volume = volumes[i] !== null ? volumes[i] : '';
          const updatedAt = new Date().toISOString();

          rows.push({
            timestamp: date.getTime(),
            line: `${dateStr},${close},${open},${high},${low},${volume},yahoo_finance,${updatedAt}`,
          });
        }
      }

      // Write newest -> oldest so we can read the top rows quickly
      rows.sort((a, b) => b.timestamp - a.timestamp);
      const csvLines = [header, ...rows.map(row => row.line)];

      await this.writeSymbolFile(ticker, csvLines.join('\n') + '\n');

      // Extract and save split data
      const splits = result.events?.splits;
      if (splits && Object.keys(splits).length > 0) {
        await this.writeSplitFile(ticker, splits);
      }
    } catch (error) {
      console.error(`Failed to download data for ${ticker}:`, error);
      throw error;
    }
  }

  private async writeSplitFile(ticker: string, splits: any): Promise<void> {
    try {
      const splitLines: string[] = ['date,numerator,denominator,before_price,after_price'];

      // Yahoo Finance returns splits as an object with timestamps as keys
      const sortedSplits = Object.entries(splits).sort((a: any, b: any) => {
        return a[1].date - b[1].date;
      });

      for (const [, splitData] of sortedSplits) {
        const split: any = splitData;
        const date = new Date(split.date * 1000).toISOString().split('T')[0];
        const numerator = Number(split.numerator) || 1;
        const denominator = Number(split.denominator) || 1;
        splitLines.push(`${date},${numerator},${denominator},,`);
      }

      const normalizedTicker = ticker.includes(':')
        ? ticker.split(':').map((part, idx) => idx === 0 ? part.toUpperCase() : part).join(':')
        : ticker;

      await invoke('write_split_file', { symbol: normalizedTicker, content: splitLines.join('\n') + '\n' });
    } catch (error) {
      console.error(`Failed to write split file for ${ticker}:`, error);
      // Don't throw - splits are optional
    }
  }

  private async writeSymbolFile(ticker: string, content: string): Promise<void> {
    try {
      const normalizedTicker = ticker.includes(':')
        ? ticker.split(':').map((part, idx) => idx === 0 ? part.toUpperCase() : part).join(':')
        : ticker;
      await invoke('write_price_file', { symbol: normalizedTicker, content });
    } catch (error) {
      console.error(`Failed to write price file for ${ticker}:`, error);
      throw error;
    }
  }

  async redownloadAll(): Promise<void> {
    const coverage = await this.getDataCoverage();
    const tickers = coverage.map(c => c.ticker);
    await this.downloadHistoricalData(tickers);
  }
}

export const historicalDataService = new HistoricalDataService();
