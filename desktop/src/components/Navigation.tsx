import styled from 'styled-components';
import { PieChart, List, Settings, BarChart3, FileText, Key, Database, DollarSign, TrendingUp } from 'lucide-react';
import { PageType, ReportSubPage } from '../store/navigationStore';

const Sidebar = styled.nav`
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 250px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(24px);
  border-right: 1px solid rgba(102, 126, 234, 0.1);
  padding: 2rem 1rem;
  display: flex;
  flex-direction: column;
  z-index: 100;

  @media (max-width: 768px) {
    width: 200px;
    padding: 1.5rem 0.75rem;
  }
`;

const Brand = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 2rem;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 1.1rem;
    margin-bottom: 1.5rem;
  }
`;

const NavLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const NavButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
  background: ${props => (props.$active ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent')};
  color: ${props => (props.$active ? 'white' : '#64748b')};
  text-align: left;
  width: 100%;

  &:hover {
    background: ${props =>
    props.$active ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'rgba(102, 126, 234, 0.1)'};
    color: ${props => (props.$active ? 'white' : '#475569')};
  }

  &:focus-visible {
    outline: 2px solid rgba(102, 126, 234, 0.6);
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    padding: 0.6rem 0.75rem;
    font-size: 0.85rem;
    gap: 0.5rem;

    svg {
      width: 16px;
      height: 16px;
    }
  }
`;

const SubNavLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-left: 2rem;
  margin-top: 0.5rem;
`;

const SubNavButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
  background: ${props => (props.$active ? 'rgba(102, 126, 234, 0.2)' : 'transparent')};
  color: ${props => (props.$active ? '#667eea' : '#64748b')};
  text-align: left;
  width: 100%;

  &:hover {
    background: ${props =>
    props.$active ? 'rgba(102, 126, 234, 0.2)' : 'rgba(102, 126, 234, 0.1)'};
    color: ${props => (props.$active ? '#667eea' : '#475569')};
  }

  @media (max-width: 768px) {
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
    gap: 0.4rem;
  }
`;

interface NavigationProps {
  currentPage: PageType;
  reportSubPage: ReportSubPage;
  onNavigate: (page: PageType) => void;
  onReportSubNavigate: (subPage: ReportSubPage) => void;
}

export function Navigation({ currentPage, reportSubPage, onNavigate, onReportSubNavigate }: NavigationProps) {
  const handleSubNavClick = (subPage: ReportSubPage) => {
    // First navigate to report page if not already there
    if (currentPage !== 'report') {
      onNavigate('report');
    }
    // Then set the sub-page
    onReportSubNavigate(subPage);
  };

  return (
    <Sidebar>
      <Brand>Portfolio Manager</Brand>
      <NavLinks>
        <NavButton
          $active={currentPage === 'dashboard'}
          onClick={() => onNavigate('dashboard')}
        >
          <PieChart size={18} />
          Dashboard
        </NavButton>
        <NavButton
          $active={currentPage === 'transactions'}
          onClick={() => onNavigate('transactions')}
        >
          <List size={18} />
          All Transactions
        </NavButton>
        <NavButton
          $active={currentPage === 'report'}
          onClick={() => onNavigate('report')}
        >
          <FileText size={18} />
          Reports
        </NavButton>
        <SubNavLinks>
          <SubNavButton
            $active={reportSubPage === 'positions'}
            onClick={() => handleSubNavClick('positions')}
          >
            <List size={16} />
            Positions
          </SubNavButton>
          <SubNavButton
            $active={reportSubPage === 'heatmaps'}
            onClick={() => handleSubNavClick('heatmaps')}
          >
            <BarChart3 size={16} />
            Heatmaps
          </SubNavButton>
        </SubNavLinks>
        <NavButton
          $active={currentPage === 'settings' || currentPage.startsWith('settings-')}
          onClick={() => onNavigate('settings-keys')}
        >
          <Settings size={18} />
          Settings
        </NavButton>
        <SubNavLinks>
          <SubNavButton
            $active={currentPage === 'settings-keys'}
            onClick={() => onNavigate('settings-keys')}
          >
            <Key size={16} />
            API Keys
          </SubNavButton>
          <SubNavButton
            $active={currentPage === 'settings-data-readiness'}
            onClick={() => onNavigate('settings-data-readiness')}
          >
            <Database size={16} />
            Data Readiness
          </SubNavButton>
          <SubNavButton
            $active={currentPage === 'settings-currency-data'}
            onClick={() => onNavigate('settings-currency-data')}
          >
            <DollarSign size={16} />
            Currency Data
          </SubNavButton>
          <SubNavButton
            $active={currentPage === 'settings-navs'}
            onClick={() => onNavigate('settings-navs')}
          >
            <TrendingUp size={16} />
            NAV Management
          </SubNavButton>
        </SubNavLinks>
      </NavLinks>
    </Sidebar>
  );
}
