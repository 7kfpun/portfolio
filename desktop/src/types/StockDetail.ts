import { Position } from './Portfolio';
import { Transaction } from './Transaction';
import { PriceRecord } from './PriceData';
import { NavRecord } from './NavData';

export interface StockDetailData {
  symbol: string;
  currency: string;
  position: Position;
  transactions: Transaction[];
  priceHistory: PriceRecord[];
  splits: SplitRecord[];
  navHistory: NavRecord[];
}

export interface SplitRecord {
  date: string;
  ratio: number;
}

export interface ChartDataPoint {
  date: string;
  close: number;
  value?: number;
  costBasis?: number;
  volume?: number | null;
  shares?: number;
}

export interface TransactionEvent {
  date: string;
  type: 'buy' | 'sell' | 'dividend' | 'split';
  quantity: number;
  price: number;
  amount: number;
  sharesAfter: number;
}

export interface DividendSummary {
  totalDividends: number;
  dividendCount: number;
  averageDividend: number;
  lastDividendDate: string | null;
  annualYield: number | null;
  perYearTotals: DividendPeriodSummary[];
  perQuarterTotals: DividendPeriodSummary[];
}

export interface DividendPeriodSummary {
  period: string;
  total: number;
  count: number;
}

export interface StockMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  holdingPeriodDays: number;
  firstPurchaseDate: string;
  lastTransactionDate: string;
  highestPrice: number;
  lowestPrice: number;
  priceVolatility: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  daysSincePositive: number | null;
  bestDayGain: number;
  worstDayLoss: number;
}
