export interface Transaction {
  date: string;
  stock: string;
  type: string;
  quantity: string;
  price: string;
  fees: string;
  split_ratio: string;
  currency: string;
}

export interface TransactionStats {
  total: number;
  buys: number;
  sells: number;
  dividends: number;
  splits: number;
  usd: number;
  twd: number;
  jpy: number;
  hkd: number;
}
