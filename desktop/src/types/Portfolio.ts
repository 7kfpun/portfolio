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
}

export interface PortfolioSummary {
  positions: Position[];
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  byCurrency: {
    [currency: string]: {
      value: number;
      cost: number;
      gainLoss: number;
      positions: number;
    };
  };
}
