import { describe, it, expect } from 'vitest';
import { calculateTransactionStats } from '../../src/utils/transactionStats';
import { Transaction } from '../../src/types/Transaction';

describe('transactionStats', () => {
  describe('calculateTransactionStats', () => {
    it('should return zero stats for empty array', () => {
      const stats = calculateTransactionStats([]);
      expect(stats).toEqual({
        total: 0,
        buys: 0,
        sells: 0,
        dividends: 0,
        splits: 0,
        usd: 0,
        twd: 0,
        jpy: 0,
        hkd: 0,
      });
    });

    it('should count transaction types correctly', () => {
      const transactions: Transaction[] = [
        { stock: 'AAPL', type: 'Buy', date: '2024-01-01', quantity: '10', price: '150', fees: '1', currency: 'USD', split_ratio: '1' },
        { stock: 'TSLA', type: 'Buy', date: '2024-01-02', quantity: '5', price: '200', fees: '1', currency: 'USD', split_ratio: '1' },
        { stock: 'AAPL', type: 'Sell', date: '2024-01-03', quantity: '5', price: '160', fees: '1', currency: 'USD', split_ratio: '1' },
        { stock: 'AAPL', type: 'Dividend', date: '2024-01-04', quantity: '0', price: '0.5', fees: '0', currency: 'USD', split_ratio: '1' },
        { stock: 'GOOGL', type: 'Split', date: '2024-01-05', quantity: '0', price: '0', fees: '0', currency: 'USD', split_ratio: '2' },
      ];
      const stats = calculateTransactionStats(transactions);
      expect(stats.total).toBe(5);
      expect(stats.buys).toBe(2);
      expect(stats.sells).toBe(1);
      expect(stats.dividends).toBe(1);
      expect(stats.splits).toBe(1);
    });

    it('should handle case-insensitive type matching', () => {
      const transactions: Transaction[] = [
        { stock: 'AAPL', type: 'buy', date: '2024-01-01', quantity: '10', price: '150', fees: '1', currency: 'USD', split_ratio: '1' },
        { stock: 'TSLA', type: 'BUY', date: '2024-01-02', quantity: '5', price: '200', fees: '1', currency: 'USD', split_ratio: '1' },
        { stock: 'AAPL', type: 'SELL', date: '2024-01-03', quantity: '5', price: '160', fees: '1', currency: 'USD', split_ratio: '1' },
        { stock: 'AAPL', type: 'dividend', date: '2024-01-04', quantity: '0', price: '0.5', fees: '0', currency: 'USD', split_ratio: '1' },
      ];
      const stats = calculateTransactionStats(transactions);
      expect(stats.buys).toBe(2);
      expect(stats.sells).toBe(1);
      expect(stats.dividends).toBe(1);
    });

    it('should count currencies correctly', () => {
      const transactions: Transaction[] = [
        { stock: 'AAPL', type: 'Buy', date: '2024-01-01', quantity: '10', price: '150', fees: '1', currency: 'USD', split_ratio: '1' },
        { stock: 'TSLA', type: 'Buy', date: '2024-01-02', quantity: '5', price: '200', fees: '1', currency: 'USD', split_ratio: '1' },
        { stock: '2330', type: 'Buy', date: '2024-01-03', quantity: '100', price: '600', fees: '20', currency: 'TWD', split_ratio: '1' },
        { stock: '2330', type: 'Sell', date: '2024-01-04', quantity: '50', price: '620', fees: '15', currency: 'TWD', split_ratio: '1' },
        { stock: '7203', type: 'Buy', date: '2024-01-05', quantity: '50', price: '2000', fees: '100', currency: 'JPY', split_ratio: '1' },
        { stock: '0700', type: 'Buy', date: '2024-01-06', quantity: '10', price: '350', fees: '5', currency: 'HKD', split_ratio: '1' },
      ];
      const stats = calculateTransactionStats(transactions);
      expect(stats.total).toBe(6);
      expect(stats.usd).toBe(2);
      expect(stats.twd).toBe(2);
      expect(stats.jpy).toBe(1);
      expect(stats.hkd).toBe(1);
    });

    it('should handle dividend variations', () => {
      const transactions: Transaction[] = [
        { stock: 'AAPL', type: 'Dividend', date: '2024-01-01', quantity: '0', price: '0.5', fees: '0', currency: 'USD', split_ratio: '1' },
        { stock: 'MSFT', type: 'dividend', date: '2024-01-02', quantity: '0', price: '0.6', fees: '0', currency: 'USD', split_ratio: '1' },
        { stock: 'GOOGL', type: 'DIV', date: '2024-01-03', quantity: '0', price: '0.4', fees: '0', currency: 'USD', split_ratio: '1' },
      ];
      const stats = calculateTransactionStats(transactions);
      expect(stats.dividends).toBe(3);
    });

    it('should handle mixed transaction data', () => {
      const transactions: Transaction[] = [
        { stock: 'AAPL', type: 'Buy', date: '2024-01-01', quantity: '10', price: '150', fees: '1', currency: 'USD', split_ratio: '1' },
        { stock: '2330', type: 'Buy', date: '2024-01-02', quantity: '100', price: '600', fees: '20', currency: 'TWD', split_ratio: '1' },
        { stock: 'AAPL', type: 'Sell', date: '2024-01-03', quantity: '5', price: '160', fees: '1', currency: 'USD', split_ratio: '1' },
        { stock: '7203', type: 'Buy', date: '2024-01-04', quantity: '50', price: '2000', fees: '100', currency: 'JPY', split_ratio: '1' },
        { stock: 'AAPL', type: 'Dividend', date: '2024-01-05', quantity: '0', price: '0.5', fees: '0', currency: 'USD', split_ratio: '1' },
      ];
      const stats = calculateTransactionStats(transactions);
      expect(stats.total).toBe(5);
      expect(stats.buys).toBe(3);
      expect(stats.sells).toBe(1);
      expect(stats.dividends).toBe(1);
      expect(stats.splits).toBe(0);
      expect(stats.usd).toBe(3);
      expect(stats.twd).toBe(1);
      expect(stats.jpy).toBe(1);
      expect(stats.hkd).toBe(0);
    });
  });
});
