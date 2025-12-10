import { invoke } from '@tauri-apps/api/tauri';
import { FxRateRecord } from '../types/FxRateData';
import { parseNumber } from '../utils/csvUtils';

export class FxRateDataService {
  private parseFxRateCSV(csvContent: string): FxRateRecord[] {
    if (!csvContent || !csvContent.trim()) {
      return [];
    }

    const lines = csvContent.trim().split('\n');
    const records: FxRateRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const fields = line.split(',');
      if (fields.length >= 4) {
        const parsedRate = parseNumber(fields[3]);
        if (parsedRate === undefined) continue;

        records.push({
          from_currency: fields[0],
          to_currency: fields[1],
          date: fields[2],
          rate: parsedRate,
          source: (fields[4] === 'manual' ? 'manual' : 'yahoo_finance') as 'yahoo_finance' | 'manual',
          updated_at: fields[5] || new Date().toISOString(),
        });
      }
    }

    return records;
  }

  async loadAllRates(options?: { latestOnly?: boolean }): Promise<FxRateRecord[]> {
    const useLatest = options?.latestOnly !== false;
    try {
      let pairs: string[] = [];
      try {
        pairs = await invoke<string[]>('list_fx_rate_files');
      } catch (err) {
        console.error('Failed to list FX rate files:', err);
        return [];
      }
      const allRecords: FxRateRecord[] = [];

      for (const pair of pairs) {
        const records = await this.loadRatesForPair(pair, { latestOnly: useLatest });
        allRecords.push(...records);
      }

      return allRecords;
    } catch (error) {
      console.error('Failed to load FX rates:', error);
      return [];
    }
  }

  async getRateByDate(fromCurrency: string, toCurrency: string, date: string): Promise<FxRateRecord | null> {
    const pair = `${fromCurrency}/${toCurrency}`;
    const rates = await this.loadRatesForPair(pair, { latestOnly: false });
    return (
      rates.find(
        r =>
          r.from_currency === fromCurrency &&
          r.to_currency === toCurrency &&
          r.date === date
      ) || null
    );
  }

  async getLatestRate(fromCurrency: string, toCurrency: string): Promise<FxRateRecord | null> {
    const pair = `${fromCurrency}/${toCurrency}`;
    const rates = await this.loadRatesForPair(pair);
    const sorted = rates.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0] || null;
  }

  async saveRates(newRates: FxRateRecord[]): Promise<void> {
    try {
      // Group by currency pair
      const grouped = new Map<string, FxRateRecord[]>();
      for (const rate of newRates) {
        const pair = `${rate.from_currency}/${rate.to_currency}`;
        if (!grouped.has(pair)) {
          grouped.set(pair, []);
        }
        grouped.get(pair)!.push(rate);
      }

      // Save each pair
      for (const [pair, rates] of grouped) {
        const existing = await this.loadRatesForPair(pair, { latestOnly: false });
        const rateMap = new Map<string, FxRateRecord>();

        for (const rate of existing) {
          rateMap.set(rate.date, rate);
        }

        for (const rate of rates) {
          rateMap.set(rate.date, rate);
        }

        const allRates = Array.from(rateMap.values()).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        const csvLines = ['from_currency,to_currency,date,rate,source,updated_at'];
        for (const rate of allRates) {
          csvLines.push(
            `${rate.from_currency},${rate.to_currency},${rate.date},${rate.rate},${rate.source},${rate.updated_at}`
          );
        }

        await invoke('write_fx_rate_file', {
          pair,
          content: csvLines.join('\n') + '\n',
        });
      }
    } catch (error) {
      console.error('Failed to save FX rates:', error);
      throw error;
    }
  }

  private async readFxRateFile(
    pair: string,
    options?: { preferLatest?: boolean }
  ): Promise<string> {
    const useLatest = options?.preferLatest ?? false;
    if (useLatest) {
      try {
        const content = await invoke<string>('read_fx_rate_file_head', {
          pair,
          lines: 8,
        });
        if (content && content.trim()) {
          return content;
        }
      } catch (error) {
        console.warn(`Failed to read FX rate head for ${pair}:`, error);
      }
    }

    return await invoke<string>('read_fx_rate_file', { pair });
  }

  private async loadRatesForPair(
    pair: string,
    options?: { latestOnly?: boolean }
  ): Promise<FxRateRecord[]> {
    try {
      const content = await this.readFxRateFile(pair, {
        preferLatest: options?.latestOnly !== false,
      });
      let records = this.parseFxRateCSV(content);

      if (records.length === 0 && options?.latestOnly !== false) {
        const fallbackContent = await this.readFxRateFile(pair, { preferLatest: false });
        records = this.parseFxRateCSV(fallbackContent);
      }

      if (options?.latestOnly !== false && records.length > 0) {
        return [records[0]];
      }

      return records;
    } catch (error) {
      console.error(`Failed to load FX rates for ${pair}:`, error);
      return [];
    }
  }

  async getRatesForPair(fromCurrency: string, toCurrency: string): Promise<FxRateRecord[]> {
    const pair = `${fromCurrency}/${toCurrency}`;
    const records = await this.loadRatesForPair(pair, { latestOnly: false });
    return records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async appendRate(rate: FxRateRecord): Promise<void> {
    await this.saveRates([rate]);
  }

  async getDailyFxRates(): Promise<Map<string, { latest: FxRateRecord; previous?: FxRateRecord }>> {
    interface DailyFxRateData {
      pair: string;
      latest_rate: number;
      latest_date: string;
      previous_rate?: number;
      previous_date?: string;
    }

    try {
      const dailyRates = await invoke<DailyFxRateData[]>('get_all_daily_fx_rates');
      console.log('getDailyFxRates - Raw data from Rust:', dailyRates);

      const result = new Map<string, { latest: FxRateRecord; previous?: FxRateRecord }>();

      for (const data of dailyRates) {
        const [from, to] = data.pair.split('/');
        if (!from || !to) continue;

        const latest: FxRateRecord = {
          from_currency: from,
          to_currency: to,
          date: data.latest_date,
          rate: data.latest_rate,
          source: 'yahoo_finance',
          updated_at: new Date().toISOString(),
        };

        let previous: FxRateRecord | undefined;
        if (data.previous_rate !== undefined && data.previous_date) {
          previous = {
            from_currency: from,
            to_currency: to,
            date: data.previous_date,
            rate: data.previous_rate,
            source: 'yahoo_finance',
            updated_at: new Date().toISOString(),
          };
        }

        result.set(data.pair, { latest, previous });
      }

      console.log('getDailyFxRates - Processed result map:', Object.fromEntries(result));
      return result;
    } catch (error) {
      console.error('Failed to get daily FX rates:', error);
      return new Map();
    }
  }
}

export const fxRateDataService = new FxRateDataService();
