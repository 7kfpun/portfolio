import { invoke } from '@tauri-apps/api/tauri';
import { AppSettings } from '../types/Settings';

export class SettingsService {
  async getSetting(key: string): Promise<string> {
    try {
      const value = await invoke<string>('get_setting', { key });
      return value || '';
    } catch (error) {
      console.warn(`Failed to get setting ${key}:`, error);
      return '';
    }
  }

  async setSetting(key: string, value: string): Promise<void> {
    try {
      await invoke('set_setting', { key, value });
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error);
      throw error;
    }
  }

  async getTwelveDataApiKey(): Promise<string> {
    return await this.getSetting('apiKeyTwelveData');
  }

  async getMassiveApiKey(): Promise<string> {
    return await this.getSetting('apiKeyMassive');
  }

  async saveTwelveDataApiKey(apiKey: string): Promise<void> {
    await this.setSetting('apiKeyTwelveData', apiKey);
  }

  async saveMassiveApiKey(apiKey: string): Promise<void> {
    await this.setSetting('apiKeyMassive', apiKey);
  }

  async loadSettings(): Promise<AppSettings> {
    const [twelveData, massive, baseCurrency] = await Promise.all([
      this.getSetting('apiKeyTwelveData'),
      this.getSetting('apiKeyMassive'),
      this.getSetting('baseCurrency'),
    ]);
    return {
      apiKeyTwelveData: twelveData,
      apiKeyMassive: massive,
      baseCurrency: (baseCurrency as 'USD' | 'TWD' | 'JPY' | 'HKD') || 'USD',
    };
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await Promise.all([
      this.setSetting('apiKeyTwelveData', settings.apiKeyTwelveData),
      this.setSetting('apiKeyMassive', settings.apiKeyMassive),
      this.setSetting('baseCurrency', settings.baseCurrency),
    ]);
  }
}

export const settingsService = new SettingsService();
