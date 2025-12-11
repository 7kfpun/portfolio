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
  source?: string;
  updated_at?: string;
}

const PRICE_FILE_HEADER = 'date,close,open,high,low,volume,source,updated_at';

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
        source: (row.source as PriceRecord['source']) || 'yahoo_finance',
        updated_at: row.updated_at || new Date().toISOString(),
      });
    }

    return records;
  }

  private async readSymbolPrices(
    symbol: string,
    options?: { latestOnly?: boolean; includeOverrides?: boolean }
  ): Promise<PriceRecord[]> {
    const latestOnly = options?.latestOnly !== false;
    const includeOverrides = options?.includeOverrides !== false;

    try {
      return await invoke<PriceRecord[]>('read_prices_polars', {
        symbol,
        latestOnly,
        includeOverrides,
        limit: latestOnly ? 8 : undefined,
      });
    } catch (error) {
      console.error(`Failed to read prices for ${symbol}:`, error);
      return [];
    }
  } private buildFileContent(records: PriceRecord[]): string {
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
  } async getLatestPrice(symbol: string): Promise<PriceRecord | null> {
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

  async getDailyPrices(): Promise<Map<string, { latest: PriceRecord; previous?: PriceRecord }>> {
    interface DailyPriceData {
      symbol: string;
      latest_close: number;
      latest_date: string;
      previous_close?: number;
      previous_date?: string;
    }

    try {
      const dailyPrices = await invoke<DailyPriceData[]>('get_all_daily_prices');
      const result = new Map<string, { latest: PriceRecord; previous?: PriceRecord }>();

      for (const data of dailyPrices) {
        const latest: PriceRecord = {
          symbol: data.symbol,
          date: data.latest_date,
          close: data.latest_close,
          source: 'yahoo_finance',
          updated_at: new Date().toISOString(),
        };

        let previous: PriceRecord | undefined;
        if (data.previous_close !== undefined && data.previous_date) {
          previous = {
            symbol: data.symbol,
            date: data.previous_date,
            close: data.previous_close,
            source: 'yahoo_finance',
            updated_at: new Date().toISOString(),
          };
        }

        result.set(data.symbol, { latest, previous });
      }

      return result;
    } catch (error) {
      console.error('Failed to get daily prices:', error);
      return new Map();
    }
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

  async getDailyFxRates(): Promise<Map<string, { latest: number; previous?: number }>> {
    interface DailyFxRateData {
      pair: string;
      latest_rate: number;
      latest_date: string;
      previous_rate?: number;
      previous_date?: string;
    }

    try {
      const dailyRates = await invoke<DailyFxRateData[]>('get_all_daily_fx_rates');
      const result = new Map<string, { latest: number; previous?: number }>();

      for (const data of dailyRates) {
        result.set(data.pair, {
          latest: data.latest_rate,
          previous: data.previous_rate,
        });
      }

      return result;
    } catch (error) {
      console.error('Failed to get daily FX rates:', error);
      return new Map();
    }
  }

  async saveOverridePricesForSymbol(
    symbol: string,
    overridePrices: PriceRecord[]
  ): Promise<void> {
    // Read existing overrides
    const existingContent = await invoke<string>('read_price_override_file', { symbol }).catch(() => '');
    const existingRecords = this.parsePriceFile(symbol, existingContent);

    // Create a map of existing records by date
    const recordMap = new Map<string, PriceRecord>();
    for (const record of existingRecords) {
      recordMap.set(record.date, record);
    }

    // Add/update with new records
    const sanitized = overridePrices
      .filter(record => record.date && !Number.isNaN(record.close))
      .map(record => ({
        ...record,
        symbol,
        source: 'manual' as const,
        updated_at: new Date().toISOString(),
      }));

    for (const record of sanitized) {
      recordMap.set(record.date, record);
    }

    const allRecords = Array.from(recordMap.values());

    if (!allRecords.length) {
      try {
        await invoke('write_price_override_file', {
          symbol,
          content: PRICE_FILE_HEADER + '\n',
        });
      } catch (error) {
        console.warn('Failed to clear price override file', error);
      }
      return;
    }

    const csvLines = [PRICE_FILE_HEADER];
    for (const price of allRecords) {
      csvLines.push(
        `${price.date},${price.close},${price.open ?? ''},${price.high ?? ''},${price.low ?? ''},${price.volume ?? ''},${price.source},${price.updated_at}`
      );
    }

    await invoke('write_price_override_file', {
      symbol,
      content: csvLines.join('\n') + '\n',
    });
  }

  async removeOverridePrice(symbol: string, date: string): Promise<void> {
    try {
      const content = await invoke<string>('read_price_override_file', { symbol });
      const existingRecords = this.parsePriceFile(symbol, content);
      const filteredRecords = existingRecords.filter(record => record.date !== date);

      if (filteredRecords.length === 0) {
        try {
          await invoke('write_price_override_file', {
            symbol,
            content: PRICE_FILE_HEADER + '\n',
          });
        } catch (error) {
          console.warn('Failed to clear price override file', error);
        }
        return;
      }

      const csvLines = [PRICE_FILE_HEADER];
      for (const price of filteredRecords) {
        csvLines.push(
          `${price.date},${price.close},${price.open ?? ''},${price.high ?? ''},${price.low ?? ''},${price.volume ?? ''},${price.source},${price.updated_at}`
        );
      }

      await invoke('write_price_override_file', {
        symbol,
        content: csvLines.join('\n') + '\n',
      });
    } catch (error) {
      console.error('Failed to remove price override:', error);
      throw error;
    }
  }
}

export const priceDataService = new PriceDataService();
