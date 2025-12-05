import { StockDetailData, SplitRecord } from '../types/StockDetail';
import { priceDataService } from './priceDataService';
import { navDataService } from './navDataService';

export class StockDetailService {
  async loadStockData(symbol: string): Promise<StockDetailData> {
    try {
      const priceHistory = await priceDataService.getPricesForSymbol(symbol);
      const navHistory = await navDataService.getNavForSymbol(symbol);

      const splits: SplitRecord[] = [];

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
