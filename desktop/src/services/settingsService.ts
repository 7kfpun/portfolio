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

  async loadSettings(): Promise<AppSettings> {
    const baseCurrency = await this.getSetting('baseCurrency');
    const privacyMode = await this.getSetting('privacyMode');
    return {
      baseCurrency: (baseCurrency as 'USD' | 'TWD' | 'JPY' | 'HKD') || 'USD',
      privacyMode: privacyMode === 'true',
    };
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.setSetting('baseCurrency', settings.baseCurrency);
    if (settings.privacyMode !== undefined) {
      await this.setSetting('privacyMode', settings.privacyMode.toString());
    }
  }
}

export const settingsService = new SettingsService();
