import { StockDetailData, SplitRecord } from '../types/StockDetail';
import { priceDataService } from './priceDataService';
import { navDataService } from './navDataService';
import { splitDataService } from './splitDataService';

export class StockDetailService {
  async loadStockData(symbol: string): Promise<StockDetailData> {
    try {
      const [priceHistory, navHistory, splits] = await Promise.all([
        priceDataService.getPricesForSymbol(symbol),
        navDataService.getNavForSymbol(symbol),
        splitDataService.getSplitsForSymbol(symbol),
      ]);

      return {
        symbol,
        currency: '',
        position: {
          stock: symbol,
          currency: '',
          shares: 0,
          averageCost: 0,
          totalCost: 0,
        },
        transactions: [],
        priceHistory,
        splits,
        navHistory,
      };
    } catch (error) {
      console.error(`Failed to load stock data for ${symbol}:`, error);
      throw error;
    }
  }
}

export const stockDetailService = new StockDetailService();
