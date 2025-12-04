import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Download, Check, X, ChevronUp, ChevronDown, Square } from 'lucide-react';
import { Container, Header, Meta, Title, Description, Card } from '../components/PageLayout';
import { historicalDataService } from '../services/historicalDataService';
import { bulkDownloadManager, BulkDownloadState } from '../services/bulkDownloadManager';
import { StockDataCoverage, SplitHistory } from '../types/HistoricalData';

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

const Tr = styled.tr`
  &:nth-child(even) {
    background: #f8fafc;
  }

  &:hover {
    background: #e0e7ff;
  }
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
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  background: white;
  color: #64748b;
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

export function DataReadinessPage() {
  const [dataCoverage, setDataCoverage] = useState<StockDataCoverage[]>([]);
  const [splitHistory, setSplitHistory] = useState<SplitHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'ticker' | 'exchange' | 'currency'>('ticker');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [bulkState, setBulkState] = useState<BulkDownloadState>(bulkDownloadManager.getState());
  const [downloadFeedback, setDownloadFeedback] = useState<Record<string, { status: DownloadFeedbackStatus; message: string }>>({});
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
        { status: 'success', message: 'Already up to date' },
        true
      );
      return;
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

  if (loading) {
    return (
      <Container>
        <Card>
          <EmptyState>Loading data coverage...</EmptyState>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Meta>Historical Data</Meta>
        <Title>Data Readiness</Title>
        <Description>
          Manage historical price and split data for all stocks (last 15 years)
        </Description>
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
                ? ` Next ticker in ~10s: ${bulkState.nextTicker}`
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
                {sortedData.length === 0 ? (
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

                    return (
                      <Tr key={item.ticker}>
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
                            onClick={() => handleDownloadTicker(item.ticker)}
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
