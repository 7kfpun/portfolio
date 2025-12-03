import { invoke } from '@tauri-apps/api/tauri';
import { FxRateRecord } from '../types/FxRateData';
import { parseNumber, parseCSV, toCSV } from '../utils/csvUtils';

const FX_RATES_CSV = 'fx_rates.csv';

interface FxRateCSVRow {
  from_currency: string;
  to_currency: string;
  date: string;
  rate: string;
  source?: string;
  updated_at?: string;
}

export class FxRateDataService {
  private parseFxRateCSV(csvContent: string): FxRateRecord[] {
    const rows = parseCSV<FxRateCSVRow>(csvContent);
    const records: FxRateRecord[] = [];

    for (const row of rows) {
      const parsedRate = parseNumber(row.rate);
      if (parsedRate === undefined) continue;

      records.push({
        from_currency: row.from_currency,
        to_currency: row.to_currency,
        date: row.date,
        rate: parsedRate,
        source: (row.source as any) || 'twelve_data',
        updated_at: row.updated_at || new Date().toISOString(),
      });
    }

    return records;
  }

  private toFxRateCSV(records: FxRateRecord[]): string {
    return toCSV(records, [
      'from_currency',
      'to_currency',
      'date',
      'rate',
      'source',
      'updated_at',
    ]);
  }

  async loadAllRates(): Promise<FxRateRecord[]> {
    try {
      const content = await invoke<string>('read_data_csv', { filename: FX_RATES_CSV });
      return this.parseFxRateCSV(content);
    } catch (error) {
      console.error('Failed to load FX rates:', error);
      return [];
    }
  }

  async getRateByDate(fromCurrency: string, toCurrency: string, date: string): Promise<FxRateRecord | null> {
    const rates = await this.loadAllRates();
    return rates.find(r =>
      r.from_currency === fromCurrency &&
      r.to_currency === toCurrency &&
      r.date === date
    ) || null;
  }

  async getLatestRate(fromCurrency: string, toCurrency: string): Promise<FxRateRecord | null> {
    const rates = await this.loadAllRates();
    const filteredRates = rates
      .filter(r => r.from_currency === fromCurrency && r.to_currency === toCurrency)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return filteredRates[0] || null;
  }

  async saveRates(newRates: FxRateRecord[]): Promise<void> {
    try {
      const existing = await this.loadAllRates();
      const rateMap = new Map<string, FxRateRecord>();

      for (const rate of existing) {
        const key = `${rate.from_currency}_${rate.to_currency}_${rate.date}`;
        rateMap.set(key, rate);
      }

      for (const rate of newRates) {
        const key = `${rate.from_currency}_${rate.to_currency}_${rate.date}`;
        rateMap.set(key, rate);
      }

      const allRates = Array.from(rateMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      const csvContent = this.toFxRateCSV(allRates);
      await invoke('write_data_csv', { filename: FX_RATES_CSV, content: csvContent });
    } catch (error) {
      console.error('Failed to save FX rates:', error);
      throw error;
    }
  }

  async appendRate(rate: FxRateRecord): Promise<void> {
    try {
      const csvRow = [
        rate.from_currency,
        rate.to_currency,
        rate.date,
        rate.rate,
        rate.source,
        rate.updated_at,
      ].join(',') + '\n';

      const existing = await invoke<string>('read_data_csv', { filename: FX_RATES_CSV });
      if (!existing.trim()) {
        const header = 'from_currency,to_currency,date,rate,source,updated_at\n';
        await invoke('write_data_csv', { filename: FX_RATES_CSV, content: header + csvRow });
      } else {
        await invoke('append_data_csv', { filename: FX_RATES_CSV, content: csvRow });
      }
    } catch (error) {
      console.error('Failed to append FX rate:', error);
      throw error;
    }
  }
}

export const fxRateDataService = new FxRateDataService();
