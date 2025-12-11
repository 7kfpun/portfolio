import { invoke } from '@tauri-apps/api/tauri';
import { FxRateRecord } from '../types/FxRateData';
import { parseNumber } from '../utils/csvUtils';

const FX_RATES_HEADER = 'from_currency,to_currency,date,rate,source,updated_at';

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
        if (pair.endsWith('-override')) {
          continue;
        }
        const records = await this.loadRatesForPair(pair, {
          latestOnly: useLatest,
        });
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
        const existing = await this.loadRatesForPair(pair, { latestOnly: false, includeOverrides: false });
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

  private async readFxRateFile(pair: string): Promise<string> {
    try {
      return await invoke<string>('read_fx_rate_file', { pair });
    } catch {
      return '';
    }
  }

  private async loadRatesForPair(
    pair: string,
    options?: { latestOnly?: boolean; includeOverrides?: boolean }
  ): Promise<FxRateRecord[]> {
    const [fromCurrency, toCurrency] = pair.split('/');
    if (!fromCurrency || !toCurrency) {
      return [];
    }

    const latestOnly = options?.latestOnly !== false;
    const includeOverrides = options?.includeOverrides !== false;

    return await invoke<FxRateRecord[]>('read_fx_rates_polars', {
      fromCurrency,
      toCurrency,
      latestOnly,
      includeOverrides,
    });
  }

  async getRatesForPair(fromCurrency: string, toCurrency: string): Promise<FxRateRecord[]> {
    const pair = `${fromCurrency}/${toCurrency}`;
    const records = await this.loadRatesForPair(pair, { latestOnly: false, includeOverrides: true });
    return records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async saveOverrideRatesForPair(
    fromCurrency: string,
    toCurrency: string,
    overrideRates: FxRateRecord[]
  ): Promise<void> {
    const pair = `${fromCurrency}/${toCurrency}`;

    // Read existing overrides
    const overrideContent = await invoke<string>('read_fx_rate_file', {
      pair: `${pair}-override`
    }).catch(() => '');

    const existingRecords = this.parseFxRateCSV(overrideContent);

    // Create a map of existing records by date
    const recordMap = new Map<string, FxRateRecord>();
    for (const record of existingRecords) {
      recordMap.set(record.date, record);
    }

    // Add/update with new records
    const sanitized = overrideRates
      .filter(record => record.date && !Number.isNaN(record.rate))
      .map(record => ({
        ...record,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        source: 'manual' as const,
        updated_at: new Date().toISOString(),
      }));

    for (const record of sanitized) {
      recordMap.set(record.date, record);
    }

    const allRecords = Array.from(recordMap.values());

    if (!allRecords.length) {
      try {
        await invoke('write_fx_rate_override_file', {
          pair,
          content: FX_RATES_HEADER + '\n',
        });
      } catch (error) {
        console.warn('Failed to clear override file', error);
      }
      return;
    }

    const csvLines = [FX_RATES_HEADER];
    for (const rate of allRecords) {
      csvLines.push(
        `${rate.from_currency},${rate.to_currency},${rate.date},${rate.rate},${rate.source},${rate.updated_at}`
      );
    }

    await invoke('write_fx_rate_override_file', {
      pair,
      content: csvLines.join('\n') + '\n',
    });
  }

  async removeOverrideRate(
    fromCurrency: string,
    toCurrency: string,
    date: string
  ): Promise<void> {
    // This method is used to remove a single override rate
    // We need to read the existing overrides, filter out the one to delete, and write back
    const pair = `${fromCurrency}/${toCurrency}`;

    // Read the override file directly
    const overrideContent = await invoke<string>('read_fx_rate_file', {
      pair: `${pair}-override`
    }).catch(() => '');

    const existingRecords = this.parseFxRateCSV(overrideContent);
    const filteredRecords = existingRecords.filter(record => record.date !== date);

    if (filteredRecords.length === 0) {
      try {
        await invoke('write_fx_rate_override_file', {
          pair,
          content: FX_RATES_HEADER + '\n',
        });
      } catch (error) {
        console.warn('Failed to clear override file', error);
      }
      return;
    }

    const csvLines = [FX_RATES_HEADER];
    for (const rate of filteredRecords) {
      csvLines.push(
        `${rate.from_currency},${rate.to_currency},${rate.date},${rate.rate},${rate.source},${rate.updated_at}`
      );
    }

    await invoke('write_fx_rate_override_file', {
      pair,
      content: csvLines.join('\n') + '\n',
    });
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
