export interface FxRateRecord {
  from_currency: string;
  to_currency: string;
  date: string;
  rate: number;
  source: 'yahoo_finance' | 'manual';
  updated_at: string;
}
