import { invoke } from '@tauri-apps/api/tauri';
import Papa from 'papaparse';
import { NavRecord } from '../types/NavData';

export class NavDataService {
  async getNavForSymbol(symbol: string): Promise<NavRecord[]> {
    try {
      const csvContent = await invoke<string>('read_nav_file', { symbol });
      const parsed = Papa.parse<NavRecord>(csvContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        console.warn('CSV parsing errors:', parsed.errors);
      }

      return parsed.data
        .filter((record) => record.date && record.close)
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error(`Failed to load NAV data for ${symbol}:`, error);
      return [];
    }
  }

  async hasNavData(symbol: string): Promise<boolean> {
    try {
      const data = await this.getNavForSymbol(symbol);
      return data.length > 0;
    } catch {
      return false;
    }
  }
}

export const navDataService = new NavDataService();
