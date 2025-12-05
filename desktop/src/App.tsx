import styled from 'styled-components';
import { Navigation } from './components/Navigation';
import { PortfolioPage } from './pages/PortfolioPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { HeatmapPage } from './pages/HeatmapPage';
import { SettingsPage } from './pages/SettingsPage';
import { StockDetailPage } from './pages/StockDetailPage';
import { useNavigationStore } from './store/navigationStore';

const Screen = styled.main`
  min-height: 100vh;
  background: radial-gradient(circle at top, #ede9fe 0%, #f8fafc 60%);
  color: #0f172a;
`;

const Content = styled.div`
  padding: 2rem;
  padding-bottom: 4rem;
`;

function App() {
  const { currentPage, setCurrentPage } = useNavigationStore();

  return (
    <Screen>
      {currentPage !== 'stock-detail' && <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />}
      <Content>
        {currentPage === 'portfolio' && <PortfolioPage />}
        {currentPage === 'transactions' && <TransactionsPage />}
        {currentPage === 'heatmap' && <HeatmapPage />}
        {currentPage === 'settings' && <SettingsPage />}
        {currentPage === 'stock-detail' && <StockDetailPage />}
      </Content>
    </Screen>
  );
}

export default App;
