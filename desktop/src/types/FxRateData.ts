export interface FxRateRecord {
  from_currency: string;
  to_currency: string;
  date: string;
  rate: number;
  source: 'twelve_data' | 'manual';
  updated_at: string;
}
