import { Transaction } from '../types/Transaction';
import { PriceRecord } from '../types/PriceData';
import { Position } from '../types/Portfolio';
import {
  StockMetrics,
  DividendSummary,
  ChartDataPoint,
  TransactionEvent,
  SplitRecord,
  DividendPeriodSummary,
} from '../types/StockDetail';
import { parseNumericString } from './csvUtils';

const normalizeTransactionType = (type: string) => type?.trim().toLowerCase() || '';

const isDividendType = (type: string) => {
  const normalized = normalizeTransactionType(type);
  return (
    normalized === 'div' ||
    normalized === 'dividend' ||
    normalized.startsWith('div')
  );
};

export function calculateAnnualizedReturn(totalReturnPercent: number, days: number): number {
  if (days <= 0) return 0;
  const years = days / 365.25;
  if (years === 0) return 0;
  return ((1 + totalReturnPercent / 100) ** (1 / years) - 1) * 100;
}

export function calculateMaxDrawdown(priceHistory: PriceRecord[]): { amount: number; percent: number } {
  if (priceHistory.length === 0) {
    return { amount: 0, percent: 0 };
  }

  let maxPrice = priceHistory[0].close;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  for (const record of priceHistory) {
    if (record.close > maxPrice) {
      maxPrice = record.close;
    }
    const drawdown = maxPrice - record.close;
    const drawdownPercent = (drawdown / maxPrice) * 100;

    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPercent = drawdownPercent;
    }
  }

  return { amount: maxDrawdown, percent: maxDrawdownPercent };
}

export function calculateVolatility(priceHistory: PriceRecord[]): number {
  if (priceHistory.length < 2) return 0;

  const returns: number[] = [];
  for (let i = 1; i < priceHistory.length; i++) {
    const dailyReturn = (priceHistory[i].close - priceHistory[i - 1].close) / priceHistory[i - 1].close;
    returns.push(dailyReturn);
  }

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  return stdDev * Math.sqrt(252) * 100;
}

export function calculateCostBasisTimeSeries(
  transactions: Transaction[],
  splits: SplitRecord[]
): Map<string, number> {
  const costBasisMap = new Map<string, number>();
  let totalShares = 0;
  let totalCost = 0;

  const sortedTransactions = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  for (const txn of sortedTransactions) {
    const quantity = parseNumericString(txn.quantity, 0);
    const price = parseNumericString(txn.price, 0);
    const fees = parseNumericString(txn.fees, 0);

    if (txn.type.toLowerCase() === 'buy') {
      totalCost += quantity * price + fees;
      totalShares += quantity;
    } else if (txn.type.toLowerCase() === 'sell') {
      const costPerShare = totalShares > 0 ? totalCost / totalShares : 0;
      totalCost -= quantity * costPerShare;
      totalShares -= quantity;
    }

    const costBasis = totalShares > 0 ? totalCost / totalShares : 0;
    costBasisMap.set(txn.date, costBasis);
  }

  return costBasisMap;
}

