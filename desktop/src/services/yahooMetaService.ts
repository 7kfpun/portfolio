import { invoke } from '@tauri-apps/api/tauri';
import { YahooMeta } from '../types/YahooMeta';

export class YahooMetaService {
  async getMeta(symbol: string): Promise<YahooMeta | null> {
    try {
      // The backend 'read_storage_csv' reads from the data directory.
      // We assume the meta files are stored in data/yahoo_metas/{symbol}.json
      // Symbols with colons are usually replaced by underscores in filenames (e.g. HKEX:0700 -> HKEX_0700)
      const safeSymbol = symbol.replace(':', '_');
      const filename = `yahoo_metas/${safeSymbol}.json`;
      
      const content = await invoke<string>('read_storage_csv', { filename });
      
      if (!content || !content.trim()) {
        return null;
      }

      const meta: YahooMeta = JSON.parse(content);
      return meta;
    } catch (error) {
      console.warn(`Failed to load Yahoo Meta for ${symbol}:`, error);
      return null;
    }
  }
}

export const yahooMetaService = new YahooMetaService();
