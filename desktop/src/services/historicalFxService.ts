import { invoke } from '@tauri-apps/api/tauri';
import { FxRateRecord } from '../types/FxRateData';
import { CURRENCY_PAIRS } from '../config/currencies';

interface YahooFxPair {
  from: string;
  to: string;
  yahooSymbol: string;
}

// Generate FX pairs from config - Yahoo Finance uses format like "USDJPY=X"
const FX_PAIRS: YahooFxPair[] = CURRENCY_PAIRS.map(pair => ({
  from: pair.from,
  to: pair.to,
  yahooSymbol: `${pair.from}${pair.to}=X`,
}));

export class HistoricalFxService {
  async downloadFxPair(fromCurrency: string, toCurrency: string): Promise<void> {
    const pair = FX_PAIRS.find(p => p.from === fromCurrency && p.to === toCurrency);
    if (!pair) {
      throw new Error(`Currency pair ${fromCurrency}/${toCurrency} not supported`);
    }

    const today = new Date();
    const fifteenYearsAgo = new Date();
    fifteenYearsAgo.setFullYear(today.getFullYear() - 15);

    const period1 = Math.floor(fifteenYearsAgo.getTime() / 1000);
    const period2 = Math.floor(today.getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${pair.yahooSymbol}?period1=${period1}&period2=${period2}&interval=1d&includeAdjustedClose=false`;

    try {
      const response = await invoke<string>('proxy_get', { url });
      const data = JSON.parse(response);

      if (data.chart?.error) {
        throw new Error(
          `Yahoo Finance error: ${data.chart.error.description || 'Unknown error'}`
        );
      }

      const result = data.chart?.result?.[0];
      if (!result) {
        throw new Error('No data returned from Yahoo Finance');
      }

      const timestamps = result.timestamp || [];
      const quote = result.indicators?.quote?.[0];

      if (!quote) {
        throw new Error('No quote data in response');
      }

      const closes = quote.close || [];
      const records: FxRateRecord[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        const date = new Date(timestamps[i] * 1000);
        const rate = closes[i];

        if (rate !== null && rate !== undefined) {
          const dateStr = date.toISOString().split('T')[0];
          const updatedAt = new Date().toISOString();

          records.push({
            from_currency: fromCurrency,
            to_currency: toCurrency,
            date: dateStr,
            rate: Number(rate),
            source: 'yahoo_finance',
            updated_at: updatedAt,
          });
        }
      }

      if (records.length > 0) {
        await this.saveFxRecords(records);
      }
    } catch (error) {
      console.error(`Failed to download FX data for ${fromCurrency}/${toCurrency}:`, error);
      throw error;
    }
  }

  private async saveFxRecords(records: FxRateRecord[]): Promise<void> {
    try {
      // Group records by currency pair
      const grouped = new Map<string, FxRateRecord[]>();

      for (const record of records) {
        const pair = `${record.from_currency}/${record.to_currency}`;
        if (!grouped.has(pair)) {
          grouped.set(pair, []);
        }
        grouped.get(pair)!.push(record);
      }

      // Save each currency pair to its own file
      for (const [pair, pairRecords] of grouped) {
        // Read existing data for this pair
        let existingContent = '';
        try {
          existingContent = await invoke<string>('read_fx_rate_file', { pair });
        } catch (error) {
          // File doesn't exist yet, will be created on first write
          console.log(`No existing FX rate file for ${pair}, will create new file`);
        }

        // Parse existing records
        const existingRecords = new Map<string, FxRateRecord>();
        if (existingContent.trim()) {
          const lines = existingContent.trim().split('\n');
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const fields = line.split(',');
            if (fields.length >= 4) {
              const key = fields[2]; // date is the key
              const source = fields[4];
              existingRecords.set(key, {
                from_currency: fields[0],
                to_currency: fields[1],
                date: fields[2],
                rate: parseFloat(fields[3]),
                source: (source === 'manual' ? 'manual' : 'yahoo_finance') as 'yahoo_finance' | 'manual',
                updated_at: fields[5] || new Date().toISOString(),
              });
            }
          }
        }

        // Merge with new records
        for (const record of pairRecords) {
          existingRecords.set(record.date, record);
        }

        // Sort by date descending
        const allRecords = Array.from(existingRecords.values()).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        // Build CSV content
        const csvLines = ['from_currency,to_currency,date,rate,source,updated_at'];
        for (const record of allRecords) {
          csvLines.push(
            `${record.from_currency},${record.to_currency},${record.date},${record.rate},${record.source},${record.updated_at}`
          );
        }

        await invoke('write_fx_rate_file', {
          pair,
          content: csvLines.join('\n') + '\n',
        });
      }
    } catch (error) {
      console.error('Failed to save FX records:', error);
      throw error;
    }
  }

  async downloadAllPairs(): Promise<void> {
    for (const pair of FX_PAIRS) {
      await this.downloadFxPair(pair.from, pair.to);
    }
  }

  getSupportedPairs(): Array<{ from: string; to: string }> {
    return FX_PAIRS.map(p => ({ from: p.from, to: p.to }));
  }
}

export const historicalFxService = new HistoricalFxService();
