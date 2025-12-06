import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { AdvancedTable, Column } from '../components/AdvancedTable';
import { useTransactionsStore } from '../store/transactionsStore';
import { usePortfolioStore } from '../store/portfolioStore';
import { useSettingsStore } from '../store/settingsStore';
import { buildFullPositionHistory, FullPositionEntry } from '../utils/fullPositionHistory';
import { buildChartData } from '../utils/stockDetailCalculations';
import { priceDataService } from '../services/priceDataService';
import { navService, NavSnapshotEntry } from '../services/navService';
import { PriceRecord } from '../types/PriceData';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const HeaderCard = styled.div`
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h1`
  font-size: 1.75rem;
  margin: 0;
  color: #111827;
`;

const Description = styled.p`
  margin: 0;
  color: #475569;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  border: 1px solid ${props => (props.$variant === 'primary' ? '#4f46e5' : '#e2e8f0')};
  background: ${props => (props.$variant === 'primary' ? '#4f46e5' : 'white')};
  color: ${props => (props.$variant === 'primary' ? 'white' : '#111827')};
  font-weight: 600;
  cursor: pointer;
  transition: all 120ms ease;
  min-width: 200px;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: ${props => (props.$variant === 'primary' ? '#4338ca' : '#f8fafc')};
  }
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const SummaryCard = styled.div`
  padding: 1rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
`;

const SummaryLabel = styled.div`
  font-size: 0.85rem;
  color: #64748b;
  margin-bottom: 0.25rem;
`;

