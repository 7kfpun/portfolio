import styled from 'styled-components';
import { Eye, EyeOff } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { CurrencySelector } from './CurrencySelector';

export const PageContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

export const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1rem;

  @media (min-width: 768px) {
    padding: 0;
  }
`;

export const Header = styled.div`
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    margin-bottom: 0.75rem;
  }
`;

export const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

export const HeaderLeft = styled.div``;

export const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

export const Meta = styled.p`
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  color: #64748b;
  margin-bottom: 0.5rem;

  @media (max-width: 768px) {
    font-size: 0.7rem;
    letter-spacing: 0.2em;
  }
`;

export const Title = styled.h1`
  margin: 0 0 0.5rem 0;
  font-size: clamp(1.75rem, 4vw, 3rem);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

export const Description = styled.p`
  color: #475569;
  margin: 0;
  font-size: clamp(0.95rem, 2vw, 1.1rem);
  line-height: 1.5;
`;

export const Card = styled.div`
  border-radius: 12px;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(102, 126, 234, 0.1);
  margin-bottom: 1.25rem;

  @media (max-width: 768px) {
    padding: 1rem;
    margin-bottom: 1rem;
  }
`;

export const LoadingText = styled.p`
  text-align: center;
  color: #64748b;
  font-size: 1.1rem;
  padding: 3rem;

  @media (max-width: 768px) {
    font-size: 1rem;
    padding: 2rem 1rem;
  }
`;

export const ErrorText = styled.p`
  text-align: center;
  color: #dc2626;
  font-size: 1.1rem;
  padding: 3rem;
  background: #fee2e2;
  border-radius: 12px;

  @media (max-width: 768px) {
    font-size: 1rem;
    padding: 2rem 1rem;
  }
`;

export const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'ghost' }>`
  padding: 0.625rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 150ms ease;
  border: 1px solid ${props => {
    switch (props.$variant) {
      case 'primary':
        return '#4f46e5';
      case 'secondary':
        return '#10b981';
      case 'ghost':
      default:
        return '#e2e8f0';
    }
  }};
  background: ${props => {
    switch (props.$variant) {
      case 'primary':
        return '#4f46e5';
      case 'secondary':
        return '#10b981';
      case 'ghost':
      default:
        return 'white';
    }
  }};
  color: ${props => (props.$variant === 'primary' || props.$variant === 'secondary' ? 'white' : '#111827')};

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: ${props => {
    switch (props.$variant) {
      case 'primary':
        return '#4338ca';
      case 'secondary':
        return '#059669';
      case 'ghost':
      default:
        return '#f8fafc';
    }
  }};
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

export const SmallButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'ghost'; $loading?: boolean }>`
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.75rem;
  cursor: ${props => (props.$loading ? 'wait' : 'pointer')};
  transition: all 120ms ease;
  border: 1px solid ${props => {
    switch (props.$variant) {
      case 'primary':
        return '#cbd5f5';
      case 'secondary':
        return '#a7f3d0';
      case 'ghost':
      default:
        return '#e2e8f0';
    }
  }};
  background: ${props => {
    if (props.$loading) {
      return props.$variant === 'primary' ? '#e0e7ff' : '#d1fae5';
    }
    switch (props.$variant) {
      case 'primary':
        return '#eef2ff';
      case 'secondary':
        return '#d1fae5';
      case 'ghost':
      default:
        return 'white';
    }
  }};
  color: ${props => {
    switch (props.$variant) {
      case 'primary':
        return '#4338ca';
      case 'secondary':
        return '#047857';
      case 'ghost':
      default:
        return '#64748b';
    }
  }};

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: ${props => {
    switch (props.$variant) {
      case 'primary':
        return '#e0e7ff';
      case 'secondary':
        return '#a7f3d0';
      case 'ghost':
      default:
        return '#f1f5f9';
    }
  }};
  }
`;

export const PrivacyToggleButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  background: ${props => (props.$active ? 'rgba(102, 126, 234, 0.1)' : 'transparent')};
  color: ${props => (props.$active ? '#667eea' : '#64748b')};
  cursor: pointer;
  transition: all 120ms ease;

  &:hover {
    background: rgba(102, 126, 234, 0.1);
    border-color: rgba(102, 126, 234, 0.5);
  }

  @media (max-width: 768px) {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }
`;

// Component that combines Currency Selector and Privacy Toggle
export function PageHeaderControls() {
  const { baseCurrency, setBaseCurrency, privacyMode, togglePrivacyMode } = useSettingsStore();

  return (
    <>
      <CurrencySelector value={baseCurrency} onChange={setBaseCurrency} />
      <PrivacyToggleButton
        type="button"
        onClick={togglePrivacyMode}
        $active={privacyMode}
        aria-pressed={privacyMode}
      >
        {privacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
        Privacy {privacyMode ? 'On' : 'Off'}
      </PrivacyToggleButton>
    </>
  );
}
