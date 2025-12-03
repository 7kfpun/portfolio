import { create } from 'zustand';
import { CurrencyType } from '../types/Settings';

interface CurrencyState {
  baseCurrency: CurrencyType;
  setBaseCurrency: (currency: CurrencyType) => void;
}

export const useCurrencyStore = create<CurrencyState>((set) => ({
  baseCurrency: 'USD',
  setBaseCurrency: (currency) => set({ baseCurrency: currency }),
}));
