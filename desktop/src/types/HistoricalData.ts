export interface StockDataCoverage {
  ticker: string;
  exchange: string;
  currency: string;
  earliestTransaction: string;
  earliestPrice: string | null;
  latestPrice: string | null;
  totalDays: number;
  missingDays: number;
  coveragePercent: number;
  splitCount: number;
  lastSplit: string | null;
  status: 'complete' | 'partial' | 'missing' | 'delisted';
  delistReason?: string;
}

export interface SplitHistory {
  ticker: string;
  date: string;
  ratio: string;
  numerator: number;
  denominator: number;
  ratioFactor: number;
  beforePrice: number | null;
  afterPrice: number | null;
}

export interface DataReadinessStats {
  totalStocks: number;
  completeData: number;
  partialData: number;
  missingData: number;
  totalPriceRecords: number;
  oldestDate: string | null;
  newestDate: string | null;
}
