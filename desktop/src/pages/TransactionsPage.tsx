import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { ColumnDef } from '@tanstack/react-table';
import { useTransactionsStore } from '../store/transactionsStore';
import { useSettingsStore } from '../store/settingsStore';
import { calculateTransactionStats } from '../utils/transactionStats';
import { Transaction } from '../types/Transaction';
import { Container, Header, HeaderRow, HeaderLeft, HeaderRight, Meta, Title, Description, Card, LoadingText, ErrorText, PageHeaderControls } from '../components/PageLayout';
import { TanStackTable } from '../components/TanStackTable';
import { MetricCard } from '../components/MetricCard';
import { Search } from 'lucide-react';
import { getCurrencyColor } from '../config/currencies';

const FilterBar = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 200px;
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  width: 16px;
  height: 16px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 0.625rem 0.5rem 2.25rem;
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
  font-size: 0.8rem;
  font-weight: 500;
  color: #64748b;
`;

const Select = styled.select`
  padding: 0.5rem 1.75rem 0.5rem 0.625rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.8rem;
  background: white;
  cursor: pointer;
  transition: all 150ms ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.625rem center;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

const ResultCount = styled.div`
  font-size: 0.8rem;
  color: #64748b;
  margin-bottom: 0.75rem;
`;

const CurrencyBadge = styled.span<{ $color: string }>`
  padding: 3px 7px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  background: ${props => `${props.$color}22`};
  color: ${props => props.$color};
  border: 1px solid ${props => `${props.$color}44`};
`;

const TypeBadge = styled.span<{ $type: 'buy' | 'sell' | 'div' | 'default' }>`
  padding: 3px 7px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$type) {
      case 'buy': return '#dbeafe';
      case 'sell': return '#fee2e2';
      case 'div': return '#d1fae5';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$type) {
      case 'buy': return '#1e40af';
      case 'sell': return '#991b1b';
      case 'div': return '#065f46';
      default: return '#374151';
    }
  }};
  border: 1px solid ${props => {
    switch (props.$type) {
      case 'buy': return '#93c5fd';
      case 'sell': return '#fca5a5';
      case 'div': return '#6ee7b7';
      default: return '#d1d5db';
    }
  }};
`;

export function TransactionsPage() {
  const transactions = useTransactionsStore(state => state.transactions);
  const loading = useTransactionsStore(state => state.loading);
  const error = useTransactionsStore(state => state.error);
  const loadTransactions = useTransactionsStore(state => state.loadTransactions);
  const privacyMode = useSettingsStore(state => state.privacyMode);

  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    if (transactions.length === 0) {
      loadTransactions();
    }
  }, [transactions.length, loadTransactions]);

  const stats = calculateTransactionStats(transactions);

  const transactionMetrics = useMemo(() => [
    { label: 'Total', value: stats.total.toString() },
    { label: 'Buys', value: stats.buys.toString() },
    { label: 'Sells', value: stats.sells.toString() },
    { label: 'Dividends', value: stats.dividends.toString() },
    { label: 'Splits', value: stats.splits.toString() },
  ], [stats]);

  const currencyMetrics = useMemo(() => [
    { label: 'USD', value: stats.usd.toString(), valueColor: getCurrencyColor('USD') },
    { label: 'TWD', value: stats.twd.toString(), valueColor: getCurrencyColor('TWD') },
    { label: 'JPY', value: stats.jpy.toString(), valueColor: getCurrencyColor('JPY') },
    { label: 'HKD', value: stats.hkd.toString(), valueColor: getCurrencyColor('HKD') },
  ], [stats]);

  const uniqueCurrencies = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.currency))).sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
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

    return filtered;
  }, [transactions, searchQuery, currencyFilter, typeFilter]);

  const getTypeClass = (type: string): 'buy' | 'sell' | 'div' | 'default' => {
    const lowerType = type.toLowerCase();
    if (['buy', 'purchase'].includes(lowerType)) return 'buy';
    if (['sell', 'sale'].includes(lowerType)) return 'sell';
    if (['div', 'dividend'].includes(lowerType)) return 'div';
    return 'default';
  };

  const columns = useMemo<ColumnDef<Transaction>[]>(() => [
    {
      accessorKey: 'date',
      header: 'Date',
      enableSorting: true,
      cell: info => info.getValue() as string,
    },
    {
      accessorKey: 'currency',
      header: 'Currency',
      enableSorting: true,
      cell: info => {
        const currency = info.getValue() as string;
        return <CurrencyBadge $color={getCurrencyColor(currency)}>{currency}</CurrencyBadge>;
      },
    },
    {
      accessorKey: 'stock',
      header: 'Stock',
      enableSorting: true,
      cell: info => <strong>{info.getValue() as string}</strong>,
      meta: {
        cellStyle: { fontWeight: 600 },
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      enableSorting: true,
      cell: info => {
        const type = info.getValue() as string;
        return <TypeBadge $type={getTypeClass(type)}>{type}</TypeBadge>;
      },
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
      enableSorting: true,
      cell: info => privacyMode ? '***' : (info.getValue() as string),
      meta: {
        headerStyle: { textAlign: 'right' },
        cellStyle: { textAlign: 'right', fontFamily: 'monospace' },
      },
    },
    {
      accessorKey: 'price',
      header: 'Price (per unit)',
      enableSorting: true,
      cell: info => privacyMode ? '***' : (info.getValue() as string),
      meta: {
        headerStyle: { textAlign: 'right' },
        cellStyle: { textAlign: 'right', fontFamily: 'monospace' },
      },
    },
    {
      accessorKey: 'fees',
      header: 'Fees',
      enableSorting: true,
      cell: info => privacyMode ? '***' : (info.getValue() as string),
      meta: {
        headerStyle: { textAlign: 'right' },
        cellStyle: { textAlign: 'right', fontFamily: 'monospace' },
      },
    },
    {
      accessorKey: 'split_ratio',
      header: 'Split Ratio',
      enableSorting: true,
      cell: info => (info.getValue() as string) || '—',
      meta: {
        headerStyle: { textAlign: 'right' },
        cellStyle: { textAlign: 'right', fontFamily: 'monospace' },
      },
    },
  ], [privacyMode]);

  if (loading) {
    return (
      <Container>
        <Card>
          <LoadingText>Loading transactions...</LoadingText>
        </Card>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Card>
          <ErrorText>Error: {error}</ErrorText>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderRow>
          <HeaderLeft>
            <Meta>Portfolio Manager</Meta>
            <Title>All Transactions</Title>
            <Description>View and manage your investment transactions</Description>
          </HeaderLeft>
          <HeaderRight>
            <PageHeaderControls />
          </HeaderRight>
        </HeaderRow>
      </Header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        <MetricCard title="Transactions" metrics={transactionMetrics} />
        <MetricCard title="By Currency" metrics={currencyMetrics} />
      </div>

      <Card>
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
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </ResultCount>

        <TanStackTable
          data={filteredTransactions}
          columns={columns}
          emptyMessage="No transactions found matching your filters."
          initialSorting={[{ id: 'date', desc: true }]}
        />
      </Card>
    </Container>
  );
}
