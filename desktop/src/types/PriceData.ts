export interface PriceRecord {
  symbol: string;
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  source: 'manual' | 'yahoo_finance' | 'twelve_data';
  updated_at: string;
}

export interface FxRateRecord {
  from_currency: string;
  to_currency: string;
  date: string;
  rate: number;
  source: 'twelve_data' | 'manual';
  updated_at: string;
}

export interface SecurityRecord {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  type: 'stock' | 'etf' | 'fund';
  updated_at: string;
}

export interface SplitRecord {
  symbol: string;
  date: string;
  ratio: number;
  updated_at: string;
}
