import { Transaction, TransactionStats } from '../types/Transaction';

export function calculateTransactionStats(transactions: Transaction[]): TransactionStats {
  return {
    total: transactions.length,
    buys: transactions.filter(t => t.type.toLowerCase() === 'buy').length,
    sells: transactions.filter(t => t.type.toLowerCase() === 'sell').length,
    dividends: transactions.filter(t => t.type.toLowerCase().includes('div')).length,
    splits: transactions.filter(t => t.type.toLowerCase() === 'split').length,
    usd: transactions.filter(t => t.currency === 'USD').length,
    twd: transactions.filter(t => t.currency === 'TWD').length,
    jpy: transactions.filter(t => t.currency === 'JPY').length,
    hkd: transactions.filter(t => t.currency === 'HKD').length,
  };
}
