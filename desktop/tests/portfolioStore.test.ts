import { describe, expect, it, vi, beforeEach } from 'vitest';
import { usePortfolioStore } from '../src/store/portfolioStore';
import { useTransactionsStore } from '../src/store/transactionsStore';
import { priceService } from '../src/services/priceService';
import { fxRateDataService } from '../src/services/fxRateDataService';
import { priceDataService } from '../src/services/priceDataService';

vi.mock('../src/services/priceService');
vi.mock('../src/services/fxRateDataService');
vi.mock('../src/services/priceDataService');

describe('portfolioStore', () => {
  beforeEach(() => {
    usePortfolioStore.setState({
      positions: [],
      summary: null,
      loading: false,
      lastUpdated: null,
      fxRates: new Map([['USD', 1]]),
    });

    useTransactionsStore.setState({
      transactions: [],
      loading: false,
      error: null,
    });

    // Mock getDailyPrices to return empty map by default
    vi.mocked(priceDataService.getDailyPrices).mockResolvedValue(new Map());

    vi.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const state = usePortfolioStore.getState();
    expect(state.positions).toEqual([]);
    expect(state.summary).toBe(null);
    expect(state.loading).toBe(false);
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

    const { loadPortfolio } = usePortfolioStore.getState();
    await loadPortfolio();

    const state = usePortfolioStore.getState();
    expect(state.positions[0].currentPrice).toBe(180);
    expect(state.lastUpdated).not.toBe(null);
  });

  it('loads portfolio with loading state', async () => {
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
    vi.mocked(priceService.getCachedPrices).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(priceMap), 100))
    );

    const { loadPortfolio } = usePortfolioStore.getState();
    const promise = loadPortfolio();

    const loadingState = usePortfolioStore.getState();
    expect(loadingState.loading).toBe(true);

    await promise;

    const finalState = usePortfolioStore.getState();
    expect(finalState.loading).toBe(false);
    expect(finalState.positions[0].currentPrice).toBe(180);
  });

  it('handles portfolio loading errors', async () => {
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

    vi.mocked(priceService.getCachedPrices).mockRejectedValue(
      new Error('Failed to fetch prices')
    );

    const { loadPortfolio } = usePortfolioStore.getState();
    await loadPortfolio();

    const state = usePortfolioStore.getState();
    expect(state.loading).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('loads FX rates from cache', async () => {
    const dailyRates = new Map([
      ['USD/TWD', {
        latest: { from_currency: 'USD', to_currency: 'TWD', rate: 32.05, date: '2024-01-01', source: 'yahoo_finance' as const, updated_at: '2024-01-01T00:00:00Z' },
      }],
    ]);

    vi.mocked(fxRateDataService.getDailyFxRates).mockResolvedValue(dailyRates);

    const { loadFxRates } = usePortfolioStore.getState();
    await loadFxRates();

    const state = usePortfolioStore.getState();
    // Rate is stored inverted: 1/32.05 = 0.0312
    expect(state.fxRates.get('TWD')).toBeCloseTo(1 / 32.05, 4);
    expect(state.fxRates.get('USD')).toBe(1);
  });

  it('loads multiple FX rates from cache', async () => {
    const dailyRates = new Map([
      ['USD/JPY', {
        latest: { from_currency: 'USD', to_currency: 'JPY', rate: 149.25, date: '2024-01-01', source: 'yahoo_finance' as const, updated_at: '2024-01-01T00:00:00Z' },
      }],
      ['USD/HKD', {
        latest: { from_currency: 'USD', to_currency: 'HKD', rate: 7.8, date: '2024-01-01', source: 'yahoo_finance' as const, updated_at: '2024-01-01T00:00:00Z' },
      }],
    ]);

    vi.mocked(fxRateDataService.getDailyFxRates).mockResolvedValue(dailyRates);

    const { loadFxRates } = usePortfolioStore.getState();
    await loadFxRates();

    const state = usePortfolioStore.getState();
    // Rates are stored inverted
    expect(state.fxRates.get('JPY')).toBeCloseTo(1 / 149.25, 4);
    expect(state.fxRates.get('HKD')).toBeCloseTo(1 / 7.8, 4);
  });

  it('handles FX rate loading errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(fxRateDataService.getDailyFxRates).mockRejectedValue(
      new Error('Failed to load FX rates')
    );

    const { loadFxRates } = usePortfolioStore.getState();
    await loadFxRates();

    expect(consoleSpy).toHaveBeenCalledWith('loadFxRates: Failed to load FX rates:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});
