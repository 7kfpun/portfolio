import { describe, it, expect } from 'vitest';
import { calculatePositions, updatePositionWithPrice } from '../../src/utils/portfolioCalculations';
import { Transaction } from '../../src/types/Transaction';

describe('portfolioCalculations', () => {
  describe('calculatePositions', () => {
    it('should calculate basic buy position', () => {
      const transactions: Transaction[] = [
        {
          date: '2024-01-01',
          stock: 'NASDAQ:AAPL',
          type: 'Buy',
          quantity: '100',
          price: '$150.00',
          fees: '$10.00',
          split_ratio: '',
          currency: 'USD',
        },
      ];

      const positions = calculatePositions(transactions);

      expect(positions).toHaveLength(1);
      expect(positions[0]).toMatchObject({
        stock: 'NASDAQ:AAPL',
        currency: 'USD',
        shares: 100,
        totalCost: 15010, // 100 * 150 + 10
        averageCost: 150.1, // 15010 / 100
      });
    });

    it('should handle stock split - 4-for-1', () => {
      const transactions: Transaction[] = [
        {
          date: '2020-01-01',
          stock: 'NASDAQ:AAPL',
          type: 'Buy',
          quantity: '50',
          price: '$400.00',
          fees: '$0.00',
          split_ratio: '',
          currency: 'USD',
        },
        {
          date: '2020-08-31',
          stock: 'NASDAQ:AAPL',
          type: 'Split',
          quantity: '0',
          price: '$0.00',
          fees: '$0.00',
          split_ratio: '4',
          currency: 'USD',
        },
      ];

      const positions = calculatePositions(transactions);

      expect(positions).toHaveLength(1);
      expect(positions[0]).toMatchObject({
        stock: 'NASDAQ:AAPL',
        currency: 'USD',
        shares: 200, // 50 * 4
        totalCost: 20000, // unchanged
        averageCost: 100, // 400 / 4
      });
    });

    it('should handle stock split - 10-for-1', () => {
      const transactions: Transaction[] = [
        {
          date: '2022-01-01',
          stock: 'NASDAQ:SHOP',
          type: 'Buy',
          quantity: '8',
          price: '$1000.00',
          fees: '$0.00',
          split_ratio: '',
          currency: 'USD',
        },
        {
          date: '2022-06-29',
          stock: 'NASDAQ:SHOP',
          type: 'Split',
          quantity: '0',
          price: '$0.00',
          fees: '$0.00',
          split_ratio: '10',
          currency: 'USD',
        },
      ];

      const positions = calculatePositions(transactions);

      expect(positions).toHaveLength(1);
      expect(positions[0]).toMatchObject({
        stock: 'NASDAQ:SHOP',
        currency: 'USD',
        shares: 80, // 8 * 10
        totalCost: 8000, // unchanged
        averageCost: 100, // 1000 / 10
      });
    });

    it('should handle multiple splits', () => {
      const transactions: Transaction[] = [
        {
          date: '2019-01-01',
          stock: 'NASDAQ:NVDA',
          type: 'Buy',
          quantity: '100',
          price: '$40.00',
          fees: '$0.00',
          split_ratio: '',
          currency: 'USD',
        },
        {
          date: '2021-07-19',
          stock: 'NASDAQ:NVDA',
          type: 'Split',
          quantity: '0',
          price: '$0.00',
          fees: '$0.00',
          split_ratio: '4',
          currency: 'USD',
        },
      ];

      const positions = calculatePositions(transactions);

      expect(positions).toHaveLength(1);
      expect(positions[0]).toMatchObject({
        stock: 'NASDAQ:NVDA',
        currency: 'USD',
        shares: 400, // 100 * 4
        totalCost: 4000, // unchanged
        averageCost: 10, // 40 / 4
      });
    });

    it('should handle buy-split-sell sequence', () => {
      const transactions: Transaction[] = [
        {
          date: '2020-01-01',
          stock: 'NASDAQ:AAPL',
          type: 'Buy',
          quantity: '100',
          price: '$400.00',
          fees: '$0.00',
          split_ratio: '',
          currency: 'USD',
        },
        {
          date: '2020-08-31',
          stock: 'NASDAQ:AAPL',
          type: 'Split',
          quantity: '0',
          price: '$0.00',
          fees: '$0.00',
          split_ratio: '4',
          currency: 'USD',
        },
        {
          date: '2021-01-01',
          stock: 'NASDAQ:AAPL',
          type: 'Sell',
          quantity: '200',
          price: '$120.00',
          fees: '$0.00',
          split_ratio: '',
          currency: 'USD',
        },
      ];

      const positions = calculatePositions(transactions);

      expect(positions).toHaveLength(1);
      expect(positions[0]).toMatchObject({
        stock: 'NASDAQ:AAPL',
        currency: 'USD',
        shares: 200, // 100 * 4 - 200
        totalCost: 20000, // 40000 - (100 * 200)
        averageCost: 100, // 400 / 4
      });
    });

    it('should handle reverse split - 1-for-2', () => {
      const transactions: Transaction[] = [
        {
          date: '2020-01-01',
          stock: 'NASDAQ:TEST',
          type: 'Buy',
          quantity: '100',
          price: '$10.00',
          fees: '$0.00',
          split_ratio: '',
          currency: 'USD',
        },
        {
          date: '2020-06-01',
          stock: 'NASDAQ:TEST',
          type: 'Split',
          quantity: '0',
          price: '$0.00',
          fees: '$0.00',
          split_ratio: '0.5',
          currency: 'USD',
        },
      ];

      const positions = calculatePositions(transactions);

      expect(positions).toHaveLength(1);
      expect(positions[0]).toMatchObject({
        stock: 'NASDAQ:TEST',
        currency: 'USD',
        shares: 50, // 100 * 0.5
        totalCost: 1000, // unchanged
        averageCost: 20, // 10 / 0.5
      });
    });

    it('should ignore split with zero shares', () => {
      const transactions: Transaction[] = [
        {
          date: '2020-08-31',
          stock: 'NASDAQ:AAPL',
          type: 'Split',
          quantity: '0',
          price: '$0.00',
          fees: '$0.00',
          split_ratio: '4',
          currency: 'USD',
        },
      ];

      const positions = calculatePositions(transactions);

      expect(positions).toHaveLength(0);
    });
  });

  describe('updatePositionWithPrice', () => {
    it('should update position with current price', () => {
      const position = {
        stock: 'NASDAQ:AAPL',
        currency: 'USD',
        shares: 200,
        averageCost: 100,
        totalCost: 20000,
      };

      const updated = updatePositionWithPrice(position, 285.45);

      expect(updated.stock).toBe('NASDAQ:AAPL');
      expect(updated.currency).toBe('USD');
      expect(updated.shares).toBe(200);
      expect(updated.averageCost).toBe(100);
      expect(updated.totalCost).toBe(20000);
      expect(updated.currentPrice).toBe(285.45);
      expect(updated.currentValue).toBe(57090);
      expect(updated.gainLoss).toBe(37090);
      expect(updated.gainLossPercent).toBeCloseTo(185.45, 2);
    });

    it('should handle negative gain/loss', () => {
      const position = {
        stock: 'NASDAQ:TEST',
        currency: 'USD',
        shares: 100,
        averageCost: 200,
        totalCost: 20000,
      };

      const updated = updatePositionWithPrice(position, 150);

      expect(updated).toMatchObject({
        currentPrice: 150,
        currentValue: 15000,
        gainLoss: -5000,
        gainLossPercent: -25,
      });
    });
  });
});
