import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { StockDataCoverage, SplitHistory } from '../types/HistoricalData';
import { Download, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';

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
  font-size: 0.75rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
`;

const Thead = styled.thead`
  position: sticky;
  top: 0;
  background: #f8fafc;
  z-index: 10;
`;

const Th = styled.th<{ $sortable?: boolean }>`
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem;
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
  padding: 0.4rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  color: #0f172a;
  white-space: nowrap;
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  ${props => {
    switch (props.$status) {
      case 'complete':
        return `
          background: #dcfce7;
          color: #166534;
        `;
      case 'partial':
        return `
          background: #fef3c7;
          color: #854d0e;
        `;
      case 'missing':
        return `
          background: #fee2e2;
          color: #991b1b;
        `;
      case 'delisted':
        return `
          background: #e5e7eb;
          color: #374151;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #6b7280;
        `;
    }
  }}
`;

const ProgressBar = styled.div`
  width: 80px;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${props => props.$percent}%;
  background: ${props => {
    if (props.$percent >= 95) return '#16a34a';
    if (props.$percent >= 50) return '#eab308';
    return '#dc2626';
  }};
  transition: width 200ms ease;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #cbd5e1;
  align-items: center;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.875rem;
  flex: 1;
  min-width: 200px;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

const FilterSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  cursor: pointer;
  transition: transform 120ms ease;

  &:hover {
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const SortIcon = styled.span`
  display: inline-flex;
  margin-left: 0.25rem;
  vertical-align: middle;
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #64748b;
  font-size: 0.875rem;
`;

type SortField = 'ticker' | 'exchange' | 'currency' | 'earliestTransaction' | 'coveragePercent' | 'missingDays' | 'splitCount';
type SortDirection = 'asc' | 'desc';

interface DataReadinessTableProps {
  coverage: StockDataCoverage[];
  splits: SplitHistory[];
  loading: boolean;
  onDownloadAll: () => void;
  onRedownload: (symbols: string[]) => void;
}

export function DataReadinessTable({ coverage, splits, loading, onDownloadAll, onRedownload }: DataReadinessTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [exchangeFilter, setExchangeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('ticker');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSplitCount = (ticker: string) => {
    return splits.filter(s => s.ticker === ticker).length;
  };

  const getLastSplit = (ticker: string) => {
    const tickerSplits = splits.filter(s => s.ticker === ticker);
    if (tickerSplits.length === 0) return null;
    return tickerSplits.sort((a, b) => b.date.localeCompare(a.date))[0];
  };

  const filteredCoverage = useMemo(() => {
    let filtered = coverage;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(c =>
        c.ticker.toLowerCase().includes(searchLower) ||
        c.exchange.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (exchangeFilter !== 'all') {
      filtered = filtered.filter(c => c.exchange === exchangeFilter);
    }

    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'ticker':
          aVal = a.ticker;
          bVal = b.ticker;
          break;
        case 'exchange':
          aVal = a.exchange;
          bVal = b.exchange;
          break;
        case 'currency':
          aVal = a.currency;
          bVal = b.currency;
          break;
        case 'earliestTransaction':
          aVal = a.earliestTransaction;
          bVal = b.earliestTransaction;
          break;
        case 'coveragePercent':
          aVal = a.coveragePercent;
          bVal = b.coveragePercent;
          break;
        case 'missingDays':
          aVal = a.missingDays;
          bVal = b.missingDays;
          break;
        case 'splitCount':
          aVal = a.splitCount;
          bVal = b.splitCount;
          break;
        default:
          aVal = a.ticker;
          bVal = b.ticker;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [coverage, search, statusFilter, exchangeFilter, sortField, sortDirection]);

  const exchanges = useMemo(() => {
    const unique = new Set(coverage.map(c => c.exchange));
    return Array.from(unique).sort();
  }, [coverage]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return (
      <SortIcon>
        {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </SortIcon>
    );
  };

  if (loading) {
    return (
      <TableContainer>
        <EmptyState>Loading data coverage...</EmptyState>
      </TableContainer>
    );
  }

  return (
    <TableContainer>
      <FilterBar>
        <SearchInput
          type="text"
          placeholder="Search ticker or exchange..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <FilterSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="complete">Complete</option>
          <option value="partial">Partial</option>
          <option value="missing">Missing</option>
          <option value="delisted">Delisted</option>
        </FilterSelect>
        <FilterSelect value={exchangeFilter} onChange={e => setExchangeFilter(e.target.value)}>
          <option value="all">All Exchanges</option>
          {exchanges.map(ex => (
            <option key={ex} value={ex}>{ex}</option>
          ))}
        </FilterSelect>
        <Button onClick={onDownloadAll} disabled={loading}>
          <Download size={16} />
          Download All
        </Button>
        <Button
          onClick={() => {
            const incomplete = filteredCoverage
              .filter(c => c.status !== 'complete')
              .map(c => c.ticker);
            onRedownload(incomplete);
          }}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Redownload Incomplete
        </Button>
      </FilterBar>

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
              <Th $sortable onClick={() => handleSort('earliestTransaction')}>
                First Txn {renderSortIcon('earliestTransaction')}
              </Th>
              <Th>Earliest Price</Th>
              <Th>Latest Price</Th>
              <Th $sortable onClick={() => handleSort('coveragePercent')}>
                Coverage {renderSortIcon('coveragePercent')}
              </Th>
              <Th $sortable onClick={() => handleSort('missingDays')}>
                Missing {renderSortIcon('missingDays')}
              </Th>
              <Th $sortable onClick={() => handleSort('splitCount')}>
                Splits {renderSortIcon('splitCount')}
              </Th>
              <Th>Last Split</Th>
              <Th>Status</Th>
            </tr>
          </Thead>
          <Tbody>
            {filteredCoverage.length === 0 ? (
              <tr>
                <Td colSpan={11}>
                  <EmptyState>No data found matching your filters</EmptyState>
                </Td>
              </tr>
            ) : (
              filteredCoverage.map(item => {
                const splitCount = getSplitCount(item.ticker);
                const lastSplit = getLastSplit(item.ticker);

                return (
                  <Tr key={item.ticker}>
                    <Td style={{ fontWeight: 600 }}>{item.ticker}</Td>
                    <Td>{item.exchange}</Td>
                    <Td>{item.currency}</Td>
                    <Td>{item.earliestTransaction}</Td>
                    <Td>{item.earliestPrice || '-'}</Td>
                    <Td>{item.latestPrice || '-'}</Td>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ProgressBar>
                          <ProgressFill $percent={item.coveragePercent} />
                        </ProgressBar>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {item.coveragePercent.toFixed(1)}%
                        </span>
                      </div>
                    </Td>
                    <Td style={{ color: item.missingDays > 0 ? '#dc2626' : '#64748b' }}>
                      {item.missingDays}
                    </Td>
                    <Td>{splitCount}</Td>
                    <Td>
                      {lastSplit ? (
                        <span style={{ fontSize: '0.7rem' }}>
                          {lastSplit.date} ({lastSplit.ratio})
                        </span>
                      ) : (
                        '-'
                      )}
                    </Td>
                    <Td>
                      <StatusBadge $status={item.status}>
                        {item.status}
                      </StatusBadge>
                      {item.delistReason && (
                        <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.25rem' }}>
                          {item.delistReason}
                        </div>
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
  );
}
