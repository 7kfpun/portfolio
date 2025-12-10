import React, { ReactNode } from 'react';
import styled from 'styled-components';

interface MetricItem {
    label: string;
    value: ReactNode;
    helpText?: string;
    valueColor?: string;
}

interface MetricCardProps {
    title: string;
    metrics: MetricItem[];
}

const CardContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
`;

const CardHeader = styled.div`
  padding: 16px 20px;
  font-weight: 600;
  color: #0f172a;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
`;

const MetricList = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid #e2e8f0;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f8fafc;
  }
`;

const MetricLabel = styled.div`
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MetricValue = styled.div<{ $color?: string }>`
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.$color || '#0f172a'};
  text-align: right;
`;

const HelpIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  cursor: help;
  
  &:hover {
    color: #64748b;
  }
`;

export function MetricCard({ title, metrics }: MetricCardProps) {
    return (
        <CardContainer>
            <CardHeader>{title}</CardHeader>
            <MetricList>
                {metrics.map((metric, index) => (
                    <MetricRow key={index}>
                        <MetricLabel>
                            {metric.label}
                            {metric.helpText && (
                                <HelpIcon title={metric.helpText}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                </HelpIcon>
                            )}
                        </MetricLabel>
                        <MetricValue $color={metric.valueColor}>
                            {metric.value}
                        </MetricValue>
                    </MetricRow>
                ))}
            </MetricList>
        </CardContainer>
    );
}
