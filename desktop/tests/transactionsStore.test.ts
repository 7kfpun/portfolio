import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useTransactionsStore } from '../src/store/transactionsStore';
import { transactionService } from '../src/services/transactionService';

vi.mock('../src/services/transactionService');

describe('transactionsStore', () => {
  beforeEach(() => {
    useTransactionsStore.setState({
      transactions: [],
      loading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('initializes with empty state', () => {
    const state = useTransactionsStore.getState();
    expect(state.transactions).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBe(null);
  });

  it('loads transactions successfully', async () => {
    const mockTransactions = [
      {
        date: '2024-01-01',
        stock: 'AAPL',
        shares: 10,
        price: 150,
        type: 'Buy' as const,
        currency: 'USD' as const,
      },
      {
        date: '2024-01-02',
        stock: 'MSFT',
        shares: 5,
        price: 300,
        type: 'Buy' as const,
        currency: 'USD' as const,
      },
    ];

    vi.mocked(transactionService.loadTransactions).mockResolvedValue(mockTransactions);

    const { loadTransactions } = useTransactionsStore.getState();
    await loadTransactions();

    const state = useTransactionsStore.getState();
    expect(state.transactions).toEqual(mockTransactions);
    expect(state.loading).toBe(false);
    expect(state.error).toBe(null);
  });

  it('sets loading state during fetch', async () => {
    vi.mocked(transactionService.loadTransactions).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve([]), 100))
    );

    const { loadTransactions } = useTransactionsStore.getState();
    const promise = loadTransactions();

    const loadingState = useTransactionsStore.getState();
    expect(loadingState.loading).toBe(true);

    await promise;

    const finalState = useTransactionsStore.getState();
    expect(finalState.loading).toBe(false);
  });

  it('handles errors gracefully', async () => {
    const errorMessage = 'Failed to load transactions';
    vi.mocked(transactionService.loadTransactions).mockRejectedValue(
      new Error(errorMessage)
    );

    const { loadTransactions } = useTransactionsStore.getState();
    await loadTransactions();

    const state = useTransactionsStore.getState();
    expect(state.transactions).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBe(errorMessage);
  });

  it('handles non-Error rejections', async () => {
    vi.mocked(transactionService.loadTransactions).mockRejectedValue('String error');

    const { loadTransactions } = useTransactionsStore.getState();
    await loadTransactions();

    const state = useTransactionsStore.getState();
    expect(state.error).toBe('Failed to load transactions');
  });
});
