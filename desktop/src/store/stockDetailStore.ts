import { create } from 'zustand';
import { StockDetailData, ChartDataPoint, TransactionEvent, DividendSummary, StockMetrics } from '../types/StockDetail';
import { stockDetailService } from '../services/stockDetailService';
import { yahooMetaService } from '../services/yahooMetaService';
import { YahooMeta } from '../types/YahooMeta';
import { usePortfolioStore } from './portfolioStore';
import { useTransactionsStore } from './transactionsStore';
import {
  buildChartData,
  calculateStockMetrics,
  calculateDividendSummary,
  extractTransactionEvents,
} from '../utils/stockDetailCalculations';

export type ChartTimeRange = '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '5Y' | 'ALL' | 'MTD';

interface StockDetailState {
  selectedSymbol: string | null;
  stockData: StockDetailData | null;
  chartData: ChartDataPoint[];
  navChartData: ChartDataPoint[];
  transactionEvents: TransactionEvent[];
  dividendSummary: DividendSummary | null;
  metrics: StockMetrics | null;
  yahooMeta: YahooMeta | null; // Added
  loading: boolean;
  error: string | null;
  chartTimeRange: ChartTimeRange;

  loadStockDetail: (symbol: string) => Promise<void>;
  setChartTimeRange: (range: ChartTimeRange) => void;
  clearStockDetail: () => void;
}

export const useStockDetailStore = create<StockDetailState>((set, get) => ({
  selectedSymbol: null,
  stockData: null,
  chartData: [],
  navChartData: [],
  transactionEvents: [],
  dividendSummary: null,
  metrics: null,
  yahooMeta: null, // Initial value
  loading: false,
  error: null,
  chartTimeRange: '1Y',

  loadStockDetail: async (symbol: string) => {
    set({ loading: true, error: null, selectedSymbol: symbol });

    try {
      const portfolioState = usePortfolioStore.getState();
      const transactionsState = useTransactionsStore.getState();

      const position = portfolioState.positions.find(p => p.stock === symbol);
      if (!position) {
        throw new Error(`Position not found for ${symbol}`);
      }

      const stockTransactions = transactionsState.transactions.filter(t => t.stock === symbol);

      // Parallel fetch for stock data and meta
      const [stockData, yahooMeta] = await Promise.all([
        stockDetailService.loadStockData(symbol),
        yahooMetaService.getMeta(symbol)
      ]);

      stockData.position = position;
      stockData.transactions = stockTransactions;
      stockData.currency = position.currency;

      console.log('[StockDetailStore] Price history loaded:', {
        symbol,
        priceCount: stockData.priceHistory.length,
        firstPrice: stockData.priceHistory[0],
        lastPrice: stockData.priceHistory[stockData.priceHistory.length - 1],
        transactionCount: stockTransactions.length,
        splitsCount: stockData.splits.length,
        splits: stockData.splits,
      });

      const chartData = buildChartData(stockData.priceHistory, stockData.transactions, stockData.splits);

      console.log('[StockDetailStore] Chart data built:', {
        chartDataCount: chartData.length,
        firstPoint: chartData[0],
        lastPoint: chartData[chartData.length - 1]
      });

      const navChartData: ChartDataPoint[] = stockData.navHistory.map(nav => ({
        date: nav.date,
        close: nav.position_value,
        shares: nav.shares,
      }));

      console.log('[StockDetailStore] NAV data loaded:', {
        navCount: stockData.navHistory.length,
        firstNav: stockData.navHistory[0],
        lastNav: stockData.navHistory[stockData.navHistory.length - 1]
      });

      const transactionEvents = extractTransactionEvents(stockData.transactions);

      const metrics = calculateStockMetrics(position, stockData.priceHistory, stockData.transactions);

      const positionValue =
        position.currentValue ?? (position.currentPrice ?? 0) * position.shares;

      const dividendSummary = calculateDividendSummary(
        stockData.transactions,
        positionValue
      );

      set({
        stockData,
        chartData,
        navChartData,
        transactionEvents,
        metrics,
        dividendSummary,
        yahooMeta, // Set meta
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load stock detail',
        loading: false,
      });
    }
  },

  setChartTimeRange: (range: ChartTimeRange) => {
    set({ chartTimeRange: range });
  },

  clearStockDetail: () => {
    set({
      selectedSymbol: null,
      stockData: null,
      chartData: [],
      navChartData: [],
      transactionEvents: [],
      dividendSummary: null,
      metrics: null,
      error: null,
      chartTimeRange: '1Y',
    });
  },
}));
