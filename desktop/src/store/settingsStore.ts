import { create } from 'zustand';
import { AppSettings, CurrencyType } from '../types/Settings';
import { settingsService } from '../services/settingsService';

const DEFAULT_SETTINGS: AppSettings = {
  baseCurrency: 'USD',
  privacyMode: false,
};

interface SettingsState {
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  baseCurrency: CurrencyType;
  privacyMode: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: AppSettings) => Promise<void>;
  setBaseCurrency: (currency: CurrencyType) => Promise<void>;
  setPrivacyMode: (enabled: boolean) => Promise<void>;
  togglePrivacyMode: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loading: false,
  error: null,
  baseCurrency: 'USD',
  privacyMode: false,

  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const data = await settingsService.loadSettings();
      set({
        settings: data,
        baseCurrency: data.baseCurrency,
        privacyMode: data.privacyMode || false,
        loading: false
      });
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
      set({
        settings: newSettings,
        baseCurrency: newSettings.baseCurrency,
        privacyMode: newSettings.privacyMode || false,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to save settings';
      set({ error });
      throw err;
    }
  },

  setBaseCurrency: async (currency: CurrencyType) => {
    const { settings, updateSettings } = get();
    await updateSettings({ ...settings, baseCurrency: currency });
  },

  setPrivacyMode: async (enabled: boolean) => {
    const { settings, updateSettings } = get();
    await updateSettings({ ...settings, privacyMode: enabled });
  },

  togglePrivacyMode: async () => {
    const { settings, updateSettings } = get();
    await updateSettings({ ...settings, privacyMode: !settings.privacyMode });
  },
}));
