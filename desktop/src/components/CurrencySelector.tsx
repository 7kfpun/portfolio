import styled from 'styled-components';
import { CurrencyType } from '../types/Settings';
import { CURRENCIES } from '../config/currencies';
import { DollarSign } from 'lucide-react';

const SelectorContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Label = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  @media (max-width: 768px) {
    display: none;
  }
`;

const Select = styled.select`
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24'%3E%3Cpath fill='%2364748b' d='m12 15l-5-5h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  transition: all 150ms ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
  }

  &:hover {
    border-color: #cbd5e1;
  }

  @media (max-width: 768px) {
    font-size: 0.85rem;
    padding: 0.45rem 1.75rem 0.45rem 0.65rem;
  }
`;

interface CurrencySelectorProps {
  value: CurrencyType;
  onChange: (currency: CurrencyType) => void;
  showIcon?: boolean;
}

export function CurrencySelector({ value, onChange, showIcon = true }: CurrencySelectorProps) {
  return (
    <SelectorContainer>
      {showIcon && <DollarSign size={18} color="#667eea" />}
      <Label>Currency:</Label>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as CurrencyType)}
      >
        {CURRENCIES.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {currency.symbol} {currency.code}
          </option>
        ))}
      </Select>
    </SelectorContainer>
  );
}
