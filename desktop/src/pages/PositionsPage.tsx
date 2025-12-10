import { useEffect, useMemo, useState, useCallback } from 'react';
import styled from 'styled-components';
import { ColumnDef } from '@tanstack/react-table';
import { usePortfolioStore } from '../store/portfolioStore';
import { useTransactionsStore } from '../store/transactionsStore';
import { useSettingsStore } from '../store/settingsStore';
import { useNavigationStore } from '../store/navigationStore';
import { Position } from '../types/Portfolio';
import { CurrencyType } from '../types/Settings';
import { CurrencySelector } from '../components/CurrencySelector';
import { TanStackTable } from '../components/TanStackTable';
import {
    Container,
    Header,
    HeaderRow,
    HeaderLeft,
    HeaderRight,
    Meta,
    Title,
    Description,
    Card,
    PageHeaderControls,
} from '../components/PageLayout';
import { CURRENCY_SYMBOLS, getCurrencyColor } from '../config/currencies';
import {
    SlidersHorizontal,
    Eye,
    EyeOff,
} from 'lucide-react';

const SectionTitle = styled.h2`
  font-size: 1.2rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg {
    color: #667eea;
  }
`;

const FilterPanel = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  align-items: center;

  @media (max-width: 768px) {
    gap: 0.5rem;
  }
`;

const FilterInput = styled.input`
  flex: 1;
  min-width: 200px;
  padding: 0.6rem 1rem;
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 6px;
  font-size: 0.9rem;
  color: #374151;
  background: white;
  transition: all 120ms ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
  }

  @media (max-width: 768px) {
    width: 100%;
    min-width: 0;
  }
`;

const SelectControl = styled.select`
  padding: 0.6rem 1rem;
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 6px;
  font-size: 0.9rem;
  color: #374151;
  background: white;
  cursor: pointer;
  transition: all 120ms ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const ToggleGroup = styled.div`
  display: flex;
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 6px;
  overflow: hidden;
`;

const ToggleOption = styled.button<{ $active: boolean }>`
  padding: 0.5rem 1rem;
  border: none;
  background: ${props => (props.$active ? '#667eea' : 'transparent')};
  color: ${props => (props.$active ? 'white' : '#64748b')};
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 120ms ease;

  &:hover {
    background: ${props => (props.$active ? '#667eea' : 'rgba(102, 126, 234, 0.1)')};
  }

  &:not(:last-child) {
    border-right: 1px solid rgba(102, 126, 234, 0.2);
  }

  @media (max-width: 768px) {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Toggle = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
`;

const ToggleLabel = styled.label`
  font-size: 0.85rem;
  color: #64748b;
  cursor: pointer;
`;

const TableMeta = styled.div`
  font-size: 0.9rem;
  color: #64748b;
  margin-bottom: 1rem;
`;

const CurrencyBadge = styled.span<{ $color: string }>`
  background: ${props => props.$color};
  color: white;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
`;

const GainLoss = styled.span<{ $positive: boolean }>`
  color: ${props => (props.$positive ? '#16a34a' : '#dc2626')};
  font-weight: 600;
`;

interface DisplayPosition extends Position {
    displayCurrency: string;
    displayAvgCost: number;
    displayTotalCost: number;
    displayCurrentPrice?: number;
    displayCurrentValue: number;
    displayGainLoss?: number;
    displayDailyGainLoss?: number;
    dailyGainLossPercent?: number;
}

