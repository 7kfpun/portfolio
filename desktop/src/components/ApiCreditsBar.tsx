import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { fxRateService } from '../services/fxRateService';
import { ApiCredits } from '../types/ApiCredits';

const Container = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
`;

const Section = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Label = styled.span`
  font-weight: 500;
  opacity: 0.9;
`;

const Value = styled.span`
  font-weight: 700;
  font-size: 1rem;
`;

const ProgressBarContainer = styled.div`
  flex: 1;
  max-width: 300px;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  margin: 0 1rem;
`;

const ProgressBar = styled.div<{ percentage: number }>`
  height: 100%;
  width: ${props => props.percentage}%;
  background: ${props =>
    props.percentage > 50 ? '#10b981' :
    props.percentage > 25 ? '#f59e0b' :
    '#ef4444'
  };
  transition: all 0.3s ease;
`;

const UpdateTime = styled.span`
  opacity: 0.7;
  font-size: 0.75rem;
`;

export function ApiCreditsBar() {
  const [credits, setCredits] = useState<ApiCredits>({
    used: 0,
    remaining: 0,
    total: 0,
    lastUpdated: new Date().toISOString(),
  });

  useEffect(() => {
    // Initialize with current values
    const fxCredits = fxRateService.getApiCredits();

    if (fxCredits.total > 0) {
      setCredits(fxCredits);
    }

    // Subscribe to updates from FX rate service
    const unsubscribeFx = fxRateService.onCreditsUpdate(newCredits => {
      setCredits(newCredits);
    });

    return () => {
      unsubscribeFx();
    };
  }, []);

  if (credits.total === 0) {
    return null;
  }

  const percentage = (credits.remaining / credits.total) * 100;
  const lastUpdateDate = new Date(credits.lastUpdated);
  const timeAgo = getTimeAgo(lastUpdateDate);

  return (
    <Container>
      <Section>
        <Label>API Credits:</Label>
        <Value>{credits.remaining.toLocaleString()}</Value>
        <Label>/ {credits.total.toLocaleString()}</Label>
      </Section>

      <Section>
        <Label>Remaining</Label>
        <ProgressBarContainer>
          <ProgressBar percentage={percentage} />
        </ProgressBarContainer>
        <Value>{percentage.toFixed(1)}%</Value>
      </Section>

      <Section>
        <Label>Used:</Label>
        <Value>{credits.used.toLocaleString()}</Value>
        <UpdateTime>• Updated {timeAgo}</UpdateTime>
      </Section>
    </Container>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
