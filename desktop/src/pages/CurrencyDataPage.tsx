import { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Download, Check, X, Loader2, RefreshCw } from 'lucide-react';
import { ColumnDef, Row } from '@tanstack/react-table';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Container, PageHeader, Card, Button, SmallButton } from '../components/PageLayout';
import { TanStackTable } from '../components/TanStackTable';
import { historicalFxService } from '../services/historicalFxService';
import { fxRateDataService } from '../services/fxRateDataService';
import { FxRateRecord } from '../types/FxRateData';
import { CURRENCY_PAIRS } from '../config/currencies';
import { useFxOverridesStore, FX_TABLE_PAGE_SIZE } from '../store/fxOverridesStore';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const SpinnerIcon = styled(Loader2)`
  animation: ${spin} 1s linear infinite;
`;

const DownloadProgress = styled.div`
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

const IconCell = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const StatusBadge = styled.div<{ $status: 'success' | 'pending' | 'error' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
  border-radius: 4px;
  font-weight: 500;
  background: ${props => {
    switch (props.$status) {
      case 'success':
        return '#d1fae5';
      case 'pending':
        return '#dbeafe';
      case 'error':
        return '#fee2e2';
      default:
        return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'success':
        return '#065f46';
      case 'pending':
        return '#1e40af';
      case 'error':
        return '#991b1b';
      default:
        return '#374151';
    }
  }};
`;

const ChartContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.5rem 0;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
`;

const ChartTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e293b;
`;

const ChartSubtitle = styled.div`
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 0.25rem;
`;

const ChartStats = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const StatBadge = styled.div`
  padding: 0.25rem 0.5rem;
  background: #f1f5f9;
  border-radius: 4px;
  font-size: 0.7rem;
  color: #475569;
  font-weight: 500;
`;

const ChartWrapper = styled.div`
  width: 100%;
  height: 220px;
`;

const ViewToggle = styled.div`
  display: inline-flex;
  background: #f1f5f9;
  border-radius: 999px;
  padding: 0.25rem;
  gap: 0.25rem;
`;

const ToggleButton = styled.button<{ $active?: boolean }>`
  border: none;
  background: ${props => (props.$active ? '#ffffff' : 'transparent')};
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  color: ${props => (props.$active ? '#0f172a' : '#475569')};
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #fff;
  }
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
`;

const EditableTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;

  th,
  td {
    padding: 0.5rem;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
    white-space: nowrap;
  }

  th {
    background: #f8fafc;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #475569;
  }
`;

const EditableInput = styled.input`
  width: 100%;
  border: 1px solid #cbd5f5;
  border-radius: 4px;
  padding: 0.25rem 0.375rem;
  font-size: 0.8rem;
  font-family: 'Inter', sans-serif;

  &:focus {
    border-color: #6366f1;
    outline: none;
    box-shadow: 0 0 0 1px #6366f1;
  }
`;

const TableActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const InlineBadge = styled.span<{ $tone?: 'neutral' | 'success' | 'error' }>`
  font-size: 0.75rem;
  border-radius: 12px;
  padding: 0.2rem 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: ${props => {
    switch (props.$tone) {
      case 'success':
        return '#dcfce7';
      case 'error':
        return '#fee2e2';
      default:
        return '#e2e8f0';
    }
  }};
  color: ${props => {
    switch (props.$tone) {
      case 'success':
        return '#15803d';
      case 'error':
        return '#b91c1c';
      default:
        return '#475569';
    }
  }};
`;

const PaginationControls = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
`;

const PaginationButton = styled.button`
  border: 1px solid #cbd5f5;
  background: #fff;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.1s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: #f1f5f9;
  }
`;

const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  color: #64748b;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

interface CurrencyPairData {
  fromCurrency: string;
  toCurrency: string;
  latestRate: number | null;
  latestDate: string | null;
  earliestDate: string | null;
  recordCount: number;
  hasData: boolean;
}

type DownloadStatus = 'pending' | 'success' | 'error';

