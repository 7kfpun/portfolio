import styled from 'styled-components';
import { Navigation } from './components/Navigation';
import { DashboardPage } from './pages/DashboardPage';
import { ReportPage } from './pages/ReportPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { KeySettingsPage } from './pages/KeySettingsPage';
import { DataReadinessPage } from './pages/DataReadinessPage';
import { CurrencyDataPage } from './pages/CurrencyDataPage';
import { NavManagementPage } from './pages/NavManagementPage';
import { StockDetailPage } from './pages/StockDetailPage';
import { useNavigationStore } from './store/navigationStore';

const Screen = styled.main`
  min-height: 100vh;
  background: radial-gradient(circle at top, #ede9fe 0%, #f8fafc 60%);
  color: #0f172a;
  display: flex;
`;

const SidebarContainer = styled.div`
  width: 250px;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 200px;
  }
`;

const Content = styled.div`
  flex: 1;
  padding: 1rem;
  padding-bottom: 2rem;

  @media (max-width: 768px) {
    padding: 0.75rem;
    padding-bottom: 1.5rem;
  }
`;

function App() {
  const { currentPage, reportSubPage, setCurrentPage, setReportSubPage } = useNavigationStore();

  return (
    <Screen>
      {currentPage !== 'stock-detail' && (
        <SidebarContainer>
          <Navigation
            currentPage={currentPage}
            reportSubPage={reportSubPage}
            onNavigate={setCurrentPage}
            onReportSubNavigate={setReportSubPage}
          />
        </SidebarContainer>
      )}
      <Content>
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'report' && <ReportPage />}
        {currentPage === 'transactions' && <TransactionsPage />}
        {currentPage === 'settings-keys' && <KeySettingsPage />}
        {currentPage === 'settings-data-readiness' && <DataReadinessPage />}
        {currentPage === 'settings-currency-data' && <CurrencyDataPage />}
        {currentPage === 'settings-navs' && <NavManagementPage />}
        {currentPage === 'stock-detail' && <StockDetailPage />}
      </Content>
    </Screen>
  );
}

export default App;
