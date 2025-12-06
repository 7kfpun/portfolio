
export interface YahooMeta {
  currency: string;
  symbol: string;
  exchangeName: string;
  instrumentType: string;
  firstTradeDate: number;
  regularMarketTime: number;
  gmtoffset: number;
  timezone: string;
  exchangeTimezoneName: string;
  regularMarketPrice: number;
  chartPreviousClose: number;
  previousClose: number;
  scale: number;
  priceHint: number;
  currentTradingPeriod: {
    pre: TradingPeriod;
    regular: TradingPeriod;
    post: TradingPeriod;
  };
  tradingPeriods: TradingPeriod[][];
  dataGranularity: string;
  range: string;
  validRanges: string[];
  
  // Important fields to display
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  longName?: string;
  shortName?: string;
  marketCap?: number; // Sometimes available
}

export interface TradingPeriod {
  timezone: string;
  start: number;
  end: number;
  gmtoffset: number;
}