export function calculateStockMetrics(
  position: Position,
  priceHistory: PriceRecord[],
  transactions: Transaction[]
): StockMetrics {
  const sortedTransactions = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const buyTransactions = sortedTransactions.filter(t => t.type.toLowerCase() === 'buy');

  const firstPurchaseDate = buyTransactions.length > 0 ? buyTransactions[0].date : new Date().toISOString().split('T')[0];
  const lastTransactionDate = sortedTransactions.length > 0 ? sortedTransactions[sortedTransactions.length - 1].date : firstPurchaseDate;

  const firstDate = new Date(firstPurchaseDate);
  const today = new Date();
  const holdingPeriodDays = Math.floor((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

  const totalReturn = (position.currentValue || 0) - position.totalCost;
  const totalReturnPercent = position.totalCost > 0 ? (totalReturn / position.totalCost) * 100 : 0;
  const annualizedReturn = calculateAnnualizedReturn(totalReturnPercent, holdingPeriodDays);

  const prices = priceHistory.map(p => p.close);
  const highestPrice = prices.length > 0 ? Math.max(...prices) : position.currentPrice || 0;
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : position.currentPrice || 0;

  // Filter for last 5 years for specific metrics
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const fiveYearHistory = priceHistory.filter(p => new Date(p.date) >= fiveYearsAgo);
  // specific metrics check if enough data is available (needs at least 2 points)
  const metricHistory = fiveYearHistory.length >= 2 ? fiveYearHistory : priceHistory; 

  const priceVolatility = calculateVolatility(metricHistory);
  const { amount: maxDrawdown, percent: maxDrawdownPercent } = calculateMaxDrawdown(metricHistory);

  let bestDayGain = 0;
  let bestDayGainDate: string | null = null;
  let worstDayLoss = 0;
  let worstDayLossDate: string | null = null;

  for (let i = 1; i < metricHistory.length; i++) {
    const dailyChange = metricHistory[i].close - metricHistory[i - 1].close;
    if (dailyChange > bestDayGain) {
        bestDayGain = dailyChange;
        bestDayGainDate = metricHistory[i].date;
    }
    if (dailyChange < worstDayLoss) {
        worstDayLoss = dailyChange;
        worstDayLossDate = metricHistory[i].date;
    }
  }

  let daysSincePositive: number | null = null;
  if (totalReturn >= 0) {
    daysSincePositive = 0;
    for (let i = priceHistory.length - 1; i >= 0; i--) {
      const value = priceHistory[i].close * position.shares;
      if (value >= position.totalCost) {
        const date = new Date(priceHistory[i].date);
        daysSincePositive = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        break;
      }
    }
  }

  return {
    totalReturn,
    totalReturnPercent,
    annualizedReturn,
    holdingPeriodDays,
    firstPurchaseDate,
    lastTransactionDate,
    highestPrice,
    lowestPrice,
    priceVolatility,
    maxDrawdown,
    maxDrawdownPercent,
    daysSincePositive,
    bestDayGain,
    bestDayGainDate,
    worstDayLoss,
    worstDayLossDate,
  };
}

export function calculateDividendSummary(
  transactions: Transaction[],
  currentPositionValue: number
): DividendSummary {
  const dividendTransactions = transactions.filter(t => isDividendType(t.type));

  const totalDividends = dividendTransactions.reduce((sum, txn) => {
    const quantity = parseNumericString(txn.quantity, 0);
    const price = parseNumericString(txn.price, 0);
    return sum + quantity * price;
  }, 0);

  const dividendCount = dividendTransactions.length;
  const averageDividend = dividendCount > 0 ? totalDividends / dividendCount : 0;

  const sortedDividends = [...dividendTransactions].sort((a, b) => b.date.localeCompare(a.date));
  const lastDividendDate = sortedDividends.length > 0 ? sortedDividends[0].date : null;

  const perYearMap = new Map<string, { total: number; count: number }>();
  const perQuarterMap = new Map<string, { total: number; count: number }>();
  for (const txn of dividendTransactions) {
    const year = txn.date?.slice(0, 4) || 'Unknown';
    const amount = parseNumericString(txn.quantity, 0) * parseNumericString(txn.price, 0);
    const current = perYearMap.get(year) || { total: 0, count: 0 };
    current.total += amount;
    current.count += 1;
    perYearMap.set(year, current);

    const quarter = (() => {
      if (!txn.date) return `${year}-Q?`;
      const month = new Date(txn.date).getMonth();
      const q = Math.floor(month / 3) + 1;
      return `${year}-Q${q}`;
    })();
    const quarterAgg = perQuarterMap.get(quarter) || { total: 0, count: 0 };
    quarterAgg.total += amount;
    quarterAgg.count += 1;
    perQuarterMap.set(quarter, quarterAgg);
  }

  const perYearTotals: DividendPeriodSummary[] = Array.from(perYearMap.entries())
    .map(([year, data]) => ({
      period: year,
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => b.period.localeCompare(a.period));

  const perQuarterTotals: DividendPeriodSummary[] = Array.from(perQuarterMap.entries())
    .map(([period, data]) => ({
      period,
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => b.period.localeCompare(a.period));

  const lastYearDividends = dividendTransactions
    .filter(txn => {
      const txnDate = new Date(txn.date);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return txnDate >= oneYearAgo;
    })
    .reduce((sum, txn) => {
      const quantity = parseNumericString(txn.quantity, 0);
      const price = parseNumericString(txn.price, 0);
      return sum + quantity * price;
    }, 0);

  const annualYield =
    currentPositionValue > 0 ? (lastYearDividends / currentPositionValue) * 100 : null;

  return {
    totalDividends,
    dividendCount,
    averageDividend,
    lastDividendDate,
    annualYield,
    perYearTotals,
    perQuarterTotals,
  };
}

export function extractTransactionEvents(transactions: Transaction[]): TransactionEvent[] {
  const events: TransactionEvent[] = [];
  let runningShares = 0;

  const sortedTransactions = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  for (const txn of sortedTransactions) {
    const quantity = parseNumericString(txn.quantity, 0);
    const price = parseNumericString(txn.price, 0);
    const type = normalizeTransactionType(txn.type);

    let eventType: 'buy' | 'sell' | 'dividend' | 'split';
    if (type === 'buy' || type === 'purchase') {
      eventType = 'buy';
      runningShares += quantity;
    } else if (type === 'sell' || type === 'sale') {
      eventType = 'sell';
      runningShares -= quantity;
    } else if (isDividendType(type)) {
      eventType = 'dividend';
    } else if (type === 'split' || type.includes('split')) {
      eventType = 'split';
      const splitRatio = parseNumericString(txn.split_ratio, 1);
      runningShares *= splitRatio;
    } else {
      continue;
    }

    events.push({
      date: txn.date,
      type: eventType,
      quantity,
      price,
      amount: quantity * price,
      sharesAfter: runningShares,
    });
  }

  return events;
}

export function buildChartData(
  priceHistory: PriceRecord[],
  transactions: Transaction[],
  splits: SplitRecord[]
): ChartDataPoint[] {
  const costBasisMap = calculateCostBasisTimeSeries(transactions, splits);
  const sortedTransactions = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const chartData: ChartDataPoint[] = [];
  let txnIndex = 0;
  let runningShares = 0;

  for (const record of priceHistory) {
    while (txnIndex < sortedTransactions.length && sortedTransactions[txnIndex].date <= record.date) {
      const txn = sortedTransactions[txnIndex];
      const quantity = parseNumericString(txn.quantity, 0);
      const type = normalizeTransactionType(txn.type);

      if (type === 'buy' || type === 'purchase') {
        runningShares += quantity;
      } else if (type === 'sell' || type === 'sale') {
        runningShares -= quantity;
      } else if (type === 'split' || type.includes('split')) {
        const splitRatio = parseNumericString(txn.split_ratio, 1);
        runningShares *= splitRatio;
      }

      txnIndex += 1;
    }

    const costBasis = costBasisMap.get(record.date) || Array.from(costBasisMap.values()).pop() || 0;

    chartData.push({
      date: record.date,
      close: record.close,
      unadjustedClose: record.split_unadjusted_close,
      costBasis,
      volume: record.volume ?? null,
      shares: runningShares,
    });
  }

  return chartData;
}
