import { priceDataService } from './priceDataService';
import { PriceRecord } from '../types/PriceData';

export class PriceService {
  async getLastClosePrice(stock: string): Promise<number | null> {
    try {
      const latest = await priceDataService.getLatestPrice(stock);
      return latest?.close ?? null;
    } catch (error) {
      console.error(`Error getting price for ${stock}:`, error);
      return null;
    }
  }

  async getCachedPrices(stocks: string[]): Promise<Map<string, number>> {
    const uniqueStocks = Array.from(new Set(stocks));
    const priceMap = new Map<string, number>();

    const allPrices = await priceDataService.loadAllPrices();
    const pricesBySymbol = new Map<string, PriceRecord[]>();

    for (const price of allPrices) {
      if (!pricesBySymbol.has(price.symbol)) {
        pricesBySymbol.set(price.symbol, []);
      }
      pricesBySymbol.get(price.symbol)!.push(price);
    }

    for (const stock of uniqueStocks) {
      const stockPrices = pricesBySymbol.get(stock) || [];
      const sorted = stockPrices.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      if (sorted[0]) {
        priceMap.set(stock, sorted[0].close);
      }
    }

    return priceMap;
  }

  async getBatchPrices(stocks: string[]): Promise<Map<string, number>> {
    return this.getCachedPrices(stocks);
  }
}

export const priceService = new PriceService();
