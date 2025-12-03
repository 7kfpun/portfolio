import { invoke } from '@tauri-apps/api/tauri';
import { PriceRecord } from '../types/PriceData';
import { parseNumber, parseCSV, toCSV } from '../utils/csvUtils';

const PRICES_CSV = 'prices.csv';

interface PriceCSVRow {
  symbol: string;
  date: string;
  close: string;
  open?: string;
  high?: string;
  low?: string;
  volume?: string;
  source?: string;
  updated_at?: string;
}

export class PriceDataService {
  private parsePriceCSV(csvContent: string): PriceRecord[] {
    const rows = parseCSV<PriceCSVRow>(csvContent);
    const records: PriceRecord[] = [];

    for (const row of rows) {
      const parsedClose = parseNumber(row.close);

      if (!row.symbol || !row.date || parsedClose === undefined) {
        continue;
      }

      records.push({
        symbol: row.symbol,
        date: row.date,
        close: parsedClose,
        open: parseNumber(row.open),
        high: parseNumber(row.high),
        low: parseNumber(row.low),
        volume: parseNumber(row.volume),
        source: (row.source as PriceRecord['source']) || 'twelve_data',
        updated_at: row.updated_at || new Date().toISOString(),
      });
    }

    return records;
  }

  private toPriceCSV(records: PriceRecord[]): string {
    return toCSV(records, [
      'symbol',
      'date',
      'close',
      'open',
      'high',
      'low',
      'volume',
      'source',
      'updated_at',
    ]);
  }

  async loadAllPrices(): Promise<PriceRecord[]> {
    try {
      const content = await invoke<string>('read_data_csv', { filename: PRICES_CSV });
      return this.parsePriceCSV(content);
    } catch (error) {
      console.error('Failed to load prices:', error);
      return [];
    }
  }

  async getLatestPrice(symbol: string): Promise<PriceRecord | null> {
    const prices = await this.loadAllPrices();
    const symbolPrices = prices
      .filter(p => p.symbol === symbol)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return symbolPrices[0] || null;
  }

  async getPriceByDate(symbol: string, date: string): Promise<PriceRecord | null> {
    const prices = await this.loadAllPrices();
    return prices.find(p => p.symbol === symbol && p.date === date) || null;
  }

  async getLatestPrices(symbols: string[]): Promise<Map<string, PriceRecord>> {
    const prices = await this.loadAllPrices();
    const priceMap = new Map<string, PriceRecord>();

    for (const symbol of symbols) {
      const symbolPrices = prices
        .filter(p => p.symbol === symbol)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (symbolPrices[0]) {
        priceMap.set(symbol, symbolPrices[0]);
      }
    }

    return priceMap;
  }

  async savePrices(newPrices: PriceRecord[]): Promise<void> {
    try {
      const existing = await this.loadAllPrices();
      const priceMap = new Map<string, PriceRecord>();

      for (const price of existing) {
        const key = `${price.symbol}_${price.date}`;
        priceMap.set(key, price);
      }

      for (const price of newPrices) {
        const key = `${price.symbol}_${price.date}`;
        priceMap.set(key, price);
      }

      const allPrices = Array.from(priceMap.values()).sort((a, b) => {
        const symbolCompare = a.symbol.localeCompare(b.symbol);
        if (symbolCompare !== 0) return symbolCompare;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      const csvContent = this.toPriceCSV(allPrices);
      await invoke('write_data_csv', { filename: PRICES_CSV, content: csvContent });
    } catch (error) {
      console.error('Failed to save prices:', error);
      throw error;
    }
  }

  async appendPrice(price: PriceRecord): Promise<void> {
    try {
      const csvRow = [
        price.symbol,
        price.date,
        price.close,
        price.open || '',
        price.high || '',
        price.low || '',
        price.volume || '',
        price.source,
        price.updated_at,
      ].join(',') + '\n';

      const existing = await invoke<string>('read_data_csv', { filename: PRICES_CSV });
      if (!existing.trim()) {
        const header = 'symbol,date,close,open,high,low,volume,source,updated_at\n';
        await invoke('write_data_csv', { filename: PRICES_CSV, content: header + csvRow });
      } else {
        await invoke('append_data_csv', { filename: PRICES_CSV, content: csvRow });
      }
    } catch (error) {
      console.error('Failed to append price:', error);
      throw error;
    }
  }
}

export const priceDataService = new PriceDataService();
