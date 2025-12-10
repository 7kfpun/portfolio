import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { ColumnDef, Row } from '@tanstack/react-table';
import { Container, Header, HeaderLeft, HeaderRight, Meta, Title, Description, Card, Button, SmallButton, PageHeaderControls } from '../components/PageLayout';
import { TanStackTable } from '../components/TanStackTable';
import { useTransactionsStore } from '../store/transactionsStore';
import { usePortfolioStore } from '../store/portfolioStore';
import { useSettingsStore } from '../store/settingsStore';
import { CurrencyType } from '../types/Settings';
import { buildFullPositionHistory, FullPositionEntry } from '../utils/fullPositionHistory';
import { buildChartData } from '../utils/stockDetailCalculations';
import { priceDataService } from '../services/priceDataService';
import { navService } from '../services/navService';
import { PriceRecord } from '../types/PriceData';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { CURRENCY_SYMBOLS } from '../config/currencies';

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
`;

const StatCard = styled.div`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatValue = styled.div`
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
`;

const DetailCard = styled.div`
  padding: 1rem 0;
`;

const DetailHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const DetailTitle = styled.h3`
  margin: 0;
  font-size: 1.125rem;
  color: #0f172a;
  font-weight: 600;
`;

const DetailSubtitle = styled.p`
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.875rem;
`;

const DetailMeta = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;

  span {
    color: #64748b;
    font-size: 0.875rem;
  }
`;

const ChartContainer = styled.div`
  width: 100%;
  height: 280px;
`;

const TooltipBox = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.1);
`;

const TooltipLabel = styled.div`
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #111827;
  font-size: 0.875rem;
`;

const TooltipValue = styled.div`
  font-size: 0.8rem;
  color: #475569;
`;

const Message = styled.div<{ $variant: 'success' | 'error' | 'info' }>`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  background: ${props =>
    props.$variant === 'success'
      ? '#ecfdf5'
      : props.$variant === 'error'
        ? '#fef2f2'
        : '#eff6ff'};
  color: ${props =>
    props.$variant === 'success'
      ? '#047857'
      : props.$variant === 'error'
        ? '#b91c1c'
        : '#1d4ed8'};
  border: 1px solid
    ${props =>
    props.$variant === 'success'
      ? 'rgba(16, 185, 129, 0.3)'
      : props.$variant === 'error'
        ? 'rgba(239, 68, 68, 0.3)'
        : 'rgba(59, 130, 246, 0.3)'};
`;

interface EnrichedPosition extends FullPositionEntry {
  latestPrice: number;
  priceDate: string | null;
  marketValue: number;
  marketValueUSD: number;
  marketValueBase: number;
}

interface PositionValuePoint {
  date: string;
  valueBase: number;
  valueNative: number;
  shares: number;
}

