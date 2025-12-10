import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Download, Check, X, ChevronUp, ChevronDown, Square, Loader2 } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { Container, Header, HeaderLeft, HeaderRight, Meta, Title, Description, Card, PageHeaderControls } from '../components/PageLayout';
import { historicalDataService } from '../services/historicalDataService';
import { bulkDownloadManager, BulkDownloadState } from '../services/bulkDownloadManager';
import { StockDataCoverage, SplitHistory } from '../types/HistoricalData';
import { priceDataService } from '../services/priceDataService';
import { PriceRecord } from '../types/PriceData';

const TableContainer = styled.div`
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  overflow: hidden;
  background: white;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  max-height: 700px;
  overflow-y: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
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
    background: #e0e7ff;
  }

  cursor: ${props => (props.$clickable ? 'pointer' : 'default')};
`;

const Td = styled.td`
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  color: #0f172a;
  white-space: nowrap;
`;

const IconCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DownloadButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.75rem;
  border: 1px solid #c7d2fe;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  background: white;
  color: #667eea;
  cursor: pointer;
  transition: all 120ms ease;

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

const StopButton = styled(DownloadButton)`
  border-color: #fecaca;
  color: #dc2626;

  &:hover:not(:disabled) {
    background: #dc2626;
    color: white;
    border-color: #dc2626;
  }
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #64748b;
  font-size: 0.875rem;
`;

const StatusBar = styled.div`
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  margin-bottom: 0.75rem;
`;

const StatusText = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #1e293b;
  font-weight: 600;
`;

const StatusDetails = styled.div`
  font-size: 0.7rem;
  color: #475569;
  margin-top: 0.35rem;
`;

const ProgressBarContainer = styled.div`
  height: 6px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
  margin-top: 0.5rem;
`;

const ProgressFill = styled.div<{ $percent: number }>`
  height: 100%;
  background: #6366f1;
  width: ${props => Math.min(100, Math.max(0, props.$percent))}%;
  transition: width 250ms ease;
