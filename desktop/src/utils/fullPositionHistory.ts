import { Transaction } from '../types/Transaction';
import { parseNumericString } from './csvUtils';

export interface FullPositionEntry {
  stock: string;
  currency: string;
  shares: number;
  invested: number;
  remainingCost: number;
  averageCost: number;
  realizedPnl: number;
  dividends: number;
  lastTransaction: string | null;
  status: 'Active' | 'Closed';
}

interface InternalPositionState {
  stock: string;
  currency: string;
  shares: number;
  invested: number;
  remainingCost: number;
  averageCost: number;
  realizedPnl: number;
  dividends: number;
  lastTransaction: string | null;
}

const normalizeType = (value: string) => value.trim().toLowerCase();

export function buildFullPositionHistory(transactions: Transaction[]): FullPositionEntry[] {
  const map = new Map<string, InternalPositionState>();
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const txn of sorted) {
    const key = `${txn.stock}_${txn.currency}`;
    if (!map.has(key)) {
      map.set(key, {
        stock: txn.stock,
        currency: txn.currency,
        shares: 0,
        invested: 0,
        remainingCost: 0,
        averageCost: 0,
        realizedPnl: 0,
        dividends: 0,
        lastTransaction: null,
      });
    }

    const entry = map.get(key)!;
    entry.lastTransaction = txn.date || entry.lastTransaction;

    const quantity = parseNumericString(txn.quantity, 0);
    const price = parseNumericString(txn.price, 0);
    const fees = parseNumericString(txn.fees, 0);
    const splitRatio = parseNumericString(txn.split_ratio, 1);
    const type = normalizeType(txn.type);

    if (type === 'buy' || type === 'purchase') {
      const cost = quantity * price + fees;
      entry.invested += cost;
      entry.remainingCost += cost;
      entry.shares += quantity;
      entry.averageCost = entry.shares > 0 ? entry.remainingCost / entry.shares : 0;
    } else if (type === 'sell' || type === 'sale') {
      const qtyToSell = quantity;
      const costBasis = Math.min(entry.remainingCost, entry.averageCost * qtyToSell);
      const proceeds = quantity * price - fees;
      entry.shares = Math.max(0, entry.shares - qtyToSell);
      entry.remainingCost = Math.max(0, entry.remainingCost - costBasis);
      entry.averageCost = entry.shares > 0 ? entry.remainingCost / entry.shares : 0;
      entry.realizedPnl += proceeds - costBasis;
    } else if (type === 'dividend' || type === 'div') {
      const payout = quantity * price;
      entry.realizedPnl += payout;
      entry.dividends += payout;
    } else if (type.includes('split')) {
      if (splitRatio > 0 && entry.shares > 0) {
        entry.shares = entry.shares * splitRatio;
        entry.averageCost = entry.averageCost / splitRatio;
        entry.remainingCost = entry.averageCost * entry.shares;
      }
    }
  }

  return Array.from(map.values())
    .map(entry => ({
      ...entry,
      status: (entry.shares > 0 ? 'Active' : 'Closed') as 'Active' | 'Closed',
    }))
    .sort((a, b) => (b.lastTransaction || '').localeCompare(a.lastTransaction || ''));
}
