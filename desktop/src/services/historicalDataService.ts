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

  async downloadHistoricalData(symbols: string[]): Promise<void> {
    // Start downloads in parallel with 100ms delay between each initiation
    // This balances speed with respecting Yahoo Finance API rate limits
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < symbols.length; i++) {
      // Wait 100ms before starting next download
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      // Start download without waiting for completion
      promises.push(this.downloadSingleTicker(symbols[i]));
    }
    
    // Wait for all downloads to complete
    await Promise.all(promises);
  }

  async downloadSingleTicker(ticker: string): Promise<void> {
    console.log(`[TS] Calling Rust download_symbol_history for: ${ticker}`);
    try {
      await invoke('download_symbol_history', { symbol: ticker });
      console.log(`[TS] ✓ Successfully downloaded: ${ticker}`);
    } catch (error) {
      console.error(`[TS] ✗ Failed to download ${ticker}:`, error);
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
