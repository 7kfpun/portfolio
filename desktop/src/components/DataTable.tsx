import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { Search } from 'lucide-react';
import { Transaction } from '../types/Transaction';
import { parseNumericString } from '../utils/csvUtils';

const TableWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 250px;
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  width: 18px;
  height: 18px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.625rem 0.75rem 0.625rem 2.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 150ms ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const FilterLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
`;

const Select = styled.select`
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: all 150ms ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`;

const Thead = styled.thead`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: sticky;
  top: 0;
  z-index: 10;
`;

const Th = styled.th`
  padding: 1rem 1.25rem;
  text-align: left;
  font-weight: 600;
  white-space: nowrap;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  user-select: none;
  transition: background 150ms ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &:first-child {
    border-top-left-radius: 12px;
    min-width: 120px;
  }

  &:last-child {
    border-top-right-radius: 12px;
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

  &:first-child {
    min-width: 120px;
  }

  &.number {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  &.buy {
    color: #16a34a;
    font-weight: 600;
  }

  &.sell {
    color: #dc2626;
    font-weight: 600;
  }

  &.div {
    color: #2563eb;
    font-weight: 600;
  }
`;

const ResultCount = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  padding: 0.5rem 0;
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.95rem;
`;

interface DataTableProps {
  transactions: Transaction[];
}

export function DataTable({ transactions }: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Transaction;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleSort = (key: keyof Transaction) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.stock.toLowerCase().includes(query) ||
          t.type.toLowerCase().includes(query) ||
          t.date.includes(query)
      );
    }

    if (currencyFilter !== 'all') {
      filtered = filtered.filter(t => t.currency === currencyFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type.toLowerCase() === typeFilter);
    }

    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (sortConfig.key === 'date') {
          const aDate = new Date(aVal).getTime();
          const bDate = new Date(bVal).getTime();
          return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
        }

        if (sortConfig.key === 'quantity' || sortConfig.key === 'price' || sortConfig.key === 'fees') {
          const aNum = parseNumericString(aVal, 0);
          const bNum = parseNumericString(bVal, 0);
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }

        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
    }

    return filtered;
  }, [transactions, searchQuery, currencyFilter, typeFilter, sortConfig]);

  const getTypeClass = (type: string) => {
    const lowerType = type.toLowerCase();
    if (['buy', 'purchase'].includes(lowerType)) return 'buy';
    if (['sell', 'sale'].includes(lowerType)) return 'sell';
    if (['div', 'dividend'].includes(lowerType)) return 'div';
    return '';
  };

  const getCurrencyBadge = (currency: string) => {
    const colors: Record<string, string> = {
      USD: '#2563eb',
      TWD: '#dc2626',
      JPY: '#16a34a',
      HKD: '#fb923c',
    };
    return (
      <span
        style={{
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontWeight: '600',
          background: `${colors[currency] || '#64748b'}22`,
          color: colors[currency] || '#64748b',
          border: `1px solid ${colors[currency] || '#64748b'}44`,
        }}
      >
        {currency}
      </span>
    );
  };

  const uniqueCurrencies = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.currency))).sort();
  }, [transactions]);

  return (
    <TableWrapper>
      <FilterBar>
        <SearchContainer>
          <SearchIcon />
          <SearchInput
            type="text"
            placeholder="Search by stock, type, or date..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </SearchContainer>

        <FilterGroup>
          <FilterLabel>Currency:</FilterLabel>
          <Select
            value={currencyFilter}
            onChange={e => setCurrencyFilter(e.target.value)}
          >
            <option value="all">All</option>
            {uniqueCurrencies.map(currency => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </Select>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Type:</FilterLabel>
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
            <option value="dividend">Dividend</option>
          </Select>
        </FilterGroup>
      </FilterBar>

      <ResultCount>
        Showing {filteredAndSortedTransactions.length} of {transactions.length}{' '}
        transactions
      </ResultCount>

      <TableContainer>
        <Table>
          <Thead>
            <tr>
              <Th onClick={() => handleSort('date')}>Date</Th>
              <Th onClick={() => handleSort('currency')}>Currency</Th>
              <Th onClick={() => handleSort('stock')}>Stock</Th>
              <Th onClick={() => handleSort('type')}>Type</Th>
              <Th onClick={() => handleSort('quantity')}>Quantity</Th>
              <Th onClick={() => handleSort('price')}>Transacted Price (per unit)</Th>
              <Th onClick={() => handleSort('fees')}>Fees</Th>
              <Th onClick={() => handleSort('split_ratio')}>Stock Split Ratio</Th>
            </tr>
          </Thead>
          <Tbody>
            {filteredAndSortedTransactions.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState>
                    No transactions found matching your filters.
                  </EmptyState>
                </td>
              </tr>
            ) : (
              filteredAndSortedTransactions.map((txn, index) => (
                <tr key={index}>
                  <Td>{txn.date}</Td>
                  <Td>{getCurrencyBadge(txn.currency)}</Td>
                  <Td>{txn.stock}</Td>
                  <Td className={getTypeClass(txn.type)}>{txn.type}</Td>
                  <Td className="number">{txn.quantity}</Td>
                  <Td className="number">{txn.price}</Td>
                  <Td className="number">{txn.fees}</Td>
                  <Td className="number">{txn.split_ratio || '—'}</Td>
                </tr>
              ))
            )}
          </Tbody>
        </Table>
      </TableContainer>
    </TableWrapper>
  );
}
