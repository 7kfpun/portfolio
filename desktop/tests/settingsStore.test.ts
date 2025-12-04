import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useSettingsStore } from '../src/store/settingsStore';
import { settingsService } from '../src/services/settingsService';

vi.mock('../src/services/settingsService');

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      settings: {
        baseCurrency: 'USD',
      },
      loading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('initializes with default settings', () => {
    const state = useSettingsStore.getState();
    expect(state.settings).toEqual({
      baseCurrency: 'USD',
    });
    expect(state.loading).toBe(false);
    expect(state.error).toBe(null);
  });

  it('loads settings successfully', async () => {
    const mockSettings = {
      baseCurrency: 'TWD' as const,
    };

    vi.mocked(settingsService.loadSettings).mockResolvedValue(mockSettings);

    const { loadSettings } = useSettingsStore.getState();
    await loadSettings();

    const state = useSettingsStore.getState();
    expect(state.settings).toEqual(mockSettings);
    expect(state.loading).toBe(false);
    expect(state.error).toBe(null);
  });

  it('sets loading state during fetch', async () => {
    vi.mocked(settingsService.loadSettings).mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                baseCurrency: 'USD',
              }),
            100
          )
        )
    );

    const { loadSettings } = useSettingsStore.getState();
    const promise = loadSettings();

    const loadingState = useSettingsStore.getState();
    expect(loadingState.loading).toBe(true);

    await promise;

    const finalState = useSettingsStore.getState();
    expect(finalState.loading).toBe(false);
  });

  it('handles load errors gracefully', async () => {
    const errorMessage = 'Failed to load settings';
    vi.mocked(settingsService.loadSettings).mockRejectedValue(new Error(errorMessage));

    const { loadSettings } = useSettingsStore.getState();
    await loadSettings();

    const state = useSettingsStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBe(errorMessage);
  });

  it('updates settings successfully', async () => {
    const newSettings = {
      baseCurrency: 'JPY' as const,
    };

    vi.mocked(settingsService.saveSettings).mockResolvedValue();

    const { updateSettings } = useSettingsStore.getState();
    await updateSettings(newSettings);

    const state = useSettingsStore.getState();
    expect(state.settings).toEqual(newSettings);
    expect(state.error).toBe(null);
  });

  it('handles update errors and throws', async () => {
    const errorMessage = 'Failed to save settings';
    vi.mocked(settingsService.saveSettings).mockRejectedValue(new Error(errorMessage));

    const newSettings = {
      baseCurrency: 'USD' as const,
    };

    const { updateSettings } = useSettingsStore.getState();

    await expect(updateSettings(newSettings)).rejects.toThrow(errorMessage);

    const state = useSettingsStore.getState();
    expect(state.error).toBe(errorMessage);
  });

  it('handles non-Error rejections in load', async () => {
    vi.mocked(settingsService.loadSettings).mockRejectedValue('String error');

    const { loadSettings } = useSettingsStore.getState();
    await loadSettings();

    const state = useSettingsStore.getState();
    expect(state.error).toBe('Failed to load settings');
  });

  it('handles non-Error rejections in update', async () => {
    vi.mocked(settingsService.saveSettings).mockRejectedValue('String error');

    const newSettings = {
      baseCurrency: 'USD' as const,
    };

    const { updateSettings } = useSettingsStore.getState();

    await expect(updateSettings(newSettings)).rejects.toEqual('String error');

    const state = useSettingsStore.getState();
    expect(state.error).toBe('Failed to save settings');
  });
});
