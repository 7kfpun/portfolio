import { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Download, Check, X, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Container, Header, Meta, Title, Description, Card } from '../components/PageLayout';
import { historicalFxService } from '../services/historicalFxService';
import { fxRateDataService } from '../services/fxRateDataService';
import { FxRateRecord } from '../types/FxRateData';

const TableContainer = styled.div`
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  overflow: hidden;
  background: white;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  max-height: 600px;
  overflow-y: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
`;

const Thead = styled.thead`
  position: sticky;
  top: 0;
  background: #f8fafc;
  z-index: 10;
`;

const Th = styled.th<{ $sortable?: boolean }>`
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #475569;
  border-bottom: 2px solid #cbd5e1;
  white-space: nowrap;
  cursor: ${props => props.$sortable ? 'pointer' : 'default'};
  user-select: none;

  &:hover {
    background: ${props => props.$sortable ? '#e2e8f0' : 'transparent'};
  }
`;

const Tbody = styled.tbody``;

const Tr = styled.tr<{ $clickable?: boolean }>`
  &:nth-child(even) {
    background: #f8fafc;
  }

  &:hover {
    background: #f1f5f9;
  }

  cursor: ${props => (props.$clickable ? 'pointer' : 'default')};
`;

const Td = styled.td`
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  color: #1e293b;
`;

const IconCell = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ExpandedRow = styled.tr`
  background: #fefefe;
`;

const ExpandedCell = styled.td`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
`;

const ChartContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const ChartTitle = styled.div`
  font-weight: 600;
  color: #0f172a;
`;

const ChartSubtitle = styled.div`
  font-size: 0.75rem;
  color: #475569;
`;

const ChartStats = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.75rem;
  color: #475569;
`;

const StatBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: #e0e7ff;
  color: #312e81;
  font-weight: 600;
`;

const ChartWrapper = styled.div`
  width: 100%;
  height: 220px;
`;

const DownloadButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #667eea;
  background: white;
  border: 1px solid #c7d2fe;
  border-radius: 6px;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover:not(:disabled) {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #64748b;
  font-size: 0.875rem;
`;

type DownloadFeedbackStatus = 'pending' | 'success' | 'error';

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const SpinnerIcon = styled(Loader2)`
  animation: ${spin} 1s linear infinite;
`;

const DownloadFeedbackText = styled.div<{ $status: DownloadFeedbackStatus }>`
  font-size: 0.65rem;
  margin-top: 0.35rem;
  color: ${props => {
    switch (props.$status) {
      case 'success':
        return '#16a34a';
      case 'error':
        return '#dc2626';
      default:
        return '#0ea5e9';
    }
  }};
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

const CURRENCY_PAIRS = [
  { from: 'USD', to: 'TWD' },
  { from: 'USD', to: 'JPY' },
  { from: 'USD', to: 'HKD' },
];

export function CurrencyDataPage() {
  const [pairData, setPairData] = useState<CurrencyPairData[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'from' | 'to'>('from');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [downloadFeedback, setDownloadFeedback] = useState<Record<string, { status: DownloadFeedbackStatus; message: string }>>({});
  const [expandedPair, setExpandedPair] = useState<string | null>(null);
  const [seriesState, setSeriesState] = useState<Record<string, { loading: boolean; data?: FxRateRecord[]; error?: string }>>({});

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

  const handleRowClick = async (item: CurrencyPairData) => {
    const key = getPairKey(item.fromCurrency, item.toCurrency);
    if (expandedPair === key) {
      setExpandedPair(null);
      return;
    }

    setExpandedPair(key);

    const existing = seriesState[key];
    if (existing?.data || existing?.loading) {
      return;
    }

    setSeriesState(prev => ({
      ...prev,
      [key]: { loading: true },
    }));

    try {
      const records = await fxRateDataService.getRatesForPair(
        item.fromCurrency,
        item.toCurrency
      );
      setSeriesState(prev => ({
        ...prev,
        [key]: { loading: false, data: records },
      }));
    } catch (error) {
      console.error('Failed to load FX series:', error);
      setSeriesState(prev => ({
        ...prev,
        [key]: { loading: false, error: 'Failed to load chart data' },
      }));
    }
  };

  const buildChartInfo = (records: FxRateRecord[]) => {
    if (!records || records.length === 0) {
      return null;
    }
    const sorted = [...records].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const MAX_POINTS = 240;
    const slice = sorted.length > MAX_POINTS ? sorted.slice(-MAX_POINTS) : sorted;
    if (slice.length === 0) {
      return null;
    }
    const values = slice.map(r => r.rate);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = slice[slice.length - 1].rate;
    const startDate = slice[0].date;
    const endDate = slice[slice.length - 1].date;

    const data = slice.map(record => ({
      date: record.date,
      rate: record.rate,
    }));

    return { data, min, max, latest, startDate, endDate, count: slice.length };
  };

  const formatRate = (value: number | null, digits = 6) =>
    value !== null && value !== undefined ? value.toFixed(digits) : '-';

  const formatTickDate = (value: string) => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}`;
    }
    return value;
  };

  const handleDownloadPair = async (fromCurrency: string, toCurrency: string) => {
    const key = `${fromCurrency}_${toCurrency}`;
    try {
      setDownloading(prev => new Set(prev).add(key));
      setDownloadFeedback(prev => ({
        ...prev,
        [key]: { status: 'pending', message: 'Downloading 15 years...' },
      }));

      await historicalFxService.downloadFxPair(fromCurrency, toCurrency);

      setDownloadFeedback(prev => ({
        ...prev,
        [key]: { status: 'success', message: `Updated at ${new Date().toLocaleTimeString()}` },
      }));
      setTimeout(() => {
        setDownloadFeedback(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 6000);
      await loadCurrencyData();
    } catch (error) {
      console.error('Failed to download currency pair:', error);
      setDownloadFeedback(prev => ({
        ...prev,
        [key]: { status: 'error', message: 'Download failed. Check logs.' },
      }));
      setTimeout(() => {
        setDownloadFeedback(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 6000);
    } finally {
      setDownloading(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleDownloadAll = async () => {
    for (const pair of CURRENCY_PAIRS) {
      await handleDownloadPair(pair.from, pair.to);
    }
  };

  const handleSort = (field: 'from' | 'to') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    const sorted = [...pairData];
    sorted.sort((a, b) => {
      const aVal = sortField === 'from' ? a.fromCurrency : a.toCurrency;
      const bVal = sortField === 'from' ? b.fromCurrency : b.toCurrency;

      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
    return sorted;
  }, [pairData, sortField, sortDirection]);

  const renderSortIcon = (field: 'from' | 'to') => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const isDownloadingAny = downloading.size > 0;

  return (
    <Container>
      <Header>
        <Meta>Currency Exchange Rates</Meta>
        <Title>Currency Data</Title>
        <Description>
          Download and manage historical FX rates for the last 15 years (USD as base)
        </Description>
      </Header>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <DownloadButton onClick={handleDownloadAll} disabled={isDownloadingAny}>
            {isDownloadingAny ? <SpinnerIcon size={14} /> : <Download size={14} />}
            {isDownloadingAny ? 'Downloading...' : 'Download All'}
          </DownloadButton>
        </div>
        <TableContainer>
          <TableWrapper>
            <Table>
              <Thead>
                <tr>
                  <Th $sortable onClick={() => handleSort('from')}>
                    From Currency {renderSortIcon('from')}
                  </Th>
                  <Th $sortable onClick={() => handleSort('to')}>
                    To Currency {renderSortIcon('to')}
                  </Th>
                  <Th style={{ textAlign: 'center' }}>Has Data</Th>
                  <Th style={{ textAlign: 'right' }}>Latest Rate</Th>
                  <Th>Date Range</Th>
                  <Th style={{ textAlign: 'right' }}>Records</Th>
                  <Th style={{ textAlign: 'center' }}>Action</Th>
                </tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <tr>
                    <Td colSpan={7}>
                      <EmptyState>
                        <SpinnerIcon size={18} /> Loading currency pairs...
                      </EmptyState>
                    </Td>
                  </tr>
                ) : sortedData.length === 0 ? (
                  <tr>
                    <Td colSpan={7}>
                      <EmptyState>No currency pairs configured</EmptyState>
                    </Td>
                  </tr>
                ) : (
                  sortedData.map(item => {
                    const key = getPairKey(item.fromCurrency, item.toCurrency);
                    const isDownloading = downloading.has(key);
                    const feedback = downloadFeedback[key];
                    const isExpanded = expandedPair === key;
                    const series = seriesState[key];
                    const chartInfo = series?.data ? buildChartInfo(series.data) : null;

                    return (
                      <>
                        <Tr
                          $clickable
                          onClick={() => handleRowClick(item)}
                          aria-expanded={isExpanded}
                        >
                          <Td style={{ fontWeight: 600 }}>{item.fromCurrency}</Td>
                          <Td style={{ fontWeight: 600 }}>{item.toCurrency}</Td>
                          <Td style={{ textAlign: 'center' }}>
                            <IconCell>
                              {item.hasData ? (
                              <Check size={16} color="#16a34a" />
                            ) : (
                              <X size={16} color="#dc2626" />
                            )}
                          </IconCell>
                        </Td>
                        <Td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          {item.latestRate !== null ? item.latestRate.toFixed(6) : '-'}
                        </Td>
                        <Td style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {item.earliestDate && item.latestDate
                            ? `${item.earliestDate} to ${item.latestDate}`
                            : '-'}
                        </Td>
                        <Td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {item.recordCount > 0 ? item.recordCount.toLocaleString() : '-'}
                        </Td>
                        <Td style={{ textAlign: 'center' }}>
                          <DownloadButton
                            onClick={event => {
                              event.stopPropagation();
                              handleDownloadPair(item.fromCurrency, item.toCurrency);
                            }}
                            disabled={isDownloading}
                          >
                            {isDownloading ? <SpinnerIcon size={14} /> : <Download size={14} />}
                            {isDownloading ? 'Downloading...' : 'Download'}
                          </DownloadButton>
                          {feedback && (
                            <DownloadFeedbackText $status={feedback.status}>
                              {feedback.message}
                            </DownloadFeedbackText>
                          )}
                        </Td>
                      </Tr>
                      {isExpanded && (
                        <ExpandedRow>
                          <ExpandedCell colSpan={7}>
                            {series?.loading && (
                              <EmptyState>
                                <SpinnerIcon size={16} /> Loading chart...
                              </EmptyState>
                            )}
                            {series?.error && (
                              <DownloadFeedbackText $status="error">
                                {series.error}
                              </DownloadFeedbackText>
                            )}
                            {!series?.loading && !series?.error && chartInfo && (
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
                            )}
                            {!series?.loading && !series?.error && !chartInfo && (
                              <DownloadFeedbackText $status="error">
                                No historical data available yet.
                              </DownloadFeedbackText>
                            )}
                          </ExpandedCell>
                        </ExpandedRow>
                      )}
                    </>
                    );
                  })
                )}
              </Tbody>
            </Table>
          </TableWrapper>
        </TableContainer>
      </Card>
    </Container>
  );
}