export function CurrencyDataPage() {
  const [pairData, setPairData] = useState<CurrencyPairData[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [downloadFeedback, setDownloadFeedback] = useState<
    Record<string, { status: DownloadStatus; message: string }>
  >({});
  const [seriesState, setSeriesState] = useState<
    Record<string, { loading: boolean; data?: FxRateRecord[]; error?: string }>
  >({});
  const pairStates = useFxOverridesStore(state => state.items);
  const ensurePairState = useFxOverridesStore(state => state.ensureItem);
  const setPairViewMode = useFxOverridesStore(state => state.setViewMode);
  const addPairRow = useFxOverridesStore(state => state.addRow);
  const updatePairRowField = useFxOverridesStore(state => state.updateRowField);
  const revertPairRow = useFxOverridesStore(state => state.revertRow);
  const removePairRow = useFxOverridesStore(state => state.removeRow);
  const replacePairRows = useFxOverridesStore(state => state.replaceRows);
  const setPairPage = useFxOverridesStore(state => state.setPage);
  const setPairSaving = useFxOverridesStore(state => state.setSaving);
  const setPairFeedback = useFxOverridesStore(state => state.setFeedback);
  const clearPairPending = useFxOverridesStore(state => state.clearPending);
  const getPairPendingRows = useFxOverridesStore(state => state.getPendingRows);
  const [downloadAllProgress, setDownloadAllProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const loadCurrencyData = useCallback(async () => {
    try {
      setLoading(true);
      const allRates = await fxRateDataService.loadAllRates({ latestOnly: false });

      const data: CurrencyPairData[] = CURRENCY_PAIRS.map(pair => {
        const rates = allRates.filter(
          r => r.from_currency === pair.from && r.to_currency === pair.to
        );
        const sorted = rates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latest = sorted[0];
        const earliest = sorted[sorted.length - 1];

        return {
          fromCurrency: pair.from,
          toCurrency: pair.to,
          latestRate: latest?.rate ?? null,
          latestDate: latest?.date ?? null,
          earliestDate: earliest?.date ?? null,
          recordCount: rates.length,
          hasData: rates.length > 0,
        };
      });

      setPairData(data);
    } catch (error) {
      console.error('Failed to load currency data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrencyData();
  }, [loadCurrencyData]);

  const getPairKey = (fromCurrency: string, toCurrency: string) =>
    `${fromCurrency}_${toCurrency}`;

  const handleToggleViewMode = (key: string, mode: 'chart' | 'table', fallbackData?: FxRateRecord[]) => {
    if (!pairStates[key] && fallbackData) {
      ensurePairState(key, fallbackData);
    }
    setPairViewMode(key, mode);
  };

  const handleAddOverrideRow = (item: CurrencyPairData) => {
    const key = getPairKey(item.fromCurrency, item.toCurrency);
    if (!pairStates[key]) {
      const baseRows = seriesState[key]?.data ?? [];
      ensurePairState(key, baseRows);
    }
    addPairRow(key, { from_currency: item.fromCurrency, to_currency: item.toCurrency, source: 'manual' });
  };

  const handleEditableCellChange = (
    key: string,
    rowId: string,
    field: 'date' | 'rate',
    value: string
  ) => {
    if (field === 'rate') {
      const numValue = parseFloat(value);
      updatePairRowField(key, rowId, field, (Number.isFinite(numValue) ? numValue : value) as any);
    } else {
      updatePairRowField(key, rowId, field, value);
    }
  };

  const handleRevertRow = (key: string, rowId: string) => {
    revertPairRow(key, rowId);
  };

  const handleRemoveRow = (key: string, rowId: string) => {
    removePairRow(key, rowId);
  };

  const handleSaveOverrides = async (item: CurrencyPairData) => {
    const key = getPairKey(item.fromCurrency, item.toCurrency);
    const pairState = pairStates[key];
    if (!pairState) return;

    const pendingRows = Object.values(pairState.pending);

    if (!pendingRows.length) {
      setPairFeedback(key, { status: 'error', message: 'Add at least one dated row before saving' });
      return;
    }

    setPairSaving(key, true);
    setPairFeedback(key, undefined);

    try {
      const toDelete = pendingRows.filter((row: any) => row._shouldDelete);
      const toSave = pendingRows.filter((row: any) => !row._shouldDelete);

      const datesToDelete = new Set<string>();
      for (const deleteRow of toDelete) {
        datesToDelete.add(deleteRow.date);
      }

      for (const saveRow of toSave) {
        if ((saveRow as any)._originalDate && (saveRow as any)._originalDate !== saveRow.date) {
          datesToDelete.add((saveRow as any)._originalDate);
        }
      }

      for (const dateToDelete of datesToDelete) {
        await fxRateDataService.removeOverrideRate(
          item.fromCurrency,
          item.toCurrency,
          dateToDelete
        );
      }

      if (toSave.length > 0) {
        await fxRateDataService.saveOverrideRatesForPair(item.fromCurrency, item.toCurrency, toSave);
      }

      const refreshed = await fxRateDataService.getRatesForPair(item.fromCurrency, item.toCurrency);

      setSeriesState(prev => ({
        ...prev,
        [key]: {
          loading: false,
          data: refreshed,
        },
      }));
      replacePairRows(key, refreshed);
      clearPairPending(key);
      setPairFeedback(key, { status: 'success', message: 'Saved overrides' });
      await loadCurrencyData();
      setTimeout(() => {
        setPairFeedback(key, undefined);
      }, 3000);
    } catch (error) {
      console.error('Failed to save overrides', error);
      setPairFeedback(key, { status: 'error', message: 'Failed to save overrides' });
    } finally {
      setPairSaving(key, false);
    }
  };

  const handleRowClick = async (row: Row<CurrencyPairData>) => {
    const item = row.original;
    const key = getPairKey(item.fromCurrency, item.toCurrency);
    const willExpand = !row.getIsExpanded();

    row.toggleExpanded();

    if (!willExpand) {
      return;
    }

    const existing = seriesState[key];
    if (existing?.data) {
      ensurePairState(key, existing.data);
      return;
    }
    if (existing?.loading) {
      return;
    }

    setSeriesState(prev => ({
      ...prev,
      [key]: { loading: true },
    }));

    try {
      const rates = await fxRateDataService.getRatesForPair(
        item.fromCurrency,
        item.toCurrency
      );

      setSeriesState(prev => ({
        ...prev,
        [key]: { loading: false, data: rates },
      }));
      replacePairRows(key, rates);
    } catch (error) {
      setSeriesState(prev => ({
        ...prev,
        [key]: { loading: false, error: 'Failed to load chart data' },
      }));
    }
  };

  const handleDownloadPair = async (fromCurrency: string, toCurrency: string) => {
    const key = getPairKey(fromCurrency, toCurrency);
    try {
      setDownloading(prev => new Set(prev).add(key));
      setDownloadFeedback(prev => ({
        ...prev,
        [key]: { status: 'pending', message: 'Downloading 15 years...' },
      }));

      await historicalFxService.downloadFxPair(fromCurrency, toCurrency);

      setDownloadFeedback(prev => ({
        ...prev,
        [key]: { status: 'success', message: `Downloaded successfully` },
      }));

      // Reload data after successful download
      await loadCurrencyData();

      setTimeout(() => {
        setDownloadFeedback(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 3000);
    } catch (error) {
      console.error(`Failed to download currency pair:`, error);
      setDownloadFeedback(prev => ({
        ...prev,
        [key]: { status: 'error', message: 'Download failed' },
      }));
      setTimeout(() => {
        setDownloadFeedback(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 5000);
    } finally {
      setDownloading(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleDownloadAll = async () => {
    setDownloadAllProgress({ current: 0, total: CURRENCY_PAIRS.length });
    let current = 0;

    for (const pair of CURRENCY_PAIRS) {
      await handleDownloadPair(pair.from, pair.to);
      current++;
      setDownloadAllProgress({ current, total: CURRENCY_PAIRS.length });

      // Rate limiting: wait 100ms between downloads
      if (current < CURRENCY_PAIRS.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setTimeout(() => {
      setDownloadAllProgress(null);
    }, 2000);
  };

  const buildChartInfo = (data: FxRateRecord[]) => {
    if (data.length === 0) return null;

    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const chartData = sorted.map(r => ({
      date: r.date,
      rate: r.rate,
    }));

    const rates = sorted.map(r => r.rate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);

    return {
      data: chartData,
      min,
      max,
      latest: sorted[sorted.length - 1].rate,
      startDate: sorted[0].date,
      endDate: sorted[sorted.length - 1].date,
      count: sorted.length,
    };
  };

  const formatRate = (value: number, decimals: number) => value.toFixed(decimals);

  const formatTickDate = (value: string) => {
    const date = new Date(value);
    return `${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const columns = useMemo<ColumnDef<CurrencyPairData>[]>(
    () => [
      {
        accessorKey: 'fromCurrency',
        header: 'From',
        enableSorting: true,
        cell: info => <strong>{info.getValue() as string}</strong>,
        meta: {
          cellStyle: { fontWeight: 600 },
        },
      },
      {
        accessorKey: 'toCurrency',
        header: 'To',
        enableSorting: true,
        cell: info => <strong>{info.getValue() as string}</strong>,
        meta: {
          cellStyle: { fontWeight: 600 },
        },
      },
      {
        accessorKey: 'hasData',
        header: 'Status',
        enableSorting: true,
        cell: info => (
          <IconCell>
            {info.getValue() ? (
              <Check size={16} color="#16a34a" />
            ) : (
              <X size={16} color="#dc2626" />
            )}
          </IconCell>
        ),
        meta: {
          headerStyle: { textAlign: 'center' },
          cellStyle: { textAlign: 'center' },
        },
      },
      {
        accessorKey: 'latestRate',
        header: 'Latest Rate',
        enableSorting: true,
        cell: info => {
          const value = info.getValue() as number | null;
          return value !== null ? value.toFixed(6) : '-';
        },
        meta: {
          headerStyle: { textAlign: 'right' },
          cellStyle: { textAlign: 'right', fontFamily: 'monospace' },
        },
      },
      {
        id: 'dateRange',
        header: 'Date Range',
        enableSorting: false,
        cell: ({ row }) => {
          const item = row.original;
          return item.earliestDate && item.latestDate
            ? `${item.earliestDate} to ${item.latestDate}`
            : '-';
        },
        meta: {
          cellStyle: { fontSize: '0.7rem', color: '#64748b' },
        },
      },
      {
        accessorKey: 'recordCount',
        header: 'Records',
        enableSorting: true,
        cell: info => {
          const value = info.getValue() as number;
          return value > 0 ? value.toLocaleString() : '-';
        },
        meta: {
          headerStyle: { textAlign: 'right' },
          cellStyle: { textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem' },
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => {
          const item = row.original;
          const key = getPairKey(item.fromCurrency, item.toCurrency);
          const isDownloading = downloading.has(key);
          const feedback = downloadFeedback[key];

          return (
            <div>
              <SmallButton
                $variant="primary"
                $loading={isDownloading}
                onClick={event => {
                  event.stopPropagation();
                  handleDownloadPair(item.fromCurrency, item.toCurrency);
                }}
                disabled={isDownloading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap' }}
              >
                {isDownloading ? <SpinnerIcon size={14} /> : <Download size={14} />}
                {isDownloading ? 'Downloading...' : 'Download'}
              </SmallButton>
              {feedback && (
                <StatusBadge $status={feedback.status}>{feedback.message}</StatusBadge>
              )}
            </div>
          );
        },
        meta: {
          headerStyle: { textAlign: 'center' },
          cellStyle: { textAlign: 'center' },
        },
      },
    ],
    [downloading, downloadFeedback]
  );

  const renderExpandedRow = useCallback(
    (row: Row<CurrencyPairData>) => {
      const item = row.original;
      const key = getPairKey(item.fromCurrency, item.toCurrency);
      const series = seriesState[key];
      const chartInfo = series?.data ? buildChartInfo(series.data) : null;

      if (series?.loading) {
        return (
          <EmptyState>
            <SpinnerIcon size={16} /> Loading chart...
          </EmptyState>
        );
      }

      if (series?.error) {
        return <StatusBadge $status="error">{series.error}</StatusBadge>;
      }

      if (!chartInfo) {
        return <StatusBadge $status="error">No historical data available yet.</StatusBadge>;
      }

      const pairState = pairStates[key];
      const viewMode = pairState?.viewMode ?? 'chart';
      const rows = pairState?.rows ?? [];
      const totalRowCount = rows.length;
      const totalPages = totalRowCount > 0 ? Math.ceil(totalRowCount / FX_TABLE_PAGE_SIZE) : 1;
      const currentPage = Math.min(pairState?.page ?? 0, Math.max(totalPages - 1, 0));
      const pageStartIndex = currentPage * FX_TABLE_PAGE_SIZE;
      const pagedRows =
        totalRowCount > 0
          ? rows.slice(pageStartIndex, pageStartIndex + FX_TABLE_PAGE_SIZE)
          : [];
      const pageStartDisplay = totalRowCount > 0 ? pageStartIndex + 1 : 0;
      const pageEndDisplay = totalRowCount > 0 ? pageStartIndex + pagedRows.length : 0;
      const canGoPrev = currentPage > 0;
      const canGoNext = currentPage < totalPages - 1 && totalRowCount > 0;
      const isSaving = Boolean(pairState?.saving);
      const feedback = pairState?.feedback;
      const pendingCount = Object.keys(pairState?.pending ?? {}).length;
      const dirty = pendingCount > 0;

      const updatePage = (nextPage: number) => {
        const clamped = Math.max(0, Math.min(totalPages - 1, nextPage));
        setPairPage(key, clamped);
      };

      return (
        <ChartContainer>
          <ChartHeader>
            <div>
              <ChartTitle>
                {item.fromCurrency}/{item.toCurrency} history
              </ChartTitle>
              <ChartSubtitle>
                Showing last {chartInfo.count} days ({chartInfo.startDate} → {chartInfo.endDate})
              </ChartSubtitle>
            </div>
            <ChartStats>
              <StatBadge>Min: {formatRate(chartInfo.min, 4)}</StatBadge>
              <StatBadge>Max: {formatRate(chartInfo.max, 4)}</StatBadge>
              <StatBadge>Last: {formatRate(chartInfo.latest, 4)}</StatBadge>
              <ViewToggle>
                <ToggleButton
                  type="button"
                  $active={viewMode === 'chart'}
                  onClick={() => handleToggleViewMode(key, 'chart')}
                >
                  Chart
                </ToggleButton>
                <ToggleButton
                  type="button"
                  $active={viewMode === 'table'}
                  onClick={() => {
                    handleToggleViewMode(key, 'table', series.data ?? []);
                  }}
                >
                  Table
                </ToggleButton>
              </ViewToggle>
            </ChartStats>
          </ChartHeader>
          {viewMode === 'chart' ? (
            <ChartWrapper>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartInfo.data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`rateGradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    minTickGap={20}
                    tickFormatter={formatTickDate}
                    fontSize={10}
                    stroke="#94a3b8"
                  />
                  <YAxis
                    domain={[chartInfo.min, chartInfo.max]}
                    width={60}
                    tickFormatter={value => formatRate(value as number, 4)}
                    fontSize={10}
                    stroke="#94a3b8"
                  />
                  <Tooltip
                    formatter={value => formatRate(value as number, 6)}
                    labelFormatter={value => value}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill={`url(#rateGradient-${key})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartWrapper>
          ) : (
            <>
              <TableActions>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <SmallButton $variant="ghost" onClick={() => handleAddOverrideRow(item)}>
                    + Add Row
                  </SmallButton>
                  {dirty && <InlineBadge $tone="neutral">Unsaved changes</InlineBadge>}
                  {feedback && <InlineBadge $tone={feedback.status}>{feedback.message}</InlineBadge>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <SmallButton
                    $variant="primary"
                    onClick={() => handleSaveOverrides(item)}
                    disabled={isSaving}
                    $loading={isSaving}
                    style={{ minWidth: '120px' }}
                  >
                    {isSaving ? 'Saving…' : 'Save overrides'}
                  </SmallButton>
                </div>
              </TableActions>
              <TableWrapper>
                <EditableTable>
                  <thead>
                    <tr>
                      <th style={{ width: '140px' }}>Date (YYYY-MM-DD)</th>
                      <th style={{ width: '120px' }}>Rate</th>
                      <th>Source</th>
                      <th>Updated</th>
                      <th style={{ width: '110px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {totalRowCount === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '1rem' }}>
                          No data available
                        </td>
                      </tr>
                    ) : (
                      pagedRows.map(row => {
                        const isNewRow = !row.original;
                        const isManualOverride = row.original?.source === 'manual';
                        const hasEdits = Boolean(
                          row.original &&
                          (row.date !== row.original.date || row.rate !== row.original.rate)
                        );
                        const isMarkedForDeletion = row._markedForDeletion === true;
                        const canRevert = isManualOverride || hasEdits;
                        const revertLabel = isMarkedForDeletion ? 'Undo' : hasEdits ? 'Revert' : 'Delete';
                        const isDisabled = isMarkedForDeletion;
                        const rowStyle = isMarkedForDeletion
                          ? { opacity: 0.5, textDecoration: 'line-through' }
                          : {};
                        return (
                          <tr key={row._rowId} style={rowStyle}>
                            <td>
                              <EditableInput
                                type="text"
                                value={row.date}
                                placeholder="YYYY-MM-DD"
                                pattern="\d{4}-\d{2}-\d{2}"
                                disabled={isDisabled}
                                onChange={event =>
                                  handleEditableCellChange(
                                    key,
                                    row._rowId,
                                    'date',
                                    event.target.value
                                  )
                                }
                              />
                            </td>
                            <td>
                              <EditableInput
                                type="number"
                                step="0.000001"
                                value={Number.isFinite(row.rate) ? row.rate : ''}
                                disabled={isDisabled}
                                onChange={event =>
                                  handleEditableCellChange(
                                    key,
                                    row._rowId,
                                    'rate',
                                    event.target.value
                                  )
                                }
                              />
                            </td>
                            <td>{row.source === 'manual' ? 'Manual' : 'Yahoo Finance'}</td>
                            <td>{row.updated_at ? new Date(row.updated_at).toLocaleString() : '-'}</td>
                            <td>
                              {isNewRow ? (
                                <SmallButton
                                  $variant="ghost"
                                  onClick={() => handleRemoveRow(key, row._rowId)}
                                >
                                  Remove
                                </SmallButton>
                              ) : (
                                <SmallButton
                                  $variant="ghost"
                                  disabled={!canRevert}
                                  onClick={() => handleRevertRow(key, row._rowId)}
                                >
                                  {revertLabel}
                                </SmallButton>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </EditableTable>
              </TableWrapper>
              {totalRowCount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <PaginationControls>
                    <span>
                      Showing {pageStartDisplay}-{pageEndDisplay} of {totalRowCount}
                    </span>
                    <PaginationButton
                      type="button"
                      onClick={() => updatePage(currentPage - 1)}
                      disabled={!canGoPrev}
                    >
                      Prev
                    </PaginationButton>
                    <PaginationButton
                      type="button"
                      onClick={() => updatePage(currentPage + 1)}
                      disabled={!canGoNext}
                    >
                      Next
                    </PaginationButton>
                  </PaginationControls>
                </div>
              )}
            </>
          )}
        </ChartContainer>
      );
    },
    [
      seriesState,
      pairStates,
      handleToggleViewMode,
      handleAddOverrideRow,
      handleSaveOverrides,
      handleEditableCellChange,
      handleRevertRow,
      handleRemoveRow,
      setPairPage,
    ]
  );

  const isDownloadingAny = downloading.size > 0;

  return (
    <Container>
      <PageHeader
        meta="Data Management"
        title="Currency Data"
        description="Manage foreign exchange rate data for all supported currencies"
      />

      <Card>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Currency Pairs</h2>
          <Button
            $variant="secondary"
            disabled={isDownloadingAny}
            onClick={handleDownloadAll}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {isDownloadingAny ? <SpinnerIcon size={16} /> : <RefreshCw size={16} />}
            Download All ({CURRENCY_PAIRS.length} pairs)
          </Button>
        </div>
        {downloadAllProgress && (
          <DownloadProgress>
            Downloading: {downloadAllProgress.current} / {downloadAllProgress.total}
          </DownloadProgress>
        )}

        <TanStackTable
          data={pairData}
          columns={columns}
          onRowClick={handleRowClick}
          renderExpandedRow={renderExpandedRow}
          emptyMessage="No currency pairs configured"
          initialSorting={[{ id: 'fromCurrency', desc: false }]}
        />
      </Card>
    </Container >
  );
}
