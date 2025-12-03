import { useEffect } from 'react';
import { useTransactionsStore } from '../store/transactionsStore';
import { calculateTransactionStats } from '../utils/transactionStats';
import { DataTable } from '../components/DataTable';
import { Container, Header, Meta, Title, Description, Card, LoadingText, ErrorText } from '../components/PageLayout';
import { Stats, StatCard, StatLabel, StatValue } from '../components/StatsCards';

export function TransactionsPage() {
  const transactions = useTransactionsStore(state => state.transactions);
  const loading = useTransactionsStore(state => state.loading);
  const error = useTransactionsStore(state => state.error);
  const loadTransactions = useTransactionsStore(state => state.loadTransactions);

  useEffect(() => {
    if (transactions.length === 0) {
      loadTransactions();
    }
  }, [transactions.length, loadTransactions]);

  const stats = calculateTransactionStats(transactions);

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
        <Meta>Portfolio Manager</Meta>
        <Title>Transaction History</Title>
        <Description>View and manage your investment transactions</Description>
      </Header>

      <Stats>
        <StatCard>
          <StatLabel>Total Transactions</StatLabel>
          <StatValue>{stats.total}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Buy Orders</StatLabel>
          <StatValue>{stats.buys}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Sell Orders</StatLabel>
          <StatValue>{stats.sells}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Dividends</StatLabel>
          <StatValue>{stats.dividends}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Stock Splits</StatLabel>
          <StatValue>{stats.splits}</StatValue>
        </StatCard>
      </Stats>

      <Stats>
        <StatCard style={{ borderColor: 'rgba(37, 99, 235, 0.3)' }}>
          <StatLabel>USD Transactions</StatLabel>
          <StatValue style={{ color: '#2563eb' }}>{stats.usd}</StatValue>
        </StatCard>
        <StatCard style={{ borderColor: 'rgba(220, 38, 38, 0.3)' }}>
          <StatLabel>TWD Transactions</StatLabel>
          <StatValue style={{ color: '#dc2626' }}>{stats.twd}</StatValue>
        </StatCard>
        <StatCard style={{ borderColor: 'rgba(22, 163, 74, 0.3)' }}>
          <StatLabel>JPY Transactions</StatLabel>
          <StatValue style={{ color: '#16a34a' }}>{stats.jpy}</StatValue>
        </StatCard>
        <StatCard style={{ borderColor: 'rgba(251, 146, 60, 0.3)' }}>
          <StatLabel>HKD Transactions</StatLabel>
          <StatValue style={{ color: '#fb923c' }}>{stats.hkd}</StatValue>
        </StatCard>
      </Stats>

      <Card>
        <DataTable transactions={transactions} />
      </Card>
    </Container>
  );
}
