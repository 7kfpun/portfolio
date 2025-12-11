import { useMemo, useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { ColumnDef } from '@tanstack/react-table';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, TooltipProps } from 'recharts';
import { useTransactionsStore } from '../store/transactionsStore';
import { usePortfolioStore } from '../store/portfolioStore';
import { useSettingsStore } from '../store/settingsStore';
import { Container, PageHeader, Card, LoadingText, SmallButton } from '../components/PageLayout';
import { TanStackTable } from '../components/TanStackTable';
import { CurrencyType } from '../types/Settings';
import { CURRENCY_SYMBOLS } from '../config/currencies';
import { Transaction } from '../types/Transaction';

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const ChartCard = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  min-width: 0;
`;

const ChartTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1rem 0;
`;

const ChartWrapper = styled.div`
  width: 100%;
  height: 300px;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

interface DividendRow {
  month: string;
  [year: string]: number | string;
}

interface SymbolDividend {
  symbol: string;
  total: number;
  count: number;
  firstDate: string;
  lastDate: string;
  avgPerPayment: number;
}

interface DividendTransactionRow {
  date: string;
  stock: string;
  currency: string;
  quantity: number;
  pricePerShare: number;
  fees: number;
  netAmount: number;
}

const formatCurrencyValue = (value: number, currency: CurrencyType | string) => {
  const symbol = CURRENCY_SYMBOLS[currency as CurrencyType] || `${currency} `;
  return `${symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export function DividendsPage() {
  const { transactions, loading } = useTransactionsStore();
  const { fxRates, loadFxRates } = usePortfolioStore();
  const { baseCurrency, loadSettings } = useSettingsStore();
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | CurrencyType>('ALL');

  // Load FX rates when component mounts
  useEffect(() => {
    loadFxRates();
  }, [loadFxRates]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const getEffectiveCurrency = useCallback(() => {
    return currencyFilter === 'ALL' ? baseCurrency : currencyFilter;
  }, [currencyFilter, baseCurrency]);

  const convertAmountToDisplayCurrency = useCallback(
    (amount: number, currency: string) => {
      if (currencyFilter !== 'ALL' || currency === baseCurrency) {
        return amount;
      }

      const currencyRate = fxRates.get(currency) ?? (currency === 'USD' ? 1 : undefined);
      if (!currencyRate) {
        return amount;
      }

      const baseRate = fxRates.get(baseCurrency) ?? (baseCurrency === 'USD' ? 1 : undefined);
      if (!baseRate) {
        return amount;
      }

      const amountInUSD = amount * currencyRate;
      return amountInUSD / baseRate;
    },
    [currencyFilter, baseCurrency, fxRates]
  );

  const formatValueWithCurrency = useCallback(
    (value: number) => formatCurrencyValue(value, getEffectiveCurrency()),
    [getEffectiveCurrency]
  );

  const getDividendAmount = useCallback(
    (txn: Transaction): number | null => {
      const cleanPrice = txn.price.replace(/[$,]/g, '');
      const cleanQuantity = txn.quantity.replace(/[$,]/g, '');
      let amount = parseFloat(cleanQuantity) * parseFloat(cleanPrice);

      if (!Number.isFinite(amount) || amount === 0) {
        return null;
      }

      const cleanFees = (txn.fees || '').replace(/[$,]/g, '');
      const feeAmount = parseFloat(cleanFees);
      if (Number.isFinite(feeAmount)) {
        amount -= feeAmount;
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        return null;
      }

      return convertAmountToDisplayCurrency(amount, txn.currency);
    },
    [convertAmountToDisplayCurrency]
  );

  const renderDividendTooltip = useCallback(
    ({ active, payload, label }: any) => {
      if (!active || !payload || payload.length === 0) return null;

      const validEntries = payload.filter((entry: any) => typeof entry.value === 'number');
      if (validEntries.length === 0) return null;

      const total = validEntries.reduce((sum: number, entry: any) => sum + Number(entry.value ?? 0), 0);

      return (
        <div
          style={{
            background: 'white',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)',
            border: '1px solid #e2e8f0',
            minWidth: '180px',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.8rem', color: '#0f172a' }}>
            {label}
          </div>
          {validEntries.map((entry: any) => (
            <div
              key={entry.dataKey as string}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#475569',
                marginBottom: '0.25rem',
                gap: '0.5rem',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1 }}>
                <span
                  style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    borderRadius: '999px',
                    background: entry.color,
                    flexShrink: 0,
                  }}
                />
                {entry.name}
              </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                {formatValueWithCurrency(Number(entry.value ?? 0))}
              </span>
            </div>
          ))}
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#0f172a',
              borderTop: '1px solid #e2e8f0',
              marginTop: '0.5rem',
              paddingTop: '0.5rem',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Total</span>
            <span style={{ fontFamily: 'monospace' }}>{formatValueWithCurrency(total)}</span>
          </div>
        </div>
      );
    },
    [formatValueWithCurrency]
  );

  const dividendData = useMemo(() => {
    const dividendTransactions = transactions.filter(t => {
      const type = t.type.toLowerCase();
      const matchesType = type === 'dividend' || type === 'div';
      const matchesCurrency = currencyFilter === 'ALL' || t.currency === currencyFilter;
      return matchesType && matchesCurrency;
    });

    // Build a matrix: rows = months (1-12), columns = years
    const yearSet = new Set<number>();
    const data: Record<number, Record<number, number>> = {}; // data[month][year] = amount

    dividendTransactions.forEach(txn => {
      const date = new Date(txn.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1-12
      const amount = getDividendAmount(txn);

      if (amount === null) {
        return;
      }

      yearSet.add(year);

      if (!data[month]) {
        data[month] = {};
      }
      if (!data[month][year]) {
        data[month][year] = 0;
      }
      data[month][year] += amount;
    });

    const years = Array.from(yearSet).sort((a, b) => a - b);
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Calculate totals
    const yearTotals: Record<number, number> = {};
    const monthTotals: Record<number, number> = {};
    let grandTotal = 0;

    years.forEach(year => {
      yearTotals[year] = 0;
      months.forEach(month => {
        const amount = data[month]?.[year] || 0;
        yearTotals[year] += amount;
      });
      grandTotal += yearTotals[year];
    });

    months.forEach(month => {
      monthTotals[month] = 0;
      years.forEach(year => {
        const amount = data[month]?.[year] || 0;
        monthTotals[month] += amount;
      });
    });

    // Prepare table data
    const tableData: DividendRow[] = months.map(month => {
      const row: DividendRow = { month: monthNames[month - 1] };
      years.forEach(year => {
        row[year.toString()] = data[month]?.[year] || 0;
      });
      row['Sum'] = monthTotals[month];
      return row;
    });

    // Add total row
    const totalRow: DividendRow = { month: 'Sum' };
    years.forEach(year => {
      totalRow[year.toString()] = yearTotals[year];
    });
    totalRow['Sum'] = grandTotal;
    tableData.push(totalRow);

    // Calculate data by symbol for stacked charts
    const symbolYearData = new Map<string, Record<number, number>>();
    const symbolMonthData = new Map<string, Record<number, number>>();

    dividendTransactions.forEach(txn => {
      const date = new Date(txn.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const amount = getDividendAmount(txn);

      if (amount === null) {
        return;
      }

      // By year
      if (!symbolYearData.has(txn.stock)) {
        symbolYearData.set(txn.stock, {});
      }
      const yearData = symbolYearData.get(txn.stock)!;
      if (!yearData[year]) {
        yearData[year] = 0;
      }
      yearData[year] += amount;

      // By month
      if (!symbolMonthData.has(txn.stock)) {
        symbolMonthData.set(txn.stock, {});
      }
      const monthData = symbolMonthData.get(txn.stock)!;
      if (!monthData[month]) {
        monthData[month] = 0;
      }
      monthData[month] += amount;
    });

    const symbols = Array.from(symbolYearData.keys());

    // Prepare chart data - yearly totals (stacked by symbol)
    const yearlyChartData = years.map(year => {
      const entry: any = { year: year.toString() };
      symbols.forEach(symbol => {
        const value = symbolYearData.get(symbol)?.[year];
        if (value && value > 0) {
          entry[symbol] = value;
        }
      });
      return entry;
    });

    // Prepare chart data - monthly trend (all years combined, stacked by symbol)
    const monthlyChartData = months.map(month => {
      const entry: any = { month: monthNames[month - 1] };
      symbols.forEach(symbol => {
        const value = symbolMonthData.get(symbol)?.[month];
        if (value && value > 0) {
          entry[symbol] = value;
        }
      });
      return entry;
    });

    // Prepare chart data - year comparison by month
    const monthComparisonData = months.map(month => {
      const entry: any = { month: monthNames[month - 1] };
      years.forEach(year => {
        entry[year.toString()] = data[month]?.[year] || 0;
      });
      return entry;
    });

    // Calculate dividends by symbol
    const symbolMap = new Map<string, { total: number; count: number; dates: string[] }>();

    dividendTransactions.forEach(txn => {
      const amount = getDividendAmount(txn);

      if (amount === null) {
        return;
      }

      if (!symbolMap.has(txn.stock)) {
        symbolMap.set(txn.stock, { total: 0, count: 0, dates: [] });
      }

      const symbolData = symbolMap.get(txn.stock)!;
      symbolData.total += amount;
      symbolData.count += 1;
      symbolData.dates.push(txn.date);
    });

    const symbolDividends: SymbolDividend[] = Array.from(symbolMap.entries())
      .map(([symbol, data]) => {
        const sortedDates = data.dates.sort();
        return {
          symbol,
          total: data.total,
          count: data.count,
          firstDate: sortedDates[0],
          lastDate: sortedDates[sortedDates.length - 1],
          avgPerPayment: data.total / data.count,
        };
      })
      .sort((a, b) => b.total - a.total); // Sort by total descending

    const transactionRows: DividendTransactionRow[] = dividendTransactions
      .map(txn => {
        const cleanQuantity = txn.quantity.replace(/[$,]/g, '');
        const cleanPrice = txn.price.replace(/[$,]/g, '');
        const cleanFees = (txn.fees || '').replace(/[$,]/g, '');
        const quantity = parseFloat(cleanQuantity);
        const pricePerShare = parseFloat(cleanPrice);
        const fees = parseFloat(cleanFees);
        const netAmount = getDividendAmount(txn);

        if (netAmount === null) {
          return null;
        }

        return {
          date: txn.date,
          stock: txn.stock,
          currency: txn.currency,
          quantity: Number.isFinite(quantity) ? quantity : 0,
          pricePerShare: Number.isFinite(pricePerShare) ? pricePerShare : 0,
          fees: Number.isFinite(fees) ? fees : 0,
          netAmount,
        };
      })
      .filter((row): row is DividendTransactionRow => row !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      tableData,
      years,
      symbols,
      yearlyChartData,
      monthlyChartData,
      monthComparisonData,
      symbolDividends,
      grandTotal,
      transactions: transactionRows,
    };
  }, [transactions, getDividendAmount]);

  const columns = useMemo<ColumnDef<DividendRow>[]>(() => {
    const cols: ColumnDef<DividendRow>[] = [
      {
        accessorKey: 'month',
        header: '',
        enableSorting: false,
        cell: info => <strong>{info.getValue() as string}</strong>,
        meta: {
          cellStyle: { fontWeight: 600 },
        },
      },
    ];

    // Add year columns
    dividendData.years.forEach(year => {
      cols.push({
        accessorKey: year.toString(),
        header: year.toString(),
        enableSorting: false,
        cell: info => formatValueWithCurrency(info.getValue() as number),
        meta: {
          headerStyle: { textAlign: 'right' },
          cellStyle: { textAlign: 'right', fontFamily: 'monospace' },
        },
      });
    });

    // Add Sum column
    cols.push({
      accessorKey: 'Sum',
      header: 'Sum',
      enableSorting: false,
      cell: info => {
        const value = info.getValue() as number;
        const row = info.row.original;
        const isTotal = row.month === 'Sum';
        return (
          <span style={{ fontWeight: isTotal ? 700 : 600, color: isTotal ? '#16a34a' : 'inherit' }}>
            {formatValueWithCurrency(value)}
          </span>
        );
      },
      meta: {
        headerStyle: { textAlign: 'right' },
        cellStyle: { textAlign: 'right', fontFamily: 'monospace' },
      },
    });

    return cols;
  }, [dividendData.years, formatValueWithCurrency]);

  const symbolColumns = useMemo<ColumnDef<SymbolDividend>[]>(() => [
    {
      accessorKey: 'symbol',
      header: 'Symbol',
      enableSorting: true,
      cell: info => <strong>{info.getValue() as string}</strong>,
    },
    {
      accessorKey: 'total',
      header: 'Total Dividends',
      enableSorting: true,
      cell: info => formatValueWithCurrency(info.getValue() as number),
      meta: {
        headerStyle: { textAlign: 'right' },
        cellStyle: { textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#16a34a' },
      },
    },
    {
      accessorKey: 'count',
      header: 'Payments',
      enableSorting: true,
      cell: info => info.getValue() as number,
      meta: {
        headerStyle: { textAlign: 'right' },
        cellStyle: { textAlign: 'right', fontFamily: 'monospace' },
      },
    },
    {
      accessorKey: 'avgPerPayment',
      header: 'Avg Per Payment',
      enableSorting: true,
      cell: info => formatValueWithCurrency(info.getValue() as number),
      meta: {
        headerStyle: { textAlign: 'right' },
        cellStyle: { textAlign: 'right', fontFamily: 'monospace' },
      },
    },
    {
      accessorKey: 'firstDate',
      header: 'First Payment',
      enableSorting: true,
      cell: info => info.getValue() as string,
      meta: {
        cellStyle: { fontSize: '0.75rem', color: '#64748b' },
      },
    },
    {
      accessorKey: 'lastDate',
      header: 'Last Payment',
      enableSorting: true,
      cell: info => info.getValue() as string,
      meta: {
        cellStyle: { fontSize: '0.75rem', color: '#64748b' },
      },
    },
  ], [formatValueWithCurrency]);

  const transactionColumns = useMemo<ColumnDef<DividendTransactionRow>[]>(() => [
    {
      accessorKey: 'date',
      header: 'Date',
      enableSorting: true,
      cell: info => {
        const value = info.getValue() as string;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
      },
    },
    {
      accessorKey: 'stock',
      header: 'Symbol',
      enableSorting: true,
      cell: info => <strong>{info.getValue() as string}</strong>,
    },
    {
      accessorKey: 'currency',
      header: 'Currency',
      enableSorting: true,
    },
    {
      accessorKey: 'quantity',
      header: 'Qty',
      enableSorting: true,
      cell: info =>
        (info.getValue() as number).toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 4,
        }),
      meta: {
        headerStyle: { textAlign: 'right' },
        cellStyle: { textAlign: 'right', fontFamily: 'monospace' },
      },
    },
    {
      accessorKey: 'pricePerShare',
      header: 'Price / Share',
      enableSorting: true,
      cell: info => {
        const value = info.getValue() as number;
        const currency = info.row.original.currency;
        return formatCurrencyValue(value, currency);
      },
      meta: {
        headerStyle: { textAlign: 'right' },
        cellStyle: { textAlign: 'right', fontFamily: 'monospace' },
      },
    },
    {
      accessorKey: 'fees',
      header: 'Fees',
      enableSorting: true,
      cell: info => {
        const value = info.getValue() as number;
        const currency = info.row.original.currency;
        return formatCurrencyValue(value, currency);
      },
      meta: {
        headerStyle: { textAlign: 'right' },
        cellStyle: { textAlign: 'right', fontFamily: 'monospace' },
      },
    },
    {
      accessorKey: 'netAmount',
      header: 'Net Dividend',
      enableSorting: true,
      cell: info => formatValueWithCurrency(info.getValue() as number),
      meta: {
        headerStyle: { textAlign: 'right' },
        cellStyle: { textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#16a34a' },
      },
    },
  ], [formatValueWithCurrency]);

  if (loading) {
    return (
      <Container>
        <PageHeader
          meta="Reports"
          title="Dividends"
          description="Analyze dividend income by year and month"
        />
        <Card>
          <LoadingText>Loading dividend data...</LoadingText>
        </Card>
      </Container>
    );
  }

  if (dividendData.years.length === 0) {
    return (
      <Container>
        <PageHeader
          meta="Reports"
          title="Dividends"
          description="Analyze dividend income by year and month"
        />
        <Card>
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            No dividend transactions found.
          </div>
        </Card>
      </Container>
    );
  }

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0'];

  return (
    <Container>
      <PageHeader
        meta="Reports"
        title="Dividends"
        description="Analyze dividend income by year and month"
      />

      <FilterBar>
        <SmallButton
          $variant={currencyFilter === 'ALL' ? 'primary' : 'ghost'}
          onClick={() => setCurrencyFilter('ALL')}
        >
          All
        </SmallButton>
        <SmallButton
          $variant={currencyFilter === 'USD' ? 'primary' : 'ghost'}
          onClick={() => setCurrencyFilter('USD')}
        >
          US
        </SmallButton>
        <SmallButton
          $variant={currencyFilter === 'TWD' ? 'primary' : 'ghost'}
          onClick={() => setCurrencyFilter('TWD')}
        >
          TW
        </SmallButton>
        <SmallButton
          $variant={currencyFilter === 'JPY' ? 'primary' : 'ghost'}
          onClick={() => setCurrencyFilter('JPY')}
        >
          JP
        </SmallButton>
        <SmallButton
          $variant={currencyFilter === 'HKD' ? 'primary' : 'ghost'}
          onClick={() => setCurrencyFilter('HKD')}
        >
          HK
        </SmallButton>
      </FilterBar>

      <ChartsGrid>
        <ChartCard>
          <ChartTitle>Yearly Dividend Totals</ChartTitle>
          <ChartWrapper>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dividendData.yearlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" fontSize={12} stroke="#94a3b8" />
                <YAxis fontSize={12} stroke="#94a3b8" />
                <Tooltip content={renderDividendTooltip} />
                {dividendData.symbols.map((symbol, index) => (
                  <Bar
                    key={symbol}
                    dataKey={symbol}
                    stackId="a"
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </ChartCard>

        <ChartCard>
          <ChartTitle>Monthly Dividend Totals (All Years)</ChartTitle>
          <ChartWrapper>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dividendData.monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" fontSize={12} stroke="#94a3b8" />
                <YAxis fontSize={12} stroke="#94a3b8" />
                <Tooltip content={renderDividendTooltip} />
                {dividendData.symbols.map((symbol, index) => (
                  <Bar
                    key={symbol}
                    dataKey={symbol}
                    stackId="a"
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </ChartCard>
      </ChartsGrid>

      <Card style={{ marginBottom: '1.5rem' }}>
        <ChartTitle>Monthly Trend by Year</ChartTitle>
        <ChartWrapper style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dividendData.monthComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" fontSize={12} stroke="#94a3b8" />
              <YAxis fontSize={12} stroke="#94a3b8" />
              <Tooltip content={renderDividendTooltip} />
              <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              {dividendData.years.map((year, index) => (
                <Bar
                  key={year}
                  dataKey={year.toString()}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </Card>

      <Card style={{ marginBottom: '1.5rem' }}>
        <ChartTitle>Dividend Income Table</ChartTitle>
        <TanStackTable
          data={dividendData.tableData}
          columns={columns}
          emptyMessage="No dividend data available"
        />
        <div style={{ marginTop: '1rem', textAlign: 'right', fontSize: '0.875rem', color: '#64748b' }}>
          <strong>Grand Total: {formatValueWithCurrency(dividendData.grandTotal)}</strong>
        </div>
      </Card>

      <Card>
        <ChartTitle>Dividends by Symbol (All Time)</ChartTitle>
        <TanStackTable
          data={dividendData.symbolDividends}
          columns={symbolColumns}
          emptyMessage="No dividend data available"
          initialSorting={[{ id: 'total', desc: true }]}
        />
      </Card>

      <Card>
        <ChartTitle>Dividend Transactions</ChartTitle>
        <TanStackTable
          data={dividendData.transactions}
          columns={transactionColumns}
          emptyMessage="No dividend transactions found"
          initialSorting={[{ id: 'date', desc: true }]}
        />
      </Card>
    </Container>
  );
}
