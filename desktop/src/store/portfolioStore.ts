import { create } from 'zustand';
import { Position, PortfolioSummary } from '../types/Portfolio';
import {
  calculatePositions,
  calculatePortfolioSummary,
  updatePositionWithPrice,
} from '../utils/portfolioCalculations';
import { priceService } from '../services/priceService';
import { fxRateDataService } from '../services/fxRateDataService';
import { useTransactionsStore } from './transactionsStore';

interface PortfolioState {
  positions: Position[];
  summary: PortfolioSummary | null;
  loadingPrices: boolean;
  lastUpdated: Date | null;
  fxRates: Map<string, number>;

  calculatePortfolio: () => void;
  loadCachedPrices: () => Promise<void>;
  refreshPrices: () => Promise<void>;
  loadFxRates: () => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  positions: [],
  summary: null,
  loadingPrices: false,
  lastUpdated: null,
  fxRates: new Map([['USD', 1]]),

  calculatePortfolio: () => {
    const transactions = useTransactionsStore.getState().transactions;
    const { fxRates } = get();

    const calculatedPositions = calculatePositions(transactions);
    const calculatedSummary = calculatePortfolioSummary(calculatedPositions, fxRates);

    set({
      positions: calculatedPositions,
      summary: calculatedSummary,
    });
  },

  loadCachedPrices: async () => {
    const { positions, fxRates } = get();
    if (positions.length === 0) return;

    try {
      const stocks = positions.map(p => p.stock);
      const priceMap = await priceService.getCachedPrices(stocks);

      const updatedPositions = positions.map(position => {
        const price = priceMap.get(position.stock);
        if (price !== undefined) {
          return updatePositionWithPrice(position, price);
        }
        return position;
      });

      const updatedSummary = calculatePortfolioSummary(updatedPositions, fxRates);

      set({
        positions: updatedPositions,
        summary: updatedSummary,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error('Failed to load cached prices:', error);
    }
  },

  refreshPrices: async () => {
    const { positions, fxRates } = get();
    if (positions.length === 0) return;

    set({ loadingPrices: true });
    try {
      const stocks = positions.map(p => p.stock);
      const priceMap = await priceService.getBatchPrices(stocks);

      const updatedPositions = positions.map(position => {
        const price = priceMap.get(position.stock);
        if (price !== undefined) {
          return updatePositionWithPrice(position, price);
        }
        return position;
      });

      const updatedSummary = calculatePortfolioSummary(updatedPositions, fxRates);

      set({
        positions: updatedPositions,
        summary: updatedSummary,
        lastUpdated: new Date(),
        loadingPrices: false,
      });
    } catch (error) {
      console.error('Failed to refresh prices:', error);
      set({ loadingPrices: false });
    }
  },

  loadFxRates: async () => {
    try {
      const rates = await fxRateDataService.loadAllRates();
      const rateMap = new Map<string, number>([['USD', 1]]);

      for (const rate of rates) {
        if (rate.to_currency === 'USD') {
          rateMap.set(rate.from_currency, rate.rate);
        }
      }

      set({ fxRates: rateMap });
    } catch (error) {
      console.error('Failed to load FX rates:', error);
    }
  },
}));
