import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { usePortfolioStore } from '../store/portfolioStore';
import { useTransactionsStore } from '../store/transactionsStore';
import { useSettingsStore } from '../store/settingsStore';
import { Position } from '../types/Portfolio';
import { CurrencyType } from '../types/Settings';
import { CurrencySelector } from '../components/CurrencySelector';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  SlidersHorizontal,
} from 'lucide-react';

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const HeaderLeft = styled.div``;

const Meta = styled.p`
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  color: #64748b;
  margin-bottom: 0.5rem;
`;

const Title = styled.h1`
  margin: 0 0 0.5rem 0;
  font-size: clamp(2rem, 4vw, 3rem);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Description = styled.p`
  color: #475569;
  margin: 0;
  font-size: 1.1rem;
`;

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
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LastUpdated = styled.div`
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 0.5rem;
`;

const Card = styled.div`
  border-radius: 16px;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(24px);
`;

const LoadingText = styled.p`
  text-align: center;
  color: #64748b;
  font-size: 1.1rem;
  padding: 3rem;
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div<{ $variant?: 'positive' | 'negative' | 'neutral' }>`
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
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatValue = styled.div<{ $color?: string }>`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${props => props.$color || '#0f172a'};
`;

const PositionsTable = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
`;

const Thead = styled.thead`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
`;

const Th = styled.th<{ $alignRight?: boolean; $sortable?: boolean }>`
  padding: 1rem 1.25rem;
  text-align: ${props => (props.$alignRight ? 'right' : 'left')};
  font-weight: 600;
  white-space: nowrap;
  cursor: ${props => (props.$sortable ? 'pointer' : 'default')};
  user-select: ${props => (props.$sortable ? 'none' : 'auto')};
  transition: background 150ms ease, color 150ms ease;

  &:first-child {
    border-top-left-radius: 12px;
  }

  &:last-child {
    border-top-right-radius: 12px;
  }

  &:hover {
    background: ${props => (props.$sortable ? 'rgba(255, 255, 255, 0.1)' : 'inherit')};
  }
`;

const Tbody = styled.tbody`
  tr:nth-child(odd) {
    background: #f9fafb;
  }

  tr:hover {
    background: #ede9fe;
    transition: background 150ms ease;
  }
`;

const Td = styled.td`
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;

  &.number {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
`;

const GainLoss = styled.span<{ $positive?: boolean }>`
  color: ${props => (props.$positive ? '#16a34a' : '#dc2626')};
  font-weight: 600;
`;

const CurrencyBadge = styled.span<{ $color: string }>`
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => `${props.$color}22`};
  color: ${props => props.$color};
  border: ${props => `1px solid ${props.$color}44`};
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CurrencyBreakdown = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const ChartCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const ChartContent = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
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

const DonutCenter = styled.div`
  position: absolute;
  inset: 32px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
`;

const DonutLabel = styled.span`
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.08em;
`;

const DonutValue = styled.span`
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
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
  align-items: center;
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

const LegendPercent = styled.span`
  font-size: 0.8rem;
  color: #94a3b8;
  margin-left: 0.5rem;
`;

const BarsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const BarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const BarLabel = styled.div`
  min-width: 90px;
  font-weight: 600;
  color: #0f172a;
`;

const BarValue = styled.div`
  font-variant-numeric: tabular-nums;
  color: #475569;
  min-width: 120px;
`;

const BarTrack = styled.div`
  flex: 1;
  height: 10px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
`;

const BarFill = styled.div<{ $value: number; $color: string }>`
  width: ${props => `${props.$value}%`};
  height: 100%;
  background: linear-gradient(135deg, ${props => props.$color}, ${props => `${props.$color}bb`});
`;

const FilterPanel = styled.div`
  margin-bottom: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
`;

const FilterHeader = styled.div`
  flex-basis: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #475569;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.25rem;
`;

const FilterInput = styled.input`
  flex: 1;
  min-width: 220px;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  font-size: 0.9rem;
  transition: border 150ms ease, box-shadow 150ms ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
  }
`;

