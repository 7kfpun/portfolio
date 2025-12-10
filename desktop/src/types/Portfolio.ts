export interface Position {
  stock: string;
  currency: string;
  shares: number;
  averageCost: number;
  totalCost: number;
  currentPrice?: number;
  currentValue?: number;
  gainLoss?: number;
  gainLossPercent?: number;
  lastUpdated?: string;
  baseValue?: number;
}

export interface PortfolioSummary {
  positions: Position[];
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dailyGainLoss?: number;
  dailyGainLossByCurrency?: { [currency: string]: { amountNative: number; amountBase: number } };
  byCurrency: {
    [currency: string]: {
      value: number;
      cost: number;
      gainLoss: number;
      dailyGainLoss?: number;
      positions: number;
    };
  };
}
