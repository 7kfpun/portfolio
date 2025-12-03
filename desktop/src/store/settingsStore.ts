import { create } from 'zustand';
import { AppSettings } from '../types/Settings';
import { settingsService } from '../services/settingsService';

const DEFAULT_SETTINGS: AppSettings = {
  apiKeyTwelveData: '',
  apiKeyMassive: '',
  baseCurrency: 'USD',
};

interface SettingsState {
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: AppSettings) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  loading: false,
  error: null,

  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const data = await settingsService.loadSettings();
      set({ settings: data, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load settings',
        loading: false,
      });
    }
  },

  updateSettings: async (newSettings: AppSettings) => {
    set({ error: null });
    try {
      await settingsService.saveSettings(newSettings);
      set({ settings: newSettings });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to save settings';
      set({ error });
      throw err;
    }
  },
}));
