import { ReactNode } from 'react';
import styled from 'styled-components';
import { Key, Database } from 'lucide-react';

const LayoutContainer = styled.div`
  display: flex;
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const Sidebar = styled.nav`
  width: 220px;
  flex-shrink: 0;
`;

const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
`;

const NavItem = styled.li<{ $active: boolean }>`
  margin: 0;
  border-bottom: 1px solid #e2e8f0;

  &:last-child {
    border-bottom: none;
  }
`;

const NavButton = styled.button<{ $active: boolean }>`
  width: 100%;
  padding: 1rem 1.25rem;
  border: none;
  background: ${props => props.$active ? '#f1f5f9' : 'white'};
  color: ${props => props.$active ? '#667eea' : '#64748b'};
  font-size: 0.95rem;
  font-weight: ${props => props.$active ? '600' : '500'};
  text-align: left;
  cursor: pointer;
  transition: all 150ms ease;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  &:hover {
    background: #f8fafc;
    color: #667eea;
  }

  &:focus-visible {
    outline: 2px solid rgba(102, 126, 234, 0.6);
    outline-offset: -2px;
  }
`;

const Content = styled.main`
  flex: 1;
  min-width: 0;
`;

interface SettingsLayoutProps {
  currentPage: 'keys' | 'data-readiness';
  onNavigate: (page: 'keys' | 'data-readiness') => void;
  children: ReactNode;
}

export function SettingsLayout({ currentPage, onNavigate, children }: SettingsLayoutProps) {
  return (
    <LayoutContainer>
      <Sidebar>
        <NavList>
          <NavItem $active={currentPage === 'keys'}>
            <NavButton
              $active={currentPage === 'keys'}
              onClick={() => onNavigate('keys')}
            >
              <Key size={18} />
              API Keys
            </NavButton>
          </NavItem>
          <NavItem $active={currentPage === 'data-readiness'}>
            <NavButton
              $active={currentPage === 'data-readiness'}
              onClick={() => onNavigate('data-readiness')}
            >
              <Database size={18} />
              Data Readiness
            </NavButton>
          </NavItem>
        </NavList>
      </Sidebar>
      <Content>{children}</Content>
    </LayoutContainer>
  );
}