`;

type DownloadFeedbackStatus = 'pending' | 'success' | 'error';

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

export function DataReadinessPage() {
  const [dataCoverage, setDataCoverage] = useState<StockDataCoverage[]>([]);
  const [splitHistory, setSplitHistory] = useState<SplitHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'ticker' | 'exchange' | 'currency'>('ticker');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [bulkState, setBulkState] = useState<BulkDownloadState>(bulkDownloadManager.getState());
  const [downloadFeedback, setDownloadFeedback] = useState<Record<string, { status: DownloadFeedbackStatus; message: string }>>({});
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [seriesState, setSeriesState] = useState<Record<string, { loading: boolean; data?: PriceRecord[]; error?: string }>>({});
  const feedbackTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevBulkRunningRef = useRef<boolean>(bulkState.running);

  const coverageMap = useMemo(() => {
    const map = new Map<string, StockDataCoverage>();
    dataCoverage.forEach(item => {
      map.set(item.ticker, item);
    });
    return map;
  }, [dataCoverage]);

  const loadDataCoverage = useCallback(async () => {
    try {
      setLoading(true);
      const [coverage, splits] = await Promise.all([
        historicalDataService.getDataCoverage(),
        historicalDataService.getSplitHistory(),
      ]);
      setDataCoverage(coverage.sort((a, b) => a.ticker.localeCompare(b.ticker)));
      setSplitHistory(splits);
    } catch (error) {
      console.error('Failed to load data coverage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDataCoverage();
  }, [loadDataCoverage]);

  useEffect(() => {
    const unsubscribe = bulkDownloadManager.subscribe(state => setBulkState(state));
    return unsubscribe;
  }, []);

  const scheduleDataRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      return;
    }
    refreshTimeoutRef.current = setTimeout(async () => {
      await loadDataCoverage();
      refreshTimeoutRef.current = null;
    }, 4000);
  }, [loadDataCoverage]);

  useEffect(() => () => {
    Object.values(feedbackTimeouts.current).forEach(timeoutId => clearTimeout(timeoutId));
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (
      prevBulkRunningRef.current &&
      !bulkState.running &&
      bulkState.total > 0 &&
      bulkState.completed === bulkState.total
    ) {
      scheduleDataRefresh();
    }
    prevBulkRunningRef.current = bulkState.running;
  }, [bulkState, scheduleDataRefresh]);

  const setFeedback = useCallback(
    (ticker: string, entry: { status: DownloadFeedbackStatus; message: string }, autoClear = false) => {
      setDownloadFeedback(prev => ({
        ...prev,
        [ticker]: entry,
      }));

      if (autoClear) {
        if (feedbackTimeouts.current[ticker]) {
          clearTimeout(feedbackTimeouts.current[ticker]);
        }
        feedbackTimeouts.current[ticker] = setTimeout(() => {
          setDownloadFeedback(prev => {
            const next = { ...prev };
            delete next[ticker];
            return next;
          });
          delete feedbackTimeouts.current[ticker];
        }, 6000);
      }
    },
    []
  );

  const handleDownloadTicker = async (ticker: string) => {
    if (isTickerUpToDate(ticker)) {
      setFeedback(
        ticker,
        { status: 'pending', message: 'Forcing refresh…' },
        true
      );
    }
    try {
      setDownloading(prev => new Set(prev).add(ticker));
      setFeedback(ticker, { status: 'pending', message: 'Starting download…' });
      await historicalDataService.downloadHistoricalData([ticker]);
      setFeedback(ticker, { status: 'success', message: `Updated at ${new Date().toLocaleTimeString()}` }, true);
      scheduleDataRefresh();
    } catch (error) {
      console.error('Failed to download ticker:', error);
      setFeedback(ticker, { status: 'error', message: 'Download failed. Check logs.' }, true);
    } finally {
      setDownloading(prev => {
        const next = new Set(prev);
        next.delete(ticker);
        return next;
      });
    }
  };

  const getSplitInfo = (ticker: string) => {
    const tickerSplits = splitHistory.filter(s => s.ticker === ticker);
    return tickerSplits.length > 0 ? tickerSplits : null;
  };

  const hasHistoricalPrices = (item: StockDataCoverage) => {
    return item.earliestPrice !== null && item.latestPrice !== null;
  };

  const hasHistoricalSplits = (ticker: string) => {
    return getSplitInfo(ticker) !== null;
  };

  const isTickerUpToDate = useCallback(
    (ticker: string) => {
      const coverage = coverageMap.get(ticker);
      if (!coverage || !coverage.latestPrice) {
        return false;
      }
      const todayIso = new Date().toISOString().split('T')[0];
      return coverage.latestPrice >= todayIso;
    },
    [coverageMap]
  );

  const getBulkStatusForTicker = (ticker: string): 'running' | 'queued' | null => {
    if (!bulkState.running) {
      return null;
    }
    const queueIndex = bulkState.queue.indexOf(ticker);
    if (queueIndex === -1) {
      return null;
    }
    if (bulkState.currentTicker === ticker) {
      return 'running';
    }
    if (queueIndex >= bulkState.completed) {
      return 'queued';
    }
    return null;
  };

  const handleDownloadAll = useCallback(() => {
    if (bulkState.running) {
      return;
    }

    const todayIso = new Date().toISOString().split('T')[0];
    const tickersToDownload: string[] = [];

    dataCoverage.forEach(item => {
      if (item.latestPrice && item.latestPrice >= todayIso) {
        setFeedback(
          item.ticker,
          { status: 'success', message: 'Already up to date' },
          true
        );
      } else {
        tickersToDownload.push(item.ticker);
      }
    });

    if (tickersToDownload.length === 0) {
      return;
    }

    bulkDownloadManager.start(tickersToDownload);
  }, [bulkState.running, dataCoverage, setFeedback]);

  const handleStopAll = useCallback(() => {
    bulkDownloadManager.stop();
  }, []);

  const handleRowClick = async (item: StockDataCoverage) => {
    const ticker = item.ticker;
    if (expandedTicker === ticker) {
      setExpandedTicker(null);
      return;
    }

    setExpandedTicker(ticker);

    const existing = seriesState[ticker];
    if (existing?.data || existing?.loading) {
      return;
    }

    setSeriesState(prev => ({
      ...prev,
      [ticker]: { loading: true },
    }));

    try {
      const prices = await priceDataService.getPricesForSymbol(ticker);
      setSeriesState(prev => ({
        ...prev,
        [ticker]: { loading: false, data: prices },
      }));
    } catch (error) {
      console.error('Failed to load price series:', error);
      setSeriesState(prev => ({
        ...prev,
        [ticker]: { loading: false, error: 'Failed to load chart data' },
      }));
    }
  };

  const buildChartInfo = (records: PriceRecord[] | undefined) => {
    if (!records || records.length === 0) return null;
    const sorted = [...records].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const MAX_POINTS = 240;
    const slice = sorted.length > MAX_POINTS ? sorted.slice(-MAX_POINTS) : sorted;
    if (slice.length === 0) return null;

    const data = slice.map(record => ({
      date: record.date,
      close: record.close,
    }));

    const allValues = data.flatMap(d => [d.close]).filter((v): v is number => v !== undefined && v !== null);

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const latest = slice[slice.length - 1].close;
    const startDate = slice[0].date;
    const endDate = slice[slice.length - 1].date;

    return { data, min, max, latest, startDate, endDate, count: slice.length };
  };

  const formatPrice = (value: number | null | undefined, digits = 2) =>
    value !== null && value !== undefined
      ? Number(value).toFixed(digits)
      : '-';

  const formatTickDate = (value: string) => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}`;
    }
    return value;
  };

  const bulkStatusLabel = bulkState.running
    ? 'Bulk download in progress'
    : bulkState.stopped
      ? 'Bulk download stopped'
      : 'Bulk download completed';

  const bulkStatusDetails = bulkState.running
    ? bulkState.currentTicker
      ? `Downloading ${bulkState.currentTicker}...`
      : 'Preparing downloads...'
    : bulkState.stopped
      ? 'Stopped before completion.'
      : 'All bulk downloads finished. Refreshing data shortly.';

  const handleSort = (field: 'ticker' | 'exchange' | 'currency') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    const sorted = [...dataCoverage];
    sorted.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'exchange':
          aVal = a.exchange;
          bVal = b.exchange;
          break;
        case 'currency':
          aVal = a.currency;
          bVal = b.currency;
          break;
        default:
          aVal = a.ticker;
          bVal = b.ticker;
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [dataCoverage, sortField, sortDirection]);

  const renderSortIcon = (field: 'ticker' | 'exchange' | 'currency') => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <Container>
      <Header>
        <HeaderLeft>
          <Meta>Data Management</Meta>
          <Title>Historical Stock Data</Title>
          <Description>
            Download and monitor 15 years of stock prices & splits across all tracked tickers.
          </Description>
        </HeaderLeft>
        <HeaderRight>
          <PageHeaderControls />
        </HeaderRight>
      </Header>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {bulkState.running && (
            <StopButton onClick={handleStopAll}>
              <Square size={14} />
              Stop
            </StopButton>
          )}
          <DownloadButton
            onClick={handleDownloadAll}
            disabled={bulkState.running || dataCoverage.length === 0}
          >
            <Download size={14} />
            {bulkState.running ? 'Downloading All...' : 'Download All'}
          </DownloadButton>
        </div>
        {bulkState.total > 0 && (
          <StatusBar>
            <StatusText>
              <span>{bulkStatusLabel}</span>
              <span>
                {bulkState.completed}/{bulkState.total}
              </span>
            </StatusText>
            <ProgressBarContainer>
              <ProgressFill
                $percent={
                  bulkState.total > 0
                    ? (bulkState.completed / bulkState.total) * 100
                    : 0
                }
              />
            </ProgressBarContainer>
            <StatusDetails>
              {bulkStatusDetails}
              {bulkState.running && bulkState.nextTicker
                ? ` Next: ${bulkState.nextTicker}`
                : ''}
            </StatusDetails>
          </StatusBar>
        )}
        <TableContainer>
          <TableWrapper>
            <Table>
              <Thead>
                <tr>
                  <Th $sortable onClick={() => handleSort('ticker')}>
                    Ticker {renderSortIcon('ticker')}
                  </Th>
                  <Th $sortable onClick={() => handleSort('exchange')}>
                    Exchange {renderSortIcon('exchange')}
                  </Th>
                  <Th $sortable onClick={() => handleSort('currency')}>
                    Currency {renderSortIcon('currency')}
                  </Th>
                  <Th style={{ textAlign: 'center' }}>Historical Prices</Th>
                  <Th style={{ textAlign: 'center' }}>Historical Splits</Th>
                  <Th>Date Range</Th>
                  <Th style={{ textAlign: 'center' }}>Action</Th>
                </tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <tr>
                    <Td colSpan={8}>
                      <EmptyState>
                        <SpinnerIcon size={18} /> Loading stock coverage...
                      </EmptyState>
                    </Td>
                  </tr>
                ) : sortedData.length === 0 ? (
                  <tr>
                    <Td colSpan={8}>
                      <EmptyState>No transaction data found</EmptyState>
                    </Td>
                  </tr>
                ) : (
                  sortedData.map(item => {
                    const hasPrices = hasHistoricalPrices(item);
                    const hasSplits = hasHistoricalSplits(item.ticker);
                    const isDownloading = downloading.has(item.ticker);
                    const bulkStatus = getBulkStatusForTicker(item.ticker);
                    const feedback = downloadFeedback[item.ticker];
                    const isExpanded = expandedTicker === item.ticker;
                    const series = seriesState[item.ticker];
                    const chartInfo = buildChartInfo(series?.data);

                    return (
                      <Fragment key={item.ticker}>
                        <Tr
                          $clickable
                          aria-expanded={isExpanded}
                          onClick={() => handleRowClick(item)}
                        >
                          <Td style={{ fontWeight: 600 }}>{item.ticker}</Td>
                          <Td>{item.exchange}</Td>
                          <Td>{item.currency}</Td>
                          <Td style={{ textAlign: 'center' }}>
                            <IconCell>
                              {hasPrices ? (
                                <Check size={18} color="#16a34a" />
                              ) : (
                                <X size={18} color="#dc2626" />
                              )}
                            </IconCell>
                          </Td>
                          <Td style={{ textAlign: 'center' }}>
                            <IconCell>
                              {hasSplits ? (
                                <Check size={18} color="#16a34a" />
                              ) : (
                                <X size={18} color="#94a3b8" />
                              )}
                            </IconCell>
                          </Td>
                          <Td style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {item.earliestPrice && item.latestPrice
                              ? `${item.earliestPrice} to ${item.latestPrice}`
                              : '-'}
                          </Td>
                          <Td style={{ textAlign: 'center' }}>
                            <DownloadButton
                              onClick={event => {
                                event.stopPropagation();
                                handleDownloadTicker(item.ticker);
                              }}
                              disabled={isDownloading || Boolean(bulkStatus)}
                            >
                              <Download size={14} />
                              {isDownloading
                                ? 'Downloading...'
                                : bulkStatus === 'running'
                                  ? 'Bulk running...'
                                  : bulkStatus === 'queued'
                                    ? 'Queued...'
                                    : 'Download'}
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
                                      <ChartTitle>{item.ticker} price history</ChartTitle>
                                      <ChartSubtitle>
                                        Showing last {chartInfo.count} days ({chartInfo.startDate} → {chartInfo.endDate})
                                      </ChartSubtitle>
                                    </div>
                                    <ChartStats>
                                      <StatBadge>Min: {formatPrice(chartInfo.min, 2)}</StatBadge>
                                      <StatBadge>Max: {formatPrice(chartInfo.max, 2)}</StatBadge>
                                      <StatBadge>Last: {formatPrice(chartInfo.latest, 2)}</StatBadge>
                                    </ChartStats>
                                  </ChartHeader>
                                  <ChartWrapper>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <AreaChart data={chartInfo.data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                        <defs>
                                          <linearGradient id={`priceGradient-${item.ticker}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                          </linearGradient>
                                          <linearGradient id={`adjustedGradient-${item.ticker}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                          </linearGradient>
                                          <linearGradient id={`unadjustedGradient-${item.ticker}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
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
                                          width={70}
                                          tickFormatter={value => formatPrice(value as number, 2)}
                                          fontSize={10}
                                          stroke="#94a3b8"
                                        />
                                        <Tooltip
                                          formatter={(value, name) => [
                                            formatPrice(value as number, 4),
                                            name === 'close' ? 'Close' :
                                              name === 'adjusted_close' ? 'Adj Close' :
                                                name === 'split_unadjusted_close' ? 'Split Unadj' : name
                                          ]}
                                          labelFormatter={value => value}
                                        />
                                        <Legend />
                                        <Area
                                          type="monotone"
                                          dataKey="split_unadjusted_close"
                                          name="Split Unadj"
                                          stroke="#9333ea"
                                          strokeWidth={2}
                                          fill={`url(#unadjustedGradient-${item.ticker})`}
                                          isAnimationActive={false}
                                        />
                                        <Area
                                          type="monotone"
                                          dataKey="adjusted_close"
                                          name="Adj Close"
                                          stroke="#16a34a"
                                          strokeWidth={2}
                                          fill={`url(#adjustedGradient-${item.ticker})`}
                                          isAnimationActive={false}
                                        />
                                        <Area
                                          type="monotone"
                                          dataKey="close"
                                          name="Close"
                                          stroke="#0ea5e9"
                                          strokeWidth={2}
                                          fill={`url(#priceGradient-${item.ticker})`}
                                          isAnimationActive={false}
                                        />
                                      </AreaChart>
                                    </ResponsiveContainer>
                                  </ChartWrapper>
                                </ChartContainer>
                              )}
                              {!series?.loading && !series?.error && !chartInfo && (
                                <DownloadFeedbackText $status="error">
                                  No price history available yet.
                                </DownloadFeedbackText>
                              )}
                            </ExpandedCell>
                          </ExpandedRow>
                        )}
                      </Fragment>
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
