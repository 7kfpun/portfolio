import { create } from 'zustand';

export type PageType = 'portfolio' | 'transactions' | 'heatmap' | 'settings' | 'stock-detail';

interface NavigationState {
  currentPage: PageType;
  selectedStock: string | null;
  setCurrentPage: (page: PageType, stock?: string) => void;
  goBackToPortfolio: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: 'portfolio',
  selectedStock: null,
  setCurrentPage: (page, stock) => set({ currentPage: page, selectedStock: stock || null }),
  goBackToPortfolio: () => set({ currentPage: 'portfolio', selectedStock: null }),
}));
