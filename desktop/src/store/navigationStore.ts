import { create } from 'zustand';

export type PageType = 'portfolio' | 'transactions' | 'heatmap' | 'settings';

interface NavigationState {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: 'portfolio',
  setCurrentPage: (page) => set({ currentPage: page }),
}));
