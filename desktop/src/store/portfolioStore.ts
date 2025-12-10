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
import { useSettingsStore } from './settingsStore';

interface PortfolioState {
  positions: Position[];
  summary: PortfolioSummary | null;
  loading: boolean;
  lastUpdated: Date | null;
  fxRates: Map<string, number>;

  calculatePortfolio: () => void;
  loadPortfolio: () => Promise<void>;
  loadPositions: () => Promise<void>;
  loadFxRates: () => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  positions: [],
  summary: null,
  loading: false,
  lastUpdated: null,
  fxRates: new Map([['USD', 1]]),

  calculatePortfolio: () => {
    const transactions = useTransactionsStore.getState().transactions;
    const { fxRates } = get();
    const { baseCurrency } = useSettingsStore.getState();

    const calculatedPositions = calculatePositions(transactions);
    const calculatedSummary = calculatePortfolioSummary(calculatedPositions, fxRates, baseCurrency);

    set({
      positions: calculatedPositions,
      summary: calculatedSummary,
    });
  },

  loadPositions: async () => {
    const { calculatePortfolio, loadPortfolio } = get();
    calculatePortfolio();
    await loadPortfolio();
  },

  /**
   * Load portfolio data: calculate positions and load latest prices
   * Uses caching to avoid redundant disk reads
   */
  loadPortfolio: async () => {
    const { positions, fxRates } = get();
    if (positions.length === 0) return;

    set({ loading: true });
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

      // compute standard summary
      const updatedSummary = calculatePortfolioSummary(updatedPositions, fxRates, useSettingsStore.getState().baseCurrency);

      // compute daily gain/loss using daily prices and FX deltas
      try {
        const dailyPriceMap = await (await import('../services/priceDataService')).priceDataService.getDailyPrices();

        let totalDailyUSD = 0;
        const dailyByCurrency: PortfolioSummary['dailyGainLossByCurrency'] = {};

        updatedPositions.forEach(pos => {
          const pair = dailyPriceMap.get(pos.stock);
          if (!pair || !pair.latest) return;

          const latest = pair.latest.close;
          const previous = pair.previous?.close ?? undefined;
          if (previous === undefined) return;

          const dailyNative = (latest - previous) * pos.shares;

          // convert native delta to USD using fxRates map (fxRates stores inverted rate: currency -> 1/orig)
          const rate = fxRates.get(pos.currency) ?? (pos.currency === 'USD' ? 1 : undefined);
          const dailyUSD = rate ? dailyNative * rate : 0;

          totalDailyUSD += dailyUSD;

          if (!dailyByCurrency[pos.currency]) {
            dailyByCurrency[pos.currency] = { amountNative: 0, amountBase: 0 };
          }
          dailyByCurrency[pos.currency].amountNative += dailyNative;
          // convert to base currency if needed
          const baseCurrency = useSettingsStore.getState().baseCurrency;
          const baseRate = fxRates.get(baseCurrency) ?? (baseCurrency === 'USD' ? 1 : undefined);
          dailyByCurrency[pos.currency].amountBase += baseRate ? dailyUSD / baseRate : dailyUSD;
        });

        // attach daily values to summary
        updatedSummary.dailyGainLoss = totalDailyUSD;
        updatedSummary.dailyGainLossByCurrency = dailyByCurrency;
      } catch (err) {
        console.warn('Failed to compute daily gain/loss:', err);
      }

      set({
        positions: updatedPositions,
        summary: updatedSummary,
        lastUpdated: new Date(),
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load portfolio:', error);
      set({ loading: false });
    }
  },

  loadFxRates: async () => {
    try {
      console.log('loadFxRates: Starting to load FX rates...');
      const dailyRates = await fxRateDataService.getDailyFxRates();
      console.log('loadFxRates: Received dailyRates:', dailyRates);

      const rateMap = new Map<string, number>([['USD', 1]]);

      for (const [pair, rateData] of dailyRates) {
        console.log(`loadFxRates: Processing pair ${pair}:`, rateData);
        // Extract from_currency and to_currency from pair (format: "USD/TWD")
        const [fromCurrency, toCurrency] = pair.split('/');
        if (fromCurrency === 'USD' && toCurrency && rateData.latest && rateData.latest.rate !== 0) {
          // Store inverted rate: if USD/TWD = 30, then TWD to USD rate = 1/30
          const invertedRate = 1 / rateData.latest.rate;
          rateMap.set(toCurrency, invertedRate);
          console.log(`loadFxRates: Set ${toCurrency} = ${invertedRate} (from USD/${toCurrency} = ${rateData.latest.rate})`);
        }
      }

      console.log('loadFxRates: Final FX rates map:', Object.fromEntries(rateMap));
      set({ fxRates: rateMap });
    } catch (error) {
      console.error('loadFxRates: Failed to load FX rates:', error);
    }
  },
}));
