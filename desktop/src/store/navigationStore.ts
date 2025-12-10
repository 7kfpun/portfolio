import { create } from 'zustand';

export type PageType = 'dashboard' | 'report' | 'transactions' | 'settings' | 'stock-detail'
  | 'settings-keys' | 'settings-data-readiness' | 'settings-currency-data' | 'settings-navs';

export type ReportSubPage = 'positions' | 'heatmaps';

interface NavigationState {
  currentPage: PageType;
  reportSubPage: ReportSubPage;
  selectedStock: string | null;
  setCurrentPage: (page: PageType, stock?: string) => void;
  setReportSubPage: (subPage: ReportSubPage) => void;
  goBackToDashboard: () => void;
  goBackToPortfolio: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: 'dashboard',
  reportSubPage: 'positions',
  selectedStock: null,
  setCurrentPage: (page, stock) => set({ currentPage: page, selectedStock: stock || null }),
  setReportSubPage: (subPage) => set({ reportSubPage: subPage }),
  goBackToDashboard: () => set({ currentPage: 'dashboard', selectedStock: null }),
  goBackToPortfolio: () => set({ currentPage: 'dashboard', selectedStock: null }),
}));