const SelectControl = styled.select`
  padding: 0.6rem 2rem 0.6rem 0.85rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: white;
  font-size: 0.9rem;
  cursor: pointer;
  min-width: 180px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24'%3E%3Cpath fill='%2364748b' d='m12 15l-5-5h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.65rem center;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
  }
`;

const ToggleGroup = styled.div`
  display: inline-flex;
  gap: 0.5rem;
  background: #f8fafc;
  border-radius: 999px;
  padding: 0.25rem;
`;

const ToggleOption = styled.button<{ $active?: boolean }>`
  border: none;
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  color: ${props => (props.$active ? '#fff' : '#475569')};
  background: ${props => (props.$active ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent')};
  transition: background 150ms ease, color 150ms ease;
`;

const TableMeta = styled.div`
  font-size: 0.85rem;
  color: #64748b;
  margin-bottom: 0.5rem;
`;

const SortIndicator = styled.span`
  margin-left: 0.35rem;
  font-size: 0.85rem;
  opacity: 0.9;
`;

const HeaderRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
`;

const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ToggleLabel = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  user-select: none;
`;

const Toggle = styled.input`
  appearance: none;
  width: 44px;
  height: 24px;
  background: #e2e8f0;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: background 200ms ease;

  &:checked {
    background: linear-gradient(135deg, #667eea, #764ba2);
  }

  &::before {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    top: 3px;
    left: 3px;
    transition: transform 200ms ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  &:checked::before {
    transform: translateX(20px);
  }
`;

