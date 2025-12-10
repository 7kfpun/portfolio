import { useEffect, useMemo, useState, useCallback } from 'react';
import styled from 'styled-components';
import { usePortfolioStore } from '../store/portfolioStore';
import { useTransactionsStore } from '../store/transactionsStore';
import { useSettingsStore } from '../store/settingsStore';
import { Position } from '../types/Portfolio';
import { CurrencyType } from '../types/Settings';
import { CurrencySelector } from '../components/CurrencySelector';
import { MetricCard } from '../components/MetricCard';
import { PageContainer, Header, HeaderRow, Meta, Title, Description, HeaderLeft, HeaderRight, PageHeaderControls } from '../components/PageLayout';
import {
    Activity,
    TrendingUp,
    TrendingDown,
    DollarSign,
    PieChart,
    BarChart3,
    SlidersHorizontal,
} from 'lucide-react';
import { priceDataService } from '../services/priceDataService';
import { CURRENCY_SYMBOLS, getCurrencyColor } from '../config/currencies';

const RefreshButton = styled.button<{ $loading?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease;

  svg {
    animation: ${props => (props.$loading ? 'spin 1s linear infinite' : 'none')};
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  }

  @media (max-width: 768px) {
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
  }
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`;

const StatCard = styled.div<{ $variant?: 'positive' | 'negative' | 'neutral' }>`
  padding: 1rem;
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
    padding: 0.875rem;
  }
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatValue = styled.div<{ $color?: string }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.$color || '#0f172a'};
  margin-bottom: 0.25rem;

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const StatMetaValue = styled.div<{ $color?: string }>`
  font-size: 0.8rem;
  color: ${props => props.$color || '#64748b'};
  font-weight: 500;
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(102, 126, 234, 0.1);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.25rem;

  @media (max-width: 768px) {
    padding: 1rem;
    margin-bottom: 1rem;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: #667eea;
  }

  @media (max-width: 768px) {
    font-size: 1.1rem;
    margin-bottom: 0.875rem;
  }
`;

const CurrencyBreakdown = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0.75rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const CurrencyBadge = styled.span<{ $color: string }>`
  background: ${props => props.$color};
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
`;

const GainLoss = styled.span<{ $positive: boolean }>`
  color: ${props => (props.$positive ? '#16a34a' : '#dc2626')};
  font-weight: 600;
`;

const GainSubValue = styled.span`
  font-size: 0.8rem;
  opacity: 0.7;
  margin-left: 0.25rem;
`;

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.25rem;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ChartContent = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const DonutChart = styled.div<{ $gradient: string }>`
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: ${props => (props.$gradient ? `conic-gradient(${props.$gradient})` : '#e2e8f0')};
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: 32px;
    border-radius: 50%;
    background: white;
  }
`;

const ChartLegend = styled.div`
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ChartLegendItem = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.5rem;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

const LegendBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #0f172a;

  &::before {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${props => props.$color};
    box-shadow: 0 0 0 3px ${props => `${props.$color}22`};
  }
`;

const LegendValue = styled.span`
  font-weight: 600;
  color: #0f172a;
`;

const LegendMetric = styled.div`
  text-align: right;
  min-width: 140px;
`;

const LegendPercent = styled.span`
  font-size: 0.78rem;
  color: #94a3b8;
  letter-spacing: 0.04em;
  display: block;
  margin-top: 0.1rem;
`;

const LegendSubValue = styled.div`
  font-size: 0.78rem;
  color: #94a3b8;
  font-weight: 500;
  margin-top: 0.1rem;
`;

const LoadingText = styled.p`
  color: #94a3b8;
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem;
`;

