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
import { Container, Header, HeaderLeft, HeaderRight, Meta, Title, Description, Card, Button, SmallButton, PageHeaderControls } from '../components/PageLayout';
import { TanStackTable } from '../components/TanStackTable';
import { historicalFxService } from '../services/historicalFxService';
import { fxRateDataService } from '../services/fxRateDataService';
import { FxRateRecord } from '../types/FxRateData';
import { CURRENCY_PAIRS } from '../config/currencies';

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

  const handleRowClick = async (row: Row<CurrencyPairData>) => {
    const item = row.original;
    const key = getPairKey(item.fromCurrency, item.toCurrency);

    row.toggleExpanded();

    if (!row.getIsExpanded()) {
      const existing = seriesState[key];
      if (existing?.data || existing?.loading) {
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
      } catch (error) {
        setSeriesState(prev => ({
          ...prev,
          [key]: { loading: false, error: 'Failed to load chart data' },
        }));
      }
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
            </ChartStats>
          </ChartHeader>
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
        </ChartContainer>
      );
    },
    [seriesState]
  );

  const isDownloadingAny = downloading.size > 0;

  return (
    <Container>
      <Header>
        <HeaderLeft>
          <Meta>Data Management</Meta>
          <Title>Currency Data</Title>
          <Description>Manage foreign exchange rate data for all supported currencies</Description>
        </HeaderLeft>
        <HeaderRight>
          <PageHeaderControls />
        </HeaderRight>
      </Header>

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
