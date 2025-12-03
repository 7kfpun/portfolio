import { describe, expect, it, vi, beforeEach } from 'vitest';
import { usePortfolioStore } from '../src/store/portfolioStore';
import { useTransactionsStore } from '../src/store/transactionsStore';
import { priceService } from '../src/services/priceService';
import { fxRateDataService } from '../src/services/fxRateDataService';
import { fxRateService } from '../src/services/fxRateService';

vi.mock('../src/services/priceService');
vi.mock('../src/services/fxRateDataService');
vi.mock('../src/services/fxRateService');

describe('portfolioStore', () => {
  beforeEach(() => {
    usePortfolioStore.setState({
      positions: [],
      summary: null,
      loadingPrices: false,
      lastUpdated: null,
      fxRates: new Map([['USD', 1]]),
    });

    useTransactionsStore.setState({
      transactions: [],
      loading: false,
      error: null,
    });

    vi.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const state = usePortfolioStore.getState();
    expect(state.positions).toEqual([]);
    expect(state.summary).toBe(null);
    expect(state.loadingPrices).toBe(false);
    expect(state.lastUpdated).toBe(null);
    expect(state.fxRates.get('USD')).toBe(1);
  });

  it('calculates portfolio from transactions', () => {
    useTransactionsStore.setState({
      transactions: [
        {
          date: '2024-01-01',
          stock: 'AAPL',
          quantity: '10',
          price: '150',
          fees: '0',
          split_ratio: '',
          type: 'Buy',
          currency: 'USD',
        },
        {
          date: '2024-01-02',
          stock: 'AAPL',
          quantity: '5',
          price: '160',
          fees: '0',
          split_ratio: '',
          type: 'Buy',
          currency: 'USD',
        },
      ],
      loading: false,
      error: null,
    });

    const { calculatePortfolio } = usePortfolioStore.getState();
    calculatePortfolio();

    const state = usePortfolioStore.getState();
    expect(state.positions).toHaveLength(1);
    expect(state.positions[0].stock).toBe('AAPL');
    expect(state.positions[0].shares).toBe(15);
    expect(state.summary).not.toBe(null);
  });

  it('loads cached prices successfully', async () => {
    useTransactionsStore.setState({
      transactions: [
        {
          date: '2024-01-01',
          stock: 'NASDAQ:AAPL',
          quantity: '10',
          price: '150',
          fees: '0',
          split_ratio: '',
          type: 'Buy',
          currency: 'USD',
        },
      ],
      loading: false,
      error: null,
    });

    const { calculatePortfolio } = usePortfolioStore.getState();
    calculatePortfolio();

    const priceMap = new Map([['NASDAQ:AAPL', 180]]);
    vi.mocked(priceService.getCachedPrices).mockResolvedValue(priceMap);

    const { loadCachedPrices } = usePortfolioStore.getState();
    await loadCachedPrices();

    const state = usePortfolioStore.getState();
    expect(state.positions[0].currentPrice).toBe(180);
    expect(state.lastUpdated).not.toBe(null);
  });

  it('refreshes prices with loading state', async () => {
    useTransactionsStore.setState({
      transactions: [
        {
          date: '2024-01-01',
          stock: 'NASDAQ:AAPL',
          quantity: '10',
          price: '150',
          fees: '0',
          split_ratio: '',
          type: 'Buy',
          currency: 'USD',
        },
      ],
      loading: false,
      error: null,
    });

    const { calculatePortfolio } = usePortfolioStore.getState();
    calculatePortfolio();

    const priceMap = new Map([['NASDAQ:AAPL', 180]]);
    vi.mocked(priceService.getBatchPrices).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(priceMap), 100))
    );

    const { refreshPrices } = usePortfolioStore.getState();
    const promise = refreshPrices();

    const loadingState = usePortfolioStore.getState();
    expect(loadingState.loadingPrices).toBe(true);

    await promise;

    const finalState = usePortfolioStore.getState();
    expect(finalState.loadingPrices).toBe(false);
    expect(finalState.positions[0].currentPrice).toBe(180);
  });

  it('handles price refresh errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    useTransactionsStore.setState({
      transactions: [
        {
          date: '2024-01-01',
          stock: 'NASDAQ:AAPL',
          quantity: '10',
          price: '150',
          fees: '0',
          split_ratio: '',
          type: 'Buy',
          currency: 'USD',
        },
      ],
      loading: false,
      error: null,
    });

    const { calculatePortfolio } = usePortfolioStore.getState();
    calculatePortfolio();

    vi.mocked(priceService.getBatchPrices).mockRejectedValue(
      new Error('Failed to fetch prices')
    );

    const { refreshPrices } = usePortfolioStore.getState();
    await refreshPrices();

    const state = usePortfolioStore.getState();
    expect(state.loadingPrices).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('loads FX rates from cache and fetches missing ones', async () => {
    const cachedRates = [
      { from_currency: 'TWD', to_currency: 'USD', rate: 0.0312, date: '2024-01-01', source: 'twelve_data' as const, updated_at: '2024-01-01T00:00:00Z' },
    ];

    vi.mocked(fxRateDataService.loadAllRates).mockResolvedValue(cachedRates);
    vi.mocked(fxRateService.getBatchRates).mockResolvedValue(new Map());

    const { loadFxRates } = usePortfolioStore.getState();
    await loadFxRates();

    const state = usePortfolioStore.getState();
    expect(state.fxRates.get('TWD')).toBe(0.0312);
    expect(state.fxRates.get('USD')).toBe(1);
  });

  it('fetches missing FX rates when not in cache', async () => {
    vi.mocked(fxRateDataService.loadAllRates)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { from_currency: 'JPY', to_currency: 'USD', rate: 0.0067, date: '2024-01-01', source: 'twelve_data' as const, updated_at: '2024-01-01T00:00:00Z' },
        { from_currency: 'HKD', to_currency: 'USD', rate: 0.1282, date: '2024-01-01', source: 'twelve_data' as const, updated_at: '2024-01-01T00:00:00Z' },
      ]);

    vi.mocked(fxRateService.getBatchRates).mockResolvedValue(new Map());

    const { loadFxRates } = usePortfolioStore.getState();
    await loadFxRates();

    expect(fxRateService.getBatchRates).toHaveBeenCalledWith([
      { from: 'TWD', to: 'USD' },
      { from: 'JPY', to: 'USD' },
      { from: 'HKD', to: 'USD' },
    ]);

    const state = usePortfolioStore.getState();
    expect(state.fxRates.get('JPY')).toBe(0.0067);
    expect(state.fxRates.get('HKD')).toBe(0.1282);
  });

  it('handles FX rate loading errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(fxRateDataService.loadAllRates).mockRejectedValue(
      new Error('Failed to load FX rates')
    );

    const { loadFxRates } = usePortfolioStore.getState();
    await loadFxRates();

    expect(consoleSpy).toHaveBeenCalledWith('Failed to load FX rates:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});