export function DashboardPage() {
    const { positions, summary, loadPositions } = usePortfolioStore();
    const { transactions, loadTransactions } = useTransactionsStore();
    const { baseCurrency, setBaseCurrency, privacyMode } = useSettingsStore();

    const [isLoading, setIsLoading] = useState(false);
    const [dailyMovers, setDailyMovers] = useState<Array<{
        stock: string;
        currency: string;
        dailyChange: number;
        dailyChangePercent: number;
        currentValue: number;
    }>>([]);

    const handleBaseCurrencyChange = useCallback((currency: CurrencyType) => {
        setBaseCurrency(currency);
    }, [setBaseCurrency]);

    const handleRefresh = useCallback(async () => {
        setIsLoading(true);
        try {
            await loadPositions();
            await loadTransactions();
        } catch (error) {
            console.error('Failed to refresh data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [loadPositions, loadTransactions]);

    useEffect(() => {
        handleRefresh();
    }, []);

    const displayCurrencyValue = useCallback((value: number, currency: string) => {
        if (privacyMode) return '•••••';
        const symbol = CURRENCY_SYMBOLS[currency as CurrencyType] || currency;
        return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [privacyMode]);

    const formatSignedCurrency = useCallback((value: number, currency: string) => {
        if (privacyMode) return '•••••';
        const symbol = CURRENCY_SYMBOLS[currency as CurrencyType] || currency;
        const sign = value >= 0 ? '+' : '';
        return `${sign}${symbol}${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [privacyMode]);

    const convertToBaseCurrency = useCallback((amount: number, fromCurrency: string, toCurrency: string) => {
        // Simplified conversion - in real app, use actual FX rates
        if (fromCurrency === toCurrency) return amount;
        // For demo, assume 1 USD = 30 TWD, 150 JPY, 7.8 HKD
        const rates: Record<string, number> = {
            USD: 1,
            TWD: 30,
            JPY: 150,
            HKD: 7.8,
        };
        const usdAmount = amount / (rates[fromCurrency] || 1);
        return usdAmount * (rates[toCurrency] || 1);
    }, []);

    const totalsInBaseCurrency = useMemo(() => {
        if (!summary) return { totalValue: 0, totalCost: 0, totalGainLoss: 0 };
        const totalValue = summary.byCurrency[baseCurrency]?.value || 0;
        const totalCost = summary.byCurrency[baseCurrency]?.cost || 0;
        const totalGainLoss = summary.byCurrency[baseCurrency]?.gainLoss || 0;
        return { totalValue, totalCost, totalGainLoss };
    }, [summary, baseCurrency]);

    const gainLossVariant = (summary?.totalGainLoss ?? 0) >= 0 ? 'positive' : 'negative';
    const dailyGainLossVariant = (summary?.dailyGainLoss || 0) >= 0 ? 'positive' : 'negative';

    const dailyPortfolioGainLossBase = useMemo(() => {
        if (!summary?.dailyGainLoss) return null;
        return convertToBaseCurrency(summary.dailyGainLoss, 'USD', baseCurrency);
    }, [summary?.dailyGainLoss, baseCurrency, convertToBaseCurrency]);

    const dailyPortfolioGainLossPercent = useMemo(() => {
        if (!summary?.dailyGainLoss || !totalsInBaseCurrency.totalValue) return null;
        const previousValue = totalsInBaseCurrency.totalValue - summary.dailyGainLoss;
        return (summary.dailyGainLoss / previousValue) * 100;
    }, [summary?.dailyGainLoss, totalsInBaseCurrency.totalValue]);

    const dailyPortfolioGainLossUSD = summary?.dailyGainLoss;

    const allocationData = useMemo(() => {
        if (!summary) return [];

        const currencyValues = Object.entries(summary.byCurrency).map(([currency, data]) => {
            const valueInBase = convertToBaseCurrency(data.value, currency, baseCurrency);
            return {
                currency,
                originalValue: data.value,
                valueInBase,
            };
        });

        const totalValueBase = currencyValues.reduce((sum, item) => sum + item.valueInBase, 0);

        return currencyValues.map(item => ({
            currency: item.currency,
            value: item.originalValue,
            valueInBase: item.valueInBase,
            percent: totalValueBase > 0 ? (item.valueInBase / totalValueBase) * 100 : 0,
        }));
    }, [summary, baseCurrency, convertToBaseCurrency]);

    const allocationGradient = useMemo(() => {
        if (allocationData.length === 0) {
            return '';
        }

        let start = 0;
        const segments = allocationData.map(item => {
            const end = start + item.percent;
            const segment = `${getCurrencyColor(item.currency)} ${start}% ${end}%`;
            start = end;
            return segment;
        });

        return segments.join(', ');
    }, [allocationData]);

    type PositionWithBase = Position & { baseValue: number };

    const topPositions = useMemo<PositionWithBase[]>(() => {
        const withBase = positions.map(position => {
            const baseValue = convertToBaseCurrency(
                position.currentValue ?? position.totalCost,
                position.currency,
                baseCurrency
            );
            return { ...position, baseValue } as PositionWithBase;
        });

        return withBase
            .sort((a, b) => b.baseValue - a.baseValue)
            .slice(0, 5);
    }, [positions, baseCurrency, convertToBaseCurrency]);

    const topPositionsMetrics = useMemo(() => {
        if (topPositions.length === 0) return [];

        return topPositions.map(position => {
            const localValue = position.currentValue ?? position.totalCost;
            const gainLoss = position.gainLoss ?? 0;
            const gainLossPercent = position.gainLossPercent ?? 0;

            return {
                label: position.stock,
                value: privacyMode ? (
                    '***'
                ) : position.currency !== baseCurrency ? (
                    <>
                        {displayCurrencyValue(localValue, position.currency)}
                        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginTop: '4px' }}>
                            {displayCurrencyValue(position.baseValue, baseCurrency)}
                        </div>
                    </>
                ) : (
                    displayCurrencyValue(localValue, position.currency)
                ),
                valueColor: gainLoss >= 0 ? '#10b981' : '#ef4444',
                helpText: position.gainLoss !== undefined ? (
                    `${formatSignedCurrency(gainLoss, position.currency)} (${gainLoss >= 0 ? '+' : ''}${gainLossPercent.toFixed(2)}%)`
                ) : undefined,
            };
        });
    }, [topPositions, baseCurrency, privacyMode, displayCurrencyValue, formatSignedCurrency]);

    const dailyMoversMetrics = useMemo(() => {
        if (dailyMovers.length === 0) return [];

        return dailyMovers.map(mover => ({
            label: mover.stock,
            value: privacyMode ? '***' : `${mover.dailyChangePercent >= 0 ? '+' : ''}${mover.dailyChangePercent.toFixed(2)}%`,
            valueColor: mover.dailyChangePercent >= 0 ? '#10b981' : '#ef4444',
            helpText: formatSignedCurrency(mover.dailyChange, mover.currency),
        }));
    }, [dailyMovers, privacyMode, formatSignedCurrency]);

    return (
        <PageContainer>
            <Header>
                <HeaderRow>
                    <HeaderLeft>
                        <Meta>Dashboard</Meta>
                        <Title>My Portfolio</Title>
                        <Description>
                            {positions.length} position{positions.length !== 1 ? 's' : ''} across{' '}
                            {summary ? Object.keys(summary.byCurrency).length : 0} currenc
                            {summary ? (Object.keys(summary.byCurrency).length !== 1 ? 'ies' : 'y') : 'y'}
                        </Description>
                    </HeaderLeft>
                    <HeaderRight>
                        <PageHeaderControls />
                        <RefreshButton onClick={handleRefresh} disabled={isLoading} $loading={isLoading}>
                            <SlidersHorizontal size={16} />
                            Refresh
                        </RefreshButton>
                    </HeaderRight>
                </HeaderRow>
            </Header>

            <Stats>
                <StatCard>
                    <StatHeader>
                        <DollarSign size={20} color="#667eea" />
                        <StatLabel>Total Value ({baseCurrency})</StatLabel>
                    </StatHeader>
                    <StatValue>
                        {displayCurrencyValue(totalsInBaseCurrency.totalValue, baseCurrency)}
                    </StatValue>
                </StatCard>

                <StatCard>
                    <StatHeader>
                        <PieChart size={20} color="#667eea" />
                        <StatLabel>Total Cost ({baseCurrency})</StatLabel>
                    </StatHeader>
                    <StatValue>
                        {displayCurrencyValue(totalsInBaseCurrency.totalCost, baseCurrency)}
                    </StatValue>
                </StatCard>

                <StatCard $variant={gainLossVariant}>
                    <StatHeader>
                        {(summary?.totalGainLoss ?? 0) >= 0 ? (
                            <TrendingUp size={20} color="#16a34a" />
                        ) : (
                            <TrendingDown size={20} color="#dc2626" />
                        )}
                        <StatLabel>Total Gain/Loss ({baseCurrency})</StatLabel>
                    </StatHeader>
                    <StatValue $color={(summary?.totalGainLoss ?? 0) >= 0 ? '#16a34a' : '#dc2626'}>
                        {formatSignedCurrency(totalsInBaseCurrency.totalGainLoss, baseCurrency)}
                        {' ('}
                        {(summary?.totalGainLoss ?? 0) >= 0 ? '+' : ''}
                        {(summary?.totalGainLossPercent ?? 0).toFixed(2)}%)
                    </StatValue>
                </StatCard>

                <StatCard $variant={dailyGainLossVariant}>
                    <StatHeader>
                        <Activity size={20} color="#0ea5e9" />
                        <StatLabel>Daily Gain/Loss ({baseCurrency})</StatLabel>
                    </StatHeader>
                    <StatValue
                        $color={
                            dailyGainLossVariant === 'positive'
                                ? '#16a34a'
                                : dailyGainLossVariant === 'negative'
                                    ? '#dc2626'
                                    : '#0f172a'
                        }
                    >
                        {dailyPortfolioGainLossBase === null
                            ? '—'
                            : formatSignedCurrency(dailyPortfolioGainLossBase, baseCurrency)}
                    </StatValue>
                    {dailyPortfolioGainLossPercent !== null && (
                        <StatMetaValue
                            $color={dailyPortfolioGainLossPercent >= 0 ? '#16a34a' : '#dc2626'}
                        >
                            {dailyPortfolioGainLossPercent >= 0 ? '+' : ''}
                            {dailyPortfolioGainLossPercent.toFixed(2)}%
                        </StatMetaValue>
                    )}
                    {dailyPortfolioGainLossUSD !== null && baseCurrency !== 'USD' && (
                        <StatMetaValue>({formatSignedCurrency(dailyPortfolioGainLossUSD ?? 0, 'USD')})</StatMetaValue>
                    )}
                </StatCard>
            </Stats>

            <Card>
                <SectionTitle>
                    <PieChart size={24} />
                    By Currency
                </SectionTitle>
                <CurrencyBreakdown>
                    {summary ? Object.entries(summary.byCurrency).map(([currency, data]) => {
                        const dailyData = summary.dailyGainLossByCurrency?.[currency];
                        return (
                            <StatCard key={currency}>
                                <StatHeader>
                                    <CurrencyBadge $color={getCurrencyColor(currency)}>{currency}</CurrencyBadge>
                                    <StatLabel>{data.positions} Position{data.positions !== 1 ? 's' : ''}</StatLabel>
                                </StatHeader>
                                <StatValue style={{ fontSize: '1.25rem' }}>
                                    {displayCurrencyValue(data.value, currency)}
                                </StatValue>
                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                                    Cost: {displayCurrencyValue(data.cost, currency)}
                                </div>
                                <GainLoss $positive={data.gainLoss >= 0} style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                                    {formatSignedCurrency(data.gainLoss, currency)}
                                </GainLoss>
                                {dailyData && (
                                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                        <GainLoss
                                            $positive={dailyData.amountNative >= 0}
                                            style={{ fontSize: '0.85rem' }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                <div>
                                                    Daily: {formatSignedCurrency(dailyData.amountNative, currency)}
                                                </div>
                                                {baseCurrency !== currency && (
                                                    <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>
                                                        {formatSignedCurrency(dailyData.amountBase, baseCurrency)}
                                                    </div>
                                                )}
                                            </div>
                                        </GainLoss>
                                    </div>
                                )}
                            </StatCard>
                        );
                    }) : null}
                </CurrencyBreakdown>
            </Card>

            <ChartGrid>
                <ChartCard>
                    <SectionTitle>
                        <PieChart size={24} />
                        Allocation Overview
                    </SectionTitle>
                    {allocationData.length === 0 ? (
                        <LoadingText>No allocation data yet.</LoadingText>
                    ) : (
                        <ChartContent>
                            <div style={{ position: 'relative' }}>
                                <DonutChart $gradient={allocationGradient || ''}>
                                </DonutChart>
                            </div>
                            <ChartLegend>
                                {allocationData.map(item => (
                                    <ChartLegendItem key={item.currency}>
                                        <LegendBadge $color={getCurrencyColor(item.currency)}>
                                            {item.currency}
                                        </LegendBadge>
                                        <LegendMetric>
                                            <LegendValue>
                                                {displayCurrencyValue(item.value, item.currency)}
                                            </LegendValue>
                                            {item.currency !== baseCurrency && (
                                                <LegendSubValue>
                                                    {displayCurrencyValue(item.valueInBase, baseCurrency)}
                                                </LegendSubValue>
                                            )}
                                            <LegendPercent>{item.percent.toFixed(1)}%</LegendPercent>
                                        </LegendMetric>
                                    </ChartLegendItem>
                                ))}
                            </ChartLegend>
                        </ChartContent>
                    )}
                </ChartCard>
                <ChartCard>
                    <SectionTitle>
                        <BarChart3 size={24} />
                        Top 5 Holdings
                    </SectionTitle>
                    {topPositions.length === 0 ? (
                        <LoadingText>No open positions to chart yet.</LoadingText>
                    ) : (
                        <MetricCard title="" metrics={topPositionsMetrics} />
                    )}
                </ChartCard>
                <ChartCard>
                    <SectionTitle>
                        <Activity size={24} />
                        Biggest Movers Today
                    </SectionTitle>
                    {dailyMovers.length === 0 ? (
                        <LoadingText>No daily change data available.</LoadingText>
                    ) : (
                        <MetricCard title="" metrics={dailyMoversMetrics} />
                    )}
                </ChartCard>
            </ChartGrid>
        </PageContainer>
    );
}