const SummaryValue = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
`;

const RowActions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const RowActionButton = styled.button<{ $loading?: boolean }>`
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  border: 1px solid #cbd5f5;
  background: ${props => (props.$loading ? '#e0e7ff' : '#eef2ff')};
  color: #4338ca;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: ${props => (props.$loading ? 'wait' : 'pointer')};
  transition: all 120ms ease;

  &:hover:not(:disabled) {
    background: #e0e7ff;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const DetailCard = styled.div`
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const DetailHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const DetailTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  color: #0f172a;
`;

const DetailSubtitle = styled.p`
  margin: 0.2rem 0 0;
  color: #475569;
  font-size: 0.9rem;
`;

const DetailMeta = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;

  span {
    color: #475569;
    font-size: 0.9rem;
  }
`;

const ChartContainer = styled.div`
  width: 100%;
  height: 320px;
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
`;

const TooltipValue = styled.div`
  font-size: 0.85rem;
  color: #475569;
`;

const Message = styled.div<{ $variant: 'success' | 'error' | 'info' }>`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 500;
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

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  TWD: 'NT$',
  JPY: '¥',
  HKD: 'HK$',
};

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
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' ';
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
    (row: EnrichedPosition) => {
      if (selectedRow?.stock === row.stock) {
        setSelectedRow(null);
        setDetailData(null);
        setDetailError(null);
        return;
      }

      setSelectedRow(row);
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

  const columns = useMemo<Column<EnrichedPosition>[]>(() => [
    {
      key: 'stock',
      header: 'Ticker',
      accessor: row => row.stock,
      width: 140,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: row => (
        <span style={{ color: row.status === 'Active' ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
          {row.status}
        </span>
      ),
      width: 120,
    },
    {
      key: 'shares',
      header: 'Shares',
      accessor: row => row.shares.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
      }),
      align: 'right',
      width: 120,
    },
    {
      key: 'averageCost',
      header: 'Avg Cost',
      accessor: row => formatCurrency(row.averageCost, row.currency),
      align: 'right',
      width: 140,
    },
    {
      key: 'invested',
      header: 'Total Invested',
      accessor: row => formatCurrency(row.invested, row.currency),
      align: 'right',
      width: 160,
    },
    {
      key: 'realizedPnl',
      header: 'Realized P/L',
      accessor: row => {
        const formatted = formatCurrency(row.realizedPnl, row.currency);
        const color = row.realizedPnl >= 0 ? '#16a34a' : '#dc2626';
        return <span style={{ color }}>{formatted}</span>;
      },
      align: 'right',
      width: 160,
    },
    {
      key: 'marketValue',
      header: `Value (${baseCurrency})`,
      accessor: row => `${CURRENCY_SYMBOLS[baseCurrency] || ''}${row.marketValueBase.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      align: 'right',
      width: 180,
    },
    {
      key: 'lastTransaction',
      header: 'Last Transaction',
      accessor: row => row.lastTransaction ?? '—',
      width: 140,
    },
    {
      key: 'actions',
      header: '',
      accessor: row => (
        <RowActions>
          <RowActionButton
            $loading={savingRow === row.stock}
            disabled={savingRow !== null && savingRow !== row.stock}
            onClick={event => {
              event.stopPropagation();
              handlePositionSnapshot(row);
            }}
          >
            {savingRow === row.stock ? 'Saving…' : 'Save'}
          </RowActionButton>
        </RowActions>
      ),
      width: 120,
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

  return (
    <PageContainer>
      <HeaderCard>
        <HeaderRow>
          <div>
            <Title>NAV Snapshots</Title>
            <Description>
              Review every position, including closed positions, and capture a NAV snapshot for record keeping.
            </Description>
          </div>
          <ActionButton
            $variant="primary"
            disabled={enrichedPositions.length === 0 || saving || pricesLoading}
            onClick={handleCalculateAll}
          >
            {saving ? 'Calculating...' : 'Calculate All'}
          </ActionButton>
        </HeaderRow>
        <SummaryGrid>
          <SummaryCard>
            <SummaryLabel>Total Positions</SummaryLabel>
            <SummaryValue>{enrichedPositions.length}</SummaryValue>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>Active / Closed</SummaryLabel>
            <SummaryValue>{totals.active} / {totals.closed}</SummaryValue>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>Total Invested</SummaryLabel>
            <SummaryValue>{formatCurrency(totals.investedBase, baseCurrency)}</SummaryValue>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>Current Value ({baseCurrency})</SummaryLabel>
            <SummaryValue>
              {formatCurrency(totals.totalBase, baseCurrency)}
            </SummaryValue>
          </SummaryCard>
        </SummaryGrid>
        {statusMessage && <Message $variant="success">{statusMessage}</Message>}
        {errorMessage && <Message $variant="error">{errorMessage}</Message>}
      </HeaderCard>

      {loadingTransactions || pricesLoading ? (
        <Message $variant="info">Loading latest positions…</Message>
      ) : enrichedPositions.length === 0 ? (
        <Message $variant="error">No transactions available. Import transactions to build NAV snapshots.</Message>
      ) : (
        <>
          <AdvancedTable
            data={enrichedPositions}
            columns={columns}
            defaultSortKey="lastTransaction"
            defaultSortDirection="desc"
            onRowClick={handleRowClick}
            rowIsActive={row => selectedRow?.stock === row.stock}
          />

          {selectedRow && (
            <DetailCard>
              <DetailHeader>
                <div>
                  <DetailTitle>{selectedRow.stock}</DetailTitle>
                  <DetailSubtitle>
                    {selectedRow.status} • {selectedRow.currency} •{' '}
                    {selectedRow.priceDate
                      ? `Last price ${formatCurrency(selectedRow.latestPrice, selectedRow.currency)} on ${selectedRow.priceDate}`
                      : 'No recent price'}
                  </DetailSubtitle>
                </div>
                <DetailMeta>
                  <span>
                    Shares:{' '}
                    {selectedRow.shares.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 4,
                    })}
                  </span>
                  <span>
                    Value ({baseCurrency}): {formatCurrency(selectedRow.marketValueBase, baseCurrency)}
                  </span>
                  <span>
                    Date Range:{' '}
                    {detailData?.length
                      ? `${detailData[0].date} → ${detailData[detailData.length - 1].date}`
                      : '—'}
                  </span>
                </DetailMeta>
              </DetailHeader>

              {detailLoading && <Message $variant="info">Loading value history…</Message>}
              {!detailLoading && detailError && <Message $variant="error">{detailError}</Message>}
              {!detailLoading && !detailError && detailData && detailData.length > 0 && (
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
              )}
            </DetailCard>
          )}
        </>
      )}
    </PageContainer>
  );
}