export function PortfolioPage() {
  const positions = usePortfolioStore(state => state.positions);
  const summary = usePortfolioStore(state => state.summary);
  const loadingPrices = usePortfolioStore(state => state.loadingPrices);
  const lastUpdated = usePortfolioStore(state => state.lastUpdated);
  const fxRates = usePortfolioStore(state => state.fxRates);
  const calculatePortfolio = usePortfolioStore(state => state.calculatePortfolio);
  const loadCachedPrices = usePortfolioStore(state => state.loadCachedPrices);
  const refreshPrices = usePortfolioStore(state => state.refreshPrices);
  const loadFxRates = usePortfolioStore(state => state.loadFxRates);

  const transactions = useTransactionsStore(state => state.transactions);
  const loading = useTransactionsStore(state => state.loading);
  const loadTransactions = useTransactionsStore(state => state.loadTransactions);

  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [gainFilter, setGainFilter] = useState<'all' | 'gainers' | 'losers'>('all');
  const [baseCurrency, setBaseCurrency] = useState<CurrencyType>('USD');
  const [showInBaseCurrency, setShowInBaseCurrency] = useState(false);

  const settings = useSettingsStore(state => state.settings);

  type SortKey =
    | 'stock'
    | 'currency'
    | 'shares'
    | 'averageCost'
    | 'totalCost'
    | 'currentPrice'
    | 'currentValue'
    | 'gainLoss'
    | 'gainLossPercent';
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'currentValue',
    direction: 'desc',
  });

  useEffect(() => {
    setBaseCurrency(settings.baseCurrency);
  }, [settings.baseCurrency]);

  useEffect(() => {
    if (transactions.length === 0) {
      loadTransactions();
    }
  }, [transactions.length, loadTransactions]);

  useEffect(() => {
    loadFxRates();
  }, [loadFxRates]);

  useEffect(() => {
    if (transactions.length > 0) {
      calculatePortfolio();
      loadCachedPrices().then(() => {
        refreshPrices();
      });
    }
  }, [transactions.length, calculatePortfolio, loadCachedPrices, refreshPrices]);

  const convertToUSD = (value: number, currency: string): number => {
    if (currency === 'USD') return value;
    const rate = fxRates.get(currency);
    if (!rate) return value;
    return value * rate;
  };

  const convertToBaseCurrency = (value: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return value;

    const valueInUSD = convertToUSD(value, fromCurrency);

    if (toCurrency === 'USD') return valueInUSD;

    const toRate = fxRates.get(toCurrency);
    return toRate ? valueInUSD / toRate : valueInUSD;
  };

  const formatCurrency = (value: number, currency: string) => {
    const symbols: Record<string, string> = {
      USD: '$',
      TWD: 'NT$',
      JPY: '¥',
      HKD: 'HK$',
    };
    return `${symbols[currency] || ''}${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getCurrencyColor = (currency: string) => {
    const colors: Record<string, string> = {
      USD: '#2563eb',
      TWD: '#dc2626',
      JPY: '#16a34a',
      HKD: '#fb923c',
    };
    return colors[currency] || '#64748b';
  };

  const handleTableSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return null;
    return <SortIndicator>{sortConfig.direction === 'asc' ? '↑' : '↓'}</SortIndicator>;
  };

  const uniqueCurrencies = useMemo(
    () => Array.from(new Set(positions.map(position => position.currency))).sort(),
    [positions]
  );

  const getSortValue = (position: Position, key: SortKey): string | number => {
    switch (key) {
      case 'stock':
        return position.stock;
      case 'currency':
        return position.currency;
      case 'shares':
        return position.shares;
      case 'averageCost':
        return position.averageCost;
      case 'totalCost':
        return position.totalCost;
      case 'currentPrice':
        return position.currentPrice ?? 0;
      case 'currentValue':
        return position.currentValue ?? position.totalCost;
      case 'gainLoss':
        return position.gainLoss ?? 0;
      case 'gainLossPercent':
        return position.gainLossPercent ?? 0;
      default:
        return 0;
    }
  };

  const filteredPositions = useMemo(() => {
    let result = positions;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(position => position.stock.toLowerCase().includes(query));
    }

    if (currencyFilter !== 'all') {
      result = result.filter(position => position.currency === currencyFilter);
    }

    if (gainFilter === 'gainers') {
      result = result.filter(position => (position.gainLoss ?? 0) > 0);
    } else if (gainFilter === 'losers') {
      result = result.filter(position => (position.gainLoss ?? 0) < 0);
    }

    const sorted = [...result].sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.key);
      const bValue = getSortValue(b, sortConfig.key);

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      const diff = (aValue as number) - (bValue as number);
      return sortConfig.direction === 'asc' ? diff : -diff;
    });

    return sorted;
  }, [positions, searchQuery, currencyFilter, gainFilter, sortConfig]);

  const allocationData = useMemo(() => {
    if (!summary || fxRates.size === 0) return [];

    const currencyValuesUSD = Object.entries(summary.byCurrency).map(([currency, data]) => ({
      currency,
      originalValue: data.value,
      valueUSD: convertToUSD(data.value, currency),
    }));

    const totalValueUSD = currencyValuesUSD.reduce((sum, item) => sum + item.valueUSD, 0);

    return currencyValuesUSD.map(item => ({
      currency: item.currency,
      value: item.originalValue,
      valueUSD: item.valueUSD,
      percent: totalValueUSD > 0 ? (item.valueUSD / totalValueUSD) * 100 : 0,
    }));
  }, [summary, fxRates]);

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

  const topPositions = useMemo(() => {
    if (fxRates.size === 0) return [];
    const sorted = [...positions].sort((a, b) => {
      const aValueUSD = convertToUSD(a.currentValue ?? a.totalCost, a.currency);
      const bValueUSD = convertToUSD(b.currentValue ?? b.totalCost, b.currency);
      return bValueUSD - aValueUSD;
    });
    return sorted.slice(0, 5);
  }, [positions, fxRates]);

  const maxTopValue = useMemo(() => {
    if (topPositions.length === 0) return 1;
    const values = topPositions.map(position => position.currentValue ?? position.totalCost);
    return Math.max(1, ...values);
  }, [topPositions]);

  if (loading) {
    return (
      <Container>
        <Card>
          <LoadingText>Loading portfolio...</LoadingText>
        </Card>
      </Container>
    );
  }

  if (!summary || positions.length === 0) {
    return (
      <Container>
        <Header>
          <HeaderLeft>
            <Meta>Portfolio</Meta>
            <Title>My Holdings</Title>
            <Description>No positions found</Description>
          </HeaderLeft>
        </Header>
        <Card>
          <LoadingText>
            No open positions. Start by adding transactions to see your portfolio summary.
          </LoadingText>
        </Card>
      </Container>
    );
  }

  const gainLossVariant = summary.totalGainLoss >= 0 ? 'positive' : 'negative';

  return (
    <Container>
      <Header>
        <HeaderLeft>
          <Meta>Portfolio</Meta>
          <Title>My Holdings</Title>
          <Description>
            {positions.length} position{positions.length !== 1 ? 's' : ''} across{' '}
            {Object.keys(summary.byCurrency).length} currenc
            {Object.keys(summary.byCurrency).length !== 1 ? 'ies' : 'y'}
          </Description>
        </HeaderLeft>
        <HeaderRight>
          <HeaderControls>
            <CurrencySelector value={baseCurrency} onChange={setBaseCurrency} />
            <RefreshButton onClick={refreshPrices} disabled={loadingPrices} $loading={loadingPrices}>
              <RefreshCw size={18} />
              {loadingPrices ? 'Updating...' : 'Update Prices'}
            </RefreshButton>
          </HeaderControls>
          {lastUpdated && (
            <LastUpdated>Last updated: {lastUpdated.toLocaleTimeString()}</LastUpdated>
          )}
        </HeaderRight>
      </Header>

      <Stats>
        <StatCard>
          <StatHeader>
            <DollarSign size={20} color="#667eea" />
            <StatLabel>Total Value</StatLabel>
          </StatHeader>
          <StatValue>${summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</StatValue>
        </StatCard>

        <StatCard>
          <StatHeader>
            <PieChart size={20} color="#667eea" />
            <StatLabel>Total Cost</StatLabel>
          </StatHeader>
          <StatValue>${summary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</StatValue>
        </StatCard>

        <StatCard $variant={gainLossVariant}>
          <StatHeader>
            {summary.totalGainLoss >= 0 ? (
              <TrendingUp size={20} color="#16a34a" />
            ) : (
              <TrendingDown size={20} color="#dc2626" />
            )}
            <StatLabel>Total Gain/Loss</StatLabel>
          </StatHeader>
          <StatValue $color={summary.totalGainLoss >= 0 ? '#16a34a' : '#dc2626'}>
            {summary.totalGainLoss >= 0 ? '+' : ''}
            ${summary.totalGainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {' '}
            ({summary.totalGainLoss >= 0 ? '+' : ''}
            {summary.totalGainLossPercent.toFixed(2)}%)
          </StatValue>
        </StatCard>
      </Stats>

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
                  <DonutCenter>
                    <DonutLabel>Total Value</DonutLabel>
                    <DonutValue>
                      {formatCurrency(summary.totalValue, 'USD')}
                    </DonutValue>
                  </DonutCenter>
                </DonutChart>
              </div>
              <ChartLegend>
                {allocationData.map(item => (
                  <ChartLegendItem key={item.currency}>
                    <LegendBadge $color={getCurrencyColor(item.currency)}>
                      {item.currency}
                    </LegendBadge>
                    <div>
                      <LegendValue>{formatCurrency(item.value, item.currency)}</LegendValue>
                      <LegendPercent>{item.percent.toFixed(1)}%</LegendPercent>
                    </div>
                  </ChartLegendItem>
                ))}
              </ChartLegend>
            </ChartContent>
          )}
        </ChartCard>
        <ChartCard>
          <SectionTitle>
            <BarChart3 size={24} />
            Top Positions
          </SectionTitle>
          {topPositions.length === 0 ? (
            <LoadingText>No open positions to chart yet.</LoadingText>
          ) : (
            <BarsList>
              {topPositions.map(position => {
                const value = position.currentValue ?? position.totalCost;
                const percent = Math.max(4, (value / maxTopValue) * 100);
                return (
                  <BarRow key={position.stock}>
                    <BarLabel>{position.stock}</BarLabel>
                    <BarValue>{formatCurrency(value, position.currency)}</BarValue>
                    <BarTrack>
                      <BarFill
                        $value={percent}
                        $color={getCurrencyColor(position.currency)}
                      />
                    </BarTrack>
                    {position.gainLoss !== undefined && (
                      <GainLoss $positive={position.gainLoss >= 0}>
                        {position.gainLoss >= 0 ? '+' : ''}
                        {formatCurrency(position.gainLoss, position.currency)}
                      </GainLoss>
                    )}
                  </BarRow>
                );
              })}
            </BarsList>
          )}
        </ChartCard>
      </ChartGrid>

      <Card style={{ marginBottom: '2rem' }}>
        <SectionTitle>
          <PieChart size={24} />
          By Currency
        </SectionTitle>
        <CurrencyBreakdown>
          {Object.entries(summary.byCurrency).map(([currency, data]) => (
            <StatCard key={currency}>
              <StatHeader>
                <CurrencyBadge $color={getCurrencyColor(currency)}>{currency}</CurrencyBadge>
                <StatLabel>{data.positions} Position{data.positions !== 1 ? 's' : ''}</StatLabel>
              </StatHeader>
              <StatValue style={{ fontSize: '1.25rem' }}>
                {formatCurrency(data.value, currency)}
              </StatValue>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                Cost: {formatCurrency(data.cost, currency)}
              </div>
              <GainLoss $positive={data.gainLoss >= 0} style={{ fontSize: '0.9rem' }}>
                {data.gainLoss >= 0 ? '+' : ''}
                {formatCurrency(data.gainLoss, currency)}
              </GainLoss>
            </StatCard>
          ))}
        </CurrencyBreakdown>
      </Card>

      <Card>
        <SectionTitle>
          <SlidersHorizontal size={24} />
          Positions
        </SectionTitle>
        <FilterPanel>
          <FilterHeader>
            <SlidersHorizontal size={16} />
            Refine Positions
          </FilterHeader>
          <FilterInput
            type="search"
            placeholder="Search by ticker..."
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
          />
          <SelectControl
            value={currencyFilter}
            onChange={event => setCurrencyFilter(event.target.value)}
          >
            <option value="all">All currencies</option>
            {uniqueCurrencies.map(currency => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </SelectControl>
          <ToggleGroup>
            {(['all', 'gainers', 'losers'] as const).map(filter => (
              <ToggleOption
                key={filter}
                type="button"
                $active={gainFilter === filter}
                onClick={() => setGainFilter(filter)}
              >
                {filter === 'all' && 'All'}
                {filter === 'gainers' && 'Gainers'}
                {filter === 'losers' && 'Losers'}
              </ToggleOption>
            ))}
          </ToggleGroup>
        </FilterPanel>
        <ToggleContainer style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
          <ToggleLabel htmlFor="base-currency-toggle">
            Show values in {baseCurrency}
          </ToggleLabel>
          <Toggle
            id="base-currency-toggle"
            type="checkbox"
            checked={showInBaseCurrency}
            onChange={e => setShowInBaseCurrency(e.target.checked)}
          />
        </ToggleContainer>
        <TableMeta>
          Showing {filteredPositions.length} of {positions.length} positions
        </TableMeta>
        <PositionsTable>
          <Table>
            <Thead>
              <tr>
                <Th $sortable onClick={() => handleTableSort('stock')}>
                  Stock
                  {getSortIndicator('stock')}
                </Th>
                <Th $sortable onClick={() => handleTableSort('currency')}>
                  Currency
                  {getSortIndicator('currency')}
                </Th>
                <Th $alignRight $sortable onClick={() => handleTableSort('shares')}>
                  Shares
                  {getSortIndicator('shares')}
                </Th>
                <Th $alignRight $sortable onClick={() => handleTableSort('averageCost')}>
                  Avg Cost
                  {getSortIndicator('averageCost')}
                </Th>
                <Th $alignRight $sortable onClick={() => handleTableSort('totalCost')}>
                  Total Cost
                  {getSortIndicator('totalCost')}
                </Th>
                <Th $alignRight $sortable onClick={() => handleTableSort('currentPrice')}>
                  Current Price
                  {getSortIndicator('currentPrice')}
                </Th>
                <Th $alignRight $sortable onClick={() => handleTableSort('currentValue')}>
                  Current Value
                  {getSortIndicator('currentValue')}
                </Th>
                <Th $alignRight $sortable onClick={() => handleTableSort('gainLoss')}>
                  Gain/Loss
                  {getSortIndicator('gainLoss')}
                </Th>
              </tr>
            </Thead>
            <Tbody>
              {filteredPositions.length === 0 ? (
                <tr>
                  <Td colSpan={8} style={{ textAlign: 'center' }}>
                    No positions match your filters.
                  </Td>
                </tr>
              ) : (
                filteredPositions.map((position, index) => {
                  const displayCurrency = showInBaseCurrency ? baseCurrency : position.currency;
                  const avgCost = showInBaseCurrency
                    ? convertToBaseCurrency(position.averageCost, position.currency, baseCurrency)
                    : position.averageCost;
                  const totalCost = showInBaseCurrency
                    ? convertToBaseCurrency(position.totalCost, position.currency, baseCurrency)
                    : position.totalCost;
                  const currentPrice = position.currentPrice
                    ? showInBaseCurrency
                      ? convertToBaseCurrency(position.currentPrice, position.currency, baseCurrency)
                      : position.currentPrice
                    : undefined;
                  const currentValue = position.currentValue
                    ? showInBaseCurrency
                      ? convertToBaseCurrency(position.currentValue, position.currency, baseCurrency)
                      : position.currentValue
                    : showInBaseCurrency
                      ? convertToBaseCurrency(position.totalCost, position.currency, baseCurrency)
                      : position.totalCost;
                  const gainLoss = position.gainLoss !== undefined
                    ? showInBaseCurrency
                      ? convertToBaseCurrency(position.gainLoss, position.currency, baseCurrency)
                      : position.gainLoss
                    : undefined;

                  return (
                  <tr key={`${position.stock}-${index}`}>
                    <Td>{position.stock}</Td>
                    <Td>
                      <CurrencyBadge $color={getCurrencyColor(position.currency)}>
                        {position.currency}
                        {showInBaseCurrency && position.currency !== baseCurrency && ` → ${baseCurrency}`}
                      </CurrencyBadge>
                    </Td>
                    <Td className="number">{position.shares.toFixed(2)}</Td>
                    <Td className="number">
                      {formatCurrency(avgCost, displayCurrency)}
                    </Td>
                    <Td className="number">
                      {formatCurrency(totalCost, displayCurrency)}
                    </Td>
                    <Td className="number">
                      {currentPrice !== undefined
                        ? formatCurrency(currentPrice, displayCurrency)
                        : '—'}
                    </Td>
                    <Td className="number">
                      {formatCurrency(currentValue, displayCurrency)}
                    </Td>
                    <Td className="number">
                      {gainLoss !== undefined ? (
                        <>
                          <GainLoss $positive={gainLoss >= 0}>
                            {gainLoss >= 0 ? '+' : ''}
                            {formatCurrency(gainLoss, displayCurrency)}
                          </GainLoss>
                          <br />
                          <GainLoss $positive={gainLoss >= 0} style={{ fontSize: '0.8rem' }}>
                            ({gainLoss >= 0 ? '+' : ''}
                            {position.gainLossPercent?.toFixed(2)}%)
                          </GainLoss>
                        </>
                      ) : (
                        '—'
                      )}
                    </Td>
                  </tr>
                  );
                })
              )}
            </Tbody>
          </Table>
        </PositionsTable>
      </Card>
    </Container>
  );
}
