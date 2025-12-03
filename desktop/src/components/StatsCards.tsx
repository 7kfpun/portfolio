import styled from 'styled-components';
import { ReactNode } from 'react';

export const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`;

export const StatCard = styled.div<{ $variant?: 'positive' | 'negative' | 'neutral' }>`
  padding: 1.5rem;
  background: ${props => {
    if (props.$variant === 'positive') return 'linear-gradient(135deg, rgba(22, 163, 74, 0.1) 0%, rgba(34, 197, 94, 0.1) 100%)';
    if (props.$variant === 'negative') return 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(239, 68, 68, 0.1) 100%)';
    return 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)';
  }};
  border-radius: 12px;
  border: 1px solid ${props => {
    if (props.$variant === 'positive') return 'rgba(22, 163, 74, 0.3)';
    if (props.$variant === 'negative') return 'rgba(220, 38, 38, 0.3)';
    return 'rgba(102, 126, 234, 0.2)';
  }};

  @media (max-width: 768px) {
    padding: 1.25rem;
  }
`;

export const StatHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`;

export const StatLabel = styled.div`
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export const StatValue = styled.div<{ $color?: string }>`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${props => props.$color || '#0f172a'};

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

interface StatCardComponentProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  variant?: 'positive' | 'negative' | 'neutral';
  valueColor?: string;
}

export function StatCardComponent({ icon, label, value, variant, valueColor }: StatCardComponentProps) {
  return (
    <StatCard $variant={variant}>
      <StatHeader>
        {icon}
        <StatLabel>{label}</StatLabel>
      </StatHeader>
      <StatValue $color={valueColor}>{value}</StatValue>
    </StatCard>
  );
}
