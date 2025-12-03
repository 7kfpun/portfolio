import styled from 'styled-components';
import { PieChart, List, Settings, Calendar } from 'lucide-react';
import { PageType } from '../store/navigationStore';

const Nav = styled.nav`
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(24px);
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
  padding: 1rem 2rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
    margin-bottom: 1.5rem;
  }
`;

const NavContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Brand = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }

  @media (max-width: 480px) {
    font-size: 1rem;
  }
`;

const NavLinks = styled.div`
  display: flex;
  gap: 0.5rem;

  @media (max-width: 768px) {
    gap: 0.35rem;
  }
`;

const NavButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
  background: ${props => (props.$active ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent')};
  color: ${props => (props.$active ? 'white' : '#64748b')};

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
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
    gap: 0.4rem;

    svg {
      width: 16px;
      height: 16px;
    }
  }

  @media (max-width: 480px) {
    padding: 0.5rem 0.6rem;
    font-size: 0;

    svg {
      width: 18px;
      height: 18px;
      margin: 0;
    }
  }
`;

interface NavigationProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

export function Navigation({ currentPage, onNavigate }: NavigationProps) {
  return (
    <Nav>
      <NavContainer>
        <Brand>Portfolio Manager</Brand>
        <NavLinks>
          <NavButton
            $active={currentPage === 'portfolio'}
            onClick={() => onNavigate('portfolio')}
          >
            <PieChart size={18} />
            Portfolio
          </NavButton>
          <NavButton
            $active={currentPage === 'transactions'}
            onClick={() => onNavigate('transactions')}
          >
            <List size={18} />
            Transactions
          </NavButton>
          <NavButton
            $active={currentPage === 'heatmap'}
            onClick={() => onNavigate('heatmap')}
          >
            <Calendar size={18} />
            Heatmap
          </NavButton>
          <NavButton
            $active={currentPage === 'settings'}
            onClick={() => onNavigate('settings')}
          >
            <Settings size={18} />
            Settings
          </NavButton>
        </NavLinks>
      </NavContainer>
    </Nav>
  );
}
