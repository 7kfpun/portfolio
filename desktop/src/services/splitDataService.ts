import { invoke } from '@tauri-apps/api/tauri';
import { SplitRecord } from '../types/StockDetail';
import { parseCSV } from '../utils/csvUtils';

interface SplitFileRow {
    date: string;
    numerator: string;
    denominator: string;
    before_price?: string;
    after_price?: string;
}

export class SplitDataService {
    private parseSplitFile(csvContent: string): SplitRecord[] {
        if (!csvContent || !csvContent.trim()) {
            return [];
        }

        const rows = parseCSV<SplitFileRow>(csvContent);
        const records: SplitRecord[] = [];

        for (const row of rows) {
            if (!row.date || !row.numerator || !row.denominator) {
                continue;
            }

            const numerator = parseFloat(row.numerator);
            const denominator = parseFloat(row.denominator);

            if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
                continue;
            }

            const ratio = numerator / denominator;

            records.push({
                date: row.date,
                ratio,
            });
        }

        return records;
    }

    private async readSymbolSplits(symbol: string): Promise<string> {
        try {
            const content = await invoke<string>('read_split_file', {
                symbol,
            });
            return content;
        } catch (error) {
            console.warn(`No splits file found for ${symbol}:`, error);
            return '';
        }
    }

    async getSplitsForSymbol(symbol: string): Promise<SplitRecord[]> {
        try {
            const content = await this.readSymbolSplits(symbol);
            const splits = this.parseSplitFile(content);

            console.log(`[SplitDataService] Loaded ${splits.length} splits for ${symbol}:`, splits);

            return splits;
        } catch (error) {
            console.error(`Failed to load splits for ${symbol}:`, error);
            return [];
        }
    }
}

export const splitDataService = new SplitDataService();
