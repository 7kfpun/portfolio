import { create } from 'zustand';
import { Transaction } from '../types/Transaction';
import { transactionService } from '../services/transactionService';

interface TransactionsState {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  loadTransactions: () => Promise<void>;
}

export const useTransactionsStore = create<TransactionsState>((set) => ({
  transactions: [],
  loading: false,
  error: null,

  loadTransactions: async () => {
    set({ loading: true, error: null });
    try {
      const data = await transactionService.loadTransactions();
      set({ transactions: data, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load transactions',
        loading: false,
      });
    }
  },
}));