const formatCurrency = (value: number, currency: string) => {
  const symbol = CURRENCY_SYMBOLS[currency as CurrencyType] || currency + ' ';
  return `${symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const convertToUSD = (amount: number, currency: string, fxRates: Map<string, number>) => {
  if (currency === 'USD') return amount;
  const rate = fxRates.get(currency);
  return rate ? amount * rate : 0;
};

const convertFromUSD = (amount: number, currency: string, fxRates: Map<string, number>) => {
  if (currency === 'USD') return amount;
  const rate = fxRates.get(currency);
  return rate ? (rate > 0 ? amount / rate : 0) : 0;
};

export function NavManagementPage() {
  const { transactions, loadTransactions, loading: loadingTransactions } = useTransactionsStore();
  const fxRates = usePortfolioStore(state => state.fxRates);
  const loadFxRates = usePortfolioStore(state => state.loadFxRates);
  const { settings, loadSettings } = useSettingsStore();

  const [priceMap, setPriceMap] = useState<Map<string, PriceRecord>>(new Map());
  const [pricesLoading, setPricesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<EnrichedPosition | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<PositionValuePoint[] | null>(null);

  useEffect(() => {
    if (!transactions.length && !loadingTransactions) {
      loadTransactions();
    }
  }, [transactions.length, loadingTransactions, loadTransactions]);

  useEffect(() => {
    if (fxRates.size <= 1) {
      loadFxRates();
    }
  }, [fxRates, loadFxRates]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const baseCurrency = settings.baseCurrency || 'USD';

  const positions = useMemo(
    () => buildFullPositionHistory(transactions),
    [transactions]
  );

  useEffect(() => {
    if (!positions.length) return;
    let mounted = true;
    setPricesLoading(true);
    const uniqueSymbols = Array.from(new Set(positions.map(p => p.stock)));

    priceDataService
      .getLatestPrices(uniqueSymbols)
      .then(map => {
        if (mounted) {
          setPriceMap(map);
        }
      })
      .catch(err => {
        console.error('Failed to load latest prices:', err);
      })
      .finally(() => {
        if (mounted) setPricesLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [positions]);

  const enrichedPositions: EnrichedPosition[] = useMemo(() => {
    return positions.map(position => {
      const latest = priceMap.get(position.stock);
      const latestPrice = latest?.close ?? 0;
      const priceDate = latest?.date ?? null;
      const marketValue = position.shares * latestPrice;
      const marketValueUSD = convertToUSD(marketValue, position.currency, fxRates);
      const marketValueBase = convertFromUSD(marketValueUSD, baseCurrency, fxRates);

      return {
        ...position,
        latestPrice,
        priceDate,
        marketValue,
        marketValueUSD,
        marketValueBase,
      };
    });
  }, [positions, priceMap, fxRates, baseCurrency]);

  const totals = useMemo(() => {
    const totalUSD = enrichedPositions.reduce((sum, entry) => sum + entry.marketValueUSD, 0);
    const totalBase = convertFromUSD(totalUSD, baseCurrency, fxRates);
    const active = enrichedPositions.filter(entry => entry.status === 'Active').length;
    const closed = enrichedPositions.filter(entry => entry.status === 'Closed').length;
    const investedUSD = enrichedPositions.reduce(
      (sum, entry) => sum + convertToUSD(entry.invested, entry.currency, fxRates),
      0
    );
    const investedBase = convertFromUSD(investedUSD, baseCurrency, fxRates);

    return {
      totalUSD,
      totalBase,
      active,
      closed,
      investedBase,
    };
  }, [enrichedPositions, baseCurrency, fxRates]);

  const handlePositionSnapshot = useCallback(
    async (row: EnrichedPosition) => {
      setSavingRow(row.stock);
      setStatusMessage(null);
      setErrorMessage(null);

      try {
        const payload = {
          timestamp: new Date().toISOString(),
          stock: row.stock,
          currency: row.currency,
          shares: row.shares,
          average_cost: row.averageCost,
          latest_price: row.latestPrice,
          market_value: row.marketValue,
          market_value_usd: row.marketValueUSD,
          status: row.status,
          last_transaction: row.lastTransaction,
        };

        const savedPath = await navService.savePositionSnapshot(payload);
        setStatusMessage(`Snapshot for ${row.stock} saved to ${savedPath}`);
      } catch (error) {
        console.error('Failed to save position snapshot:', error);
        setErrorMessage(
          error instanceof Error ? error.message : `Failed to save snapshot for ${row.stock}`
        );
      } finally {
        setSavingRow(null);
      }
    },
    []
  );

  const handleRowClick = useCallback(
    (row: Row<EnrichedPosition>) => {
      const item = row.original;
      if (selectedRow?.stock === item.stock) {
        setSelectedRow(null);
        setDetailData(null);
        setDetailError(null);
        row.toggleExpanded();
        return;
      }

      setSelectedRow(item);
      row.toggleExpanded();
    },
    [selectedRow]
  );

  useEffect(() => {
    if (!selectedRow) {
      setDetailData(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);

    const loadFromNavFile = async (): Promise<boolean> => {
      try {
        const navHistory = await navService.loadPositionHistory(selectedRow.stock);
        if (!navHistory.length) {
          return false;
        }

        const mapped: PositionValuePoint[] = navHistory.map(point => {
          const valueUSD = convertToUSD(point.positionValue, point.currency, fxRates);
          const valueBase = convertFromUSD(valueUSD, baseCurrency, fxRates);
          return {
            date: point.date,
            valueBase,
            valueNative: point.positionValue,
            shares: point.shares,
          };
        });

        if (!cancelled) {
          setDetailData(mapped);
          setDetailError(null);
          setDetailLoading(false);
        }
        return true;
      } catch (error) {
        console.info('NAV history not available; falling back to computed timeline.', error);
        return false;
      }
    };

    const loadFromComputedTimeline = async () => {
      try {
        const priceHistory = await priceDataService.getPricesForSymbol(selectedRow.stock);
        if (cancelled) {
          return;
        }

        if (!priceHistory.length) {
          setDetailData([]);
          setDetailError('No price history available for this position.');
          return;
        }

        const positionTransactions = transactions.filter(
          txn => txn.stock === selectedRow.stock && txn.currency === selectedRow.currency
        );

        const chartPoints = buildChartData(priceHistory, positionTransactions, []);
        const mappedPoints: PositionValuePoint[] = chartPoints.map(point => {
          const shares = point.shares ?? 0;
          // Use unadjusted Close if available (for correct pre-split valuation with unadjusted shares)
          // otherwise fall back to standard Close
          const price = point.unadjustedClose ?? point.close;
          const valueNative = shares * price;
          const valueUSD = convertToUSD(valueNative, selectedRow.currency, fxRates);
          const valueBase = convertFromUSD(valueUSD, baseCurrency, fxRates);

          return {
            date: point.date,
            valueBase,
            valueNative,
            shares,
          };
        });

        if (!cancelled) {
          setDetailData(mappedPoints);
          setDetailError(null);
        }
      } catch (error) {
        console.error('Failed to load position detail:', error);
        if (!cancelled) {
          setDetailError('Failed to load value history for this position.');
          setDetailData(null);
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    const loadDetail = async () => {
      const loadedNav = await loadFromNavFile();
      if (cancelled) return;
      if (loadedNav) return;
      await loadFromComputedTimeline();
    };

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedRow, transactions, fxRates, baseCurrency]);

  const handleCalculateAll = useCallback(async () => {
    if (!enrichedPositions.length) return;
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    let successCount = 0;
    let errorCount = 0;

    for (const position of enrichedPositions) {
      // Update status to show current progress
      setStatusMessage(`Processing ${position.stock}...`);

      try {
        const payload = {
          timestamp: new Date().toISOString(),
          stock: position.stock,
          currency: position.currency,
          shares: position.shares,
          average_cost: position.averageCost,
          latest_price: position.latestPrice,
          market_value: position.marketValue,
          market_value_usd: position.marketValueUSD,
          status: position.status,
          last_transaction: position.lastTransaction,
        };

        await navService.savePositionSnapshot(payload);
        successCount++;
      } catch (error) {
        console.error(`Failed to save snapshot for ${position.stock}:`, error);
        errorCount++;
      }
    }

    setSaving(false);
    if (errorCount > 0) {
      setErrorMessage(`Completed with issues: ${successCount} saved, ${errorCount} failed.`);
    } else {
      setStatusMessage(`Successfully calculated and saved snapshots for ${successCount} positions.`);
    }
  }, [enrichedPositions]);

  const columns = useMemo<ColumnDef<EnrichedPosition>[]>(() => [
    {
      accessorKey: 'stock',
      header: 'Ticker',
      enableSorting: true,
      cell: info => <strong>{info.getValue() as string}</strong>,
      meta: {
        cellStyle: { fontWeight: 600 },
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: true,
      cell: info => {
        const status = info.getValue() as 'Active' | 'Closed';
        return (
          <span style={{ color: status === 'Active' ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: 'shares',
      header: 'Shares',
      enableSorting: true,
      cell: info => (info.getValue() as number).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
      }),
      meta: {
        headerStyle: { textAlign: 'right' },
        cellStyle: { textAlign: 'right' },
      },
    },
    {
      accessorKey: 'averageCost',
      header: 'Avg Cost',
      enableSorting: true,
      cell: ({ row }) => formatCurrency(row.original.averageCost, row.original.currency),
      meta: {
        headerStyle: { textAlign: 'right' },
        cellStyle: { textAlign: 'right' },
      },
    },
    {
      accessorKey: 'invested',
      header: 'Total Invested',
      enableSorting: true,
      cell: ({ row }) => formatCurrency(row.original.invested, row.original.currency),
      meta: {
        headerStyle: { textAlign: 'right' },
        cellStyle: { textAlign: 'right' },
      },
    },
    {
      accessorKey: 'realizedPnl',
      header: 'Realized P/L',
      enableSorting: true,
      cell: ({ row }) => {
        const value = row.original.realizedPnl;
        const formatted = formatCurrency(value, row.original.currency);
        return (
          <span style={{ color: value >= 0 ? '#16a34a' : '#dc2626' }}>
            {formatted}
          </span>
        );
      },
      meta: {
        headerStyle: { textAlign: 'right' },
        cellStyle: { textAlign: 'right' },
      },
    },
    {
      accessorKey: 'marketValueBase',
      header: `Value (${baseCurrency})`,
      enableSorting: true,
      cell: ({ row }) => {
        const value = row.original.marketValueBase;
        return `${CURRENCY_SYMBOLS[baseCurrency] || ''}${value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      },
      meta: {
        headerStyle: { textAlign: 'right' },
        cellStyle: { textAlign: 'right' },
      },
    },
    {
      accessorKey: 'lastTransaction',
      header: 'Last Transaction',
      enableSorting: true,
      cell: info => (info.getValue() as string | null) ?? '—',
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <SmallButton
            $variant="primary"
            $loading={savingRow === row.original.stock}
            disabled={savingRow !== null && savingRow !== row.original.stock}
            onClick={event => {
              event.stopPropagation();
              handlePositionSnapshot(row.original);
            }}
          >
            {savingRow === row.original.stock ? 'Saving…' : 'Save'}
          </SmallButton>
        </div>
      ),
      meta: {
        cellStyle: { textAlign: 'right' },
      },
    },
  ], [baseCurrency, handlePositionSnapshot, savingRow]);

  const renderTooltip = useCallback(
    ({ active, payload, label }: any) => {
      if (!active || !payload || payload.length === 0) return null;
      const point: PositionValuePoint = payload[0].payload;

      return (
        <TooltipBox>
          <TooltipLabel>{label}</TooltipLabel>
          <TooltipValue>
            Value ({baseCurrency}): {formatCurrency(point.valueBase, baseCurrency)}
          </TooltipValue>
          <TooltipValue>
            Shares: {point.shares.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 4,
            })}
          </TooltipValue>
        </TooltipBox>
      );
    },
    [baseCurrency]
  );

  const renderExpandedRow = useCallback(
    (row: Row<EnrichedPosition>) => {
      const item = row.original;

      if (detailLoading) {
        return <Message $variant="info">Loading value history…</Message>;
      }

      if (detailError) {
        return <Message $variant="error">{detailError}</Message>;
      }

      if (!detailData || detailData.length === 0) {
        return <Message $variant="info">No historical data available for this position.</Message>;
      }

      return (
        <DetailCard>
          <DetailHeader>
            <div>
              <DetailTitle>{item.stock}</DetailTitle>
              <DetailSubtitle>
                {item.status} • {item.currency} •{' '}
                {item.priceDate
                  ? `Last price ${formatCurrency(item.latestPrice, item.currency)} on ${item.priceDate}`
                  : 'No recent price'}
              </DetailSubtitle>
            </div>
            <DetailMeta>
              <span>
                Shares:{' '}
                {item.shares.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 4,
                })}
              </span>
              <span>
                Value ({baseCurrency}): {formatCurrency(item.marketValueBase, baseCurrency)}
              </span>
              <span>
                Date Range:{' '}
                {detailData.length
                  ? `${detailData[0].date} → ${detailData[detailData.length - 1].date}`
                  : '—'}
              </span>
            </DetailMeta>
          </DetailHeader>

          <ChartContainer>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={detailData}>
                <defs>
                  <linearGradient id="navValueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={value => value.slice(2)}
                  minTickGap={30}
                  stroke="#94a3b8"
                />
                <YAxis
                  tickFormatter={value => formatCurrency(value as number, baseCurrency)}
                  stroke="#94a3b8"
                  width={100}
                  allowDecimals
                />
                <Tooltip content={renderTooltip} />
                <Area
                  type="monotone"
                  dataKey="valueBase"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fill="url(#navValueGradient)"
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </DetailCard>
      );
    },
    [detailLoading, detailError, detailData, baseCurrency, renderTooltip]
  );

  return (
    <Container>
      <Header>
        <HeaderLeft>
          <Meta>Data Management</Meta>
          <Title>NAV Snapshots</Title>
          <Description>
            Review every position, including closed positions, and capture a NAV snapshot for record keeping.
          </Description>
        </HeaderLeft>
        <HeaderRight>
          <PageHeaderControls />
          <Button
            $variant="primary"
            disabled={enrichedPositions.length === 0 || saving || pricesLoading}
            onClick={handleCalculateAll}
          >
            {saving ? 'Calculating...' : 'Calculate All'}
          </Button>
        </HeaderRight>
      </Header>

      <StatsGrid>
        <StatCard>
          <StatLabel>Total Positions</StatLabel>
          <StatValue>{enrichedPositions.length}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Active / Closed</StatLabel>
          <StatValue>{totals.active} / {totals.closed}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Total Invested</StatLabel>
          <StatValue>{formatCurrency(totals.investedBase, baseCurrency)}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Current Value ({baseCurrency})</StatLabel>
          <StatValue>
            {formatCurrency(totals.totalBase, baseCurrency)}
          </StatValue>
        </StatCard>
      </StatsGrid>

      {statusMessage && <Message $variant="success">{statusMessage}</Message>}
      {errorMessage && <Message $variant="error">{errorMessage}</Message>}

      {loadingTransactions || pricesLoading ? (
        <Message $variant="info">Loading latest positions…</Message>
      ) : enrichedPositions.length === 0 ? (
        <Message $variant="error">No transactions available. Import transactions to build NAV snapshots.</Message>
      ) : (
        <>
          <Card>
            <TanStackTable
              data={enrichedPositions}
              columns={columns}
              onRowClick={handleRowClick}
              renderExpandedRow={renderExpandedRow}
              emptyMessage="No positions available"
              initialSorting={[{ id: 'lastTransaction', desc: true }]}
            />
          </Card>
        </>
      )}
    </Container>
  );
}