export function PositionsPage() {
    const { positions, summary, loadPositions } = usePortfolioStore();
    const { transactions, loadTransactions } = useTransactionsStore();
    const { baseCurrency, setBaseCurrency } = useSettingsStore();
    const { setCurrentPage } = useNavigationStore();
    const { privacyMode } = useSettingsStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [currencyFilter, setCurrencyFilter] = useState('all');
    const [gainFilter, setGainFilter] = useState<'all' | 'gainers' | 'losers'>('all');
    const [showInBaseCurrency, setShowInBaseCurrency] = useState(false);
    const [showInactive, setShowInactive] = useState(false);

    useEffect(() => {
        loadPositions();
        loadTransactions();
    }, [loadPositions, loadTransactions]);

    const displayCurrencyValue = useCallback((value: number, currency: string) => {
        if (privacyMode) return '***';
        const symbol = CURRENCY_SYMBOLS[currency as CurrencyType] || currency;
        return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [privacyMode]);

    const formatSignedCurrency = useCallback((value: number, currency: string) => {
        if (privacyMode) return '***';
        const symbol = CURRENCY_SYMBOLS[currency as CurrencyType] || currency;
        const sign = value >= 0 ? '+' : '';
        return `${sign}${symbol}${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [privacyMode]);

    const formatShares = useCallback((shares: number) => {
        if (privacyMode) return '***';
        return shares.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }, [privacyMode]);

    const formatPercentage = useCallback((value: number) => {
        // Percentages are always shown, even in privacy mode
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
    }, []);

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

    const uniqueCurrencies = useMemo(() => {
        const currencies = new Set(positions.map(p => p.currency));
        return Array.from(currencies).sort();
    }, [positions]);

    const getDailyChange = useCallback((position: Position) => {
        // Simplified - in real app, calculate from price history
        return { amount: Math.random() * 100 - 50, percent: Math.random() * 10 - 5 };
    }, []);

    const filteredPositions = useMemo<DisplayPosition[]>(() => {
        let filtered = positions.filter(position => {
            if (!showInactive && position.shares === 0) return false;
            if (searchQuery && !position.stock.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (currencyFilter !== 'all' && position.currency !== currencyFilter) return false;

            if (gainFilter === 'gainers') return (position.gainLoss || 0) > 0;
            if (gainFilter === 'losers') return (position.gainLoss || 0) < 0;

            return true;
        });

        return filtered.map(position => {
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
            const { amount: rawDailyGainLoss, percent: dailyGainLossPercent } = getDailyChange(position);
            const dailyGainLoss = rawDailyGainLoss !== undefined
                ? showInBaseCurrency
                    ? convertToBaseCurrency(rawDailyGainLoss, position.currency, baseCurrency)
                    : rawDailyGainLoss
                : undefined;

            return {
                ...position,
                displayCurrency,
                displayAvgCost: avgCost,
                displayTotalCost: totalCost,
                displayCurrentPrice: currentPrice,
                displayCurrentValue: currentValue,
                displayGainLoss: gainLoss,
                displayDailyGainLoss: dailyGainLoss,
                dailyGainLossPercent,
            };
        });
    }, [positions, searchQuery, currencyFilter, gainFilter, showInactive, showInBaseCurrency, baseCurrency, convertToBaseCurrency, getDailyChange]);

    const columns = useMemo<ColumnDef<DisplayPosition>[]>(() => [
        {
            accessorKey: 'stock',
            header: 'Stock',
            cell: info => info.getValue(),
        },
        {
            accessorKey: 'currency',
            header: 'Currency',
            cell: info => {
                const position = info.row.original;
                return (
                    <CurrencyBadge $color={getCurrencyColor(position.currency)}>
                        {position.currency}
                        {showInBaseCurrency && position.currency !== baseCurrency && ` → ${baseCurrency}`}
                    </CurrencyBadge>
                );
            },
            meta: {
                minWidth: '100px',
            } as any,
        },
        {
            accessorKey: 'shares',
            header: 'Shares',
            cell: info => formatShares(info.getValue() as number),
            meta: {
                align: 'right',
            } as any,
        },
        {
            accessorKey: 'displayAvgCost',
            header: 'Avg Cost',
            cell: info => {
                const position = info.row.original;
                return displayCurrencyValue(info.getValue() as number, position.displayCurrency);
            },
            meta: {
                align: 'right',
            } as any,
        },
        {
            accessorKey: 'displayTotalCost',
            header: 'Total Cost',
            cell: info => {
                const position = info.row.original;
                return displayCurrencyValue(info.getValue() as number, position.displayCurrency);
            },
            meta: {
                align: 'right',
            } as any,
        },
        {
            accessorKey: 'displayCurrentPrice',
            header: 'Current Price',
            cell: info => {
                const position = info.row.original;
                const value = info.getValue() as number | undefined;
                return value !== undefined ? displayCurrencyValue(value, position.displayCurrency) : '—';
            },
            meta: {
                align: 'right',
            } as any,
        },
        {
            accessorKey: 'displayCurrentValue',
            header: 'Current Value',
            cell: info => {
                const position = info.row.original;
                return displayCurrencyValue(info.getValue() as number, position.displayCurrency);
            },
            meta: {
                align: 'right',
            } as any,
        },
        {
            accessorKey: 'displayGainLoss',
            header: 'Gain/Loss',
            cell: info => {
                const position = info.row.original;
                const gainLoss = info.getValue() as number | undefined;
                if (gainLoss === undefined) return '—';
                return (
                    <>
                        <GainLoss $positive={gainLoss >= 0}>
                            {privacyMode ? '***' : formatSignedCurrency(gainLoss, position.displayCurrency)}
                        </GainLoss>
                        <br />
                        <GainLoss $positive={gainLoss >= 0} style={{ fontSize: '0.8rem' }}>
                            ({formatPercentage(position.gainLossPercent || 0)})
                        </GainLoss>
                    </>
                );
            },
            meta: {
                align: 'right',
            } as any,
        },
        {
            accessorKey: 'displayDailyGainLoss',
            header: 'Daily Gain/Loss',
            cell: info => {
                const position = info.row.original;
                const dailyGainLoss = info.getValue() as number | undefined;
                if (dailyGainLoss === undefined) return '—';
                return (
                    <>
                        <GainLoss $positive={dailyGainLoss >= 0}>
                            {privacyMode ? '***' : formatSignedCurrency(dailyGainLoss, position.displayCurrency)}
                        </GainLoss>
                        <br />
                        <GainLoss $positive={(dailyGainLoss ?? 0) >= 0} style={{ fontSize: '0.8rem' }}>
                            ({formatPercentage(position.dailyGainLossPercent || 0)})
                        </GainLoss>
                    </>
                );
            },
            meta: {
                align: 'right',
            } as any,
        },
    ], [formatShares, displayCurrencyValue, formatSignedCurrency, formatPercentage, privacyMode, showInBaseCurrency, baseCurrency]);

    return (
        <Container>
            <Header>
                <HeaderRow>
                    <HeaderLeft>
                        <Meta>Report</Meta>
                        <Title>Positions</Title>
                        <Description>
                            Detailed view of all your investment positions
                        </Description>
                    </HeaderLeft>
                    <HeaderRight>
                        <PageHeaderControls />
                    </HeaderRight>
                </HeaderRow>
            </Header>

            <Card>
                <SectionTitle>
                    <SlidersHorizontal size={24} />
                    Positions
                </SectionTitle>
                <FilterPanel>
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
                    <div style={{ width: '100%', height: 0, flexBasis: '100%' }} />
                    <ToggleContainer>
                        <Toggle
                            id="base-currency-toggle"
                            type="checkbox"
                            checked={showInBaseCurrency}
                            onChange={e => setShowInBaseCurrency(e.target.checked)}
                        />
                        <ToggleLabel htmlFor="base-currency-toggle">
                            Show values in {baseCurrency}
                        </ToggleLabel>
                    </ToggleContainer>
                    <ToggleContainer>
                        <Toggle
                            id="show-inactive-toggle"
                            type="checkbox"
                            checked={showInactive}
                            onChange={e => setShowInactive(e.target.checked)}
                        />
                        <ToggleLabel htmlFor="show-inactive-toggle">
                            Show inactive positions
                        </ToggleLabel>
                    </ToggleContainer>
                </FilterPanel>

                <TableMeta>
                    Showing {filteredPositions.length} of {positions.length} positions
                </TableMeta>

                <TanStackTable
                    data={filteredPositions}
                    columns={columns}
                    onRowClick={(row) => setCurrentPage('stock-detail', row.original.stock)}
                    initialSorting={[{ id: 'stock', desc: false }]}
                />
            </Card>
        </Container>
    );
}
