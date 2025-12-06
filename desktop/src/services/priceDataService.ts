import { invoke } from '@tauri-apps/api/tauri';
import { PriceRecord } from '../types/PriceData';
import { parseNumber, parseCSV } from '../utils/csvUtils';

interface PriceFileRow {
  date: string;
  close: string;
  open?: string;
  high?: string;
  low?: string;
  volume?: string;
  adjusted_close?: string;
  split_unadjusted_close?: string;
  source?: string;
  updated_at?: string;
}

const PRICE_FILE_HEADER = 'date,close,open,high,low,volume,adjusted_close,split_unadjusted_close,source,updated_at';

export class PriceDataService {
  private parsePriceFile(symbol: string, csvContent: string): PriceRecord[] {
    if (!csvContent || !csvContent.trim()) {
      return [];
    }

    const rows = parseCSV<PriceFileRow>(csvContent);
    const records: PriceRecord[] = [];

    for (const row of rows) {
      const parsedClose = parseNumber(row.close);

      if (!row.date || parsedClose === undefined) {
        continue;
      }

      records.push({
        symbol,
        date: row.date,
        close: parsedClose,
        open: parseNumber(row.open),
        high: parseNumber(row.high),
        low: parseNumber(row.low),
        volume: parseNumber(row.volume),
        adjusted_close: parseNumber(row.adjusted_close),
        split_unadjusted_close: parseNumber(row.split_unadjusted_close),
        source: (row.source as PriceRecord['source']) || 'yahoo_finance',
        updated_at: row.updated_at || new Date().toISOString(),
      });
    }

    return records;
  }

  private async readSymbolPrices(
    symbol: string,
    options?: { latestOnly?: boolean }
  ): Promise<PriceRecord[]> {
    const useLatest = options?.latestOnly !== false;
    if (useLatest) {
      try {
        const content = await invoke<string>('read_price_file_head', {
          symbol,
          lines: 8,
        });
        if (content && content.trim()) {
          return this.parsePriceFile(symbol, content);
        }
      } catch (error) {
        console.warn(`Failed to read price head for ${symbol}:`, error);
      }
    }

    try {
      const content = await invoke<string>('read_price_file', { symbol });
      return this.parsePriceFile(symbol, content);
    } catch (error) {
      console.error(`Failed to read price file for ${symbol}:`, error);
      return [];
    }
  }

  private buildFileContent(records: PriceRecord[]): string {
    const lines = [PRICE_FILE_HEADER];
    for (const record of records) {
      lines.push(
        [
          record.date,
          record.close,
          record.open ?? '',
          record.high ?? '',
          record.low ?? '',
          record.volume ?? '',
          record.adjusted_close ?? '',
          record.split_unadjusted_close ?? '',
          record.source,
          record.updated_at,
        ].join(',')
      );
    }
    return lines.join('\n') + '\n';
  }

  async loadAllPrices(options?: { latestOnly?: boolean }): Promise<PriceRecord[]> {
    const useLatest = options?.latestOnly !== false;

    try {
      let symbols: string[] = [];
      try {
        symbols = await invoke<string[]>('list_price_files');
      } catch (err) {
        console.error('Failed to list price files:', err);
        return [];
      }
      const allRecords: PriceRecord[] = [];

      for (const symbol of symbols) {
        const symbolRecords = await this.readSymbolPrices(symbol, { latestOnly: useLatest });
        allRecords.push(...symbolRecords);
      }

      return allRecords;
    } catch (error) {
      console.error('Failed to load prices:', error);
      return [];
    }
  }

  async getLatestPrice(symbol: string): Promise<PriceRecord | null> {
    const symbolPrices = await this.readSymbolPrices(symbol);
    if (symbolPrices.length === 0) {
      return null;
    }

    const sorted = symbolPrices.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0] || null;
  }

  async getPriceByDate(symbol: string, date: string): Promise<PriceRecord | null> {
    const prices = await this.readSymbolPrices(symbol);
    return prices.find(p => p.date === date) || null;
  }

  async getLatestPrices(symbols: string[]): Promise<Map<string, PriceRecord>> {
    const priceMap = new Map<string, PriceRecord>();
    for (const symbol of symbols) {
      const latest = await this.getLatestPrice(symbol);
      if (latest) {
        priceMap.set(symbol, latest);
      }
    }
    return priceMap;
  }

  async savePrices(newPrices: PriceRecord[]): Promise<void> {
    try {
      const grouped = new Map<string, PriceRecord[]>();

      for (const price of newPrices) {
        if (!grouped.has(price.symbol)) {
          grouped.set(price.symbol, []);
        }
        grouped.get(price.symbol)!.push(price);
      }

      for (const [symbol, prices] of grouped) {
        const existing = await this.readSymbolPrices(symbol, { latestOnly: false });
        const merged = new Map<string, PriceRecord>();

        for (const record of existing) {
          merged.set(record.date, record);
        }

        for (const record of prices) {
          merged.set(record.date, record);
        }

        const sorted = Array.from(merged.values()).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const content = this.buildFileContent(sorted);
        await invoke('write_price_file', { symbol, content });
      }
    } catch (error) {
      console.error('Failed to save prices:', error);
      throw error;
    }
  }

  async appendPrice(price: PriceRecord): Promise<void> {
    await this.savePrices([price]);
  }

  async getPricesForSymbol(symbol: string): Promise<PriceRecord[]> {
    const records = await this.readSymbolPrices(symbol, { latestOnly: false });
    return records.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }
}

export const priceDataService = new PriceDataService();
