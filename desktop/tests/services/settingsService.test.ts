import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsService } from '../../src/services/settingsService';
import { invoke } from '@tauri-apps/api/tauri';

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
}));

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    service = new SettingsService();
    vi.clearAllMocks();
  });

  describe('getSetting', () => {
    it('should get a setting value', async () => {
      vi.mocked(invoke).mockResolvedValue('test-value');

      const result = await service.getSetting('test-key');

      expect(invoke).toHaveBeenCalledWith('get_setting', { key: 'test-key' });
      expect(result).toBe('test-value');
    });

    it('should return empty string on error', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(invoke).mockRejectedValue(new Error('Setting not found'));

      const result = await service.getSetting('missing-key');

      expect(result).toBe('');
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to get setting missing-key:', expect.any(Error));
      consoleWarnSpy.mockRestore();
    });

    it('should return empty string when value is empty', async () => {
      vi.mocked(invoke).mockResolvedValue('');

      const result = await service.getSetting('empty-key');

      expect(result).toBe('');
    });
  });

  describe('setSetting', () => {
    it('should save a setting value', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await service.setSetting('test-key', 'test-value');

      expect(invoke).toHaveBeenCalledWith('set_setting', { key: 'test-key', value: 'test-value' });
    });

    it('should throw error on failure', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Failed to save');
      vi.mocked(invoke).mockRejectedValue(error);

      await expect(service.setSetting('test-key', 'test-value')).rejects.toThrow('Failed to save');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save setting test-key:', error);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('loadSettings', () => {
    it('should load settings', async () => {
      vi.mocked(invoke).mockResolvedValue('TWD');

      const result = await service.loadSettings();

      expect(result).toEqual({
        baseCurrency: 'TWD',
        privacyMode: false,
      });
    });

    it('should default to USD for baseCurrency', async () => {
      vi.mocked(invoke).mockResolvedValue('');

      const result = await service.loadSettings();

      expect(result.baseCurrency).toBe('USD');
    });
  });

  describe('saveSettings', () => {
    it('should save settings', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      await service.saveSettings({
        baseCurrency: 'JPY',
      });

      expect(invoke).toHaveBeenCalledWith('set_setting', { key: 'baseCurrency', value: 'JPY' });
    });

    it('should handle save errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(invoke).mockRejectedValue(new Error('Save failed'));

      await expect(service.saveSettings({
        baseCurrency: 'USD',
      })).rejects.toThrow('Save failed');

      consoleErrorSpy.mockRestore();
    });
  });
});
