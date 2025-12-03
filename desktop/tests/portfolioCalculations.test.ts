import { describe, expect, it } from 'vitest';
import { calculatePositions, calculatePortfolioSummary, updatePositionWithPrice } from '../src/utils/portfolioCalculations';
import { Transaction } from '../src/types/Transaction';

const baseTxn: Transaction = {
  date: '2024-01-01',
  stock: 'NASDAQ:AAPL',
  type: 'Buy',
  quantity: '0',
  price: '0',
  fees: '0',
  split_ratio: '1',
  currency: 'USD',
};

describe('calculatePositions', () => {
  it('aggregates buys, sells, and fees into positions', () => {
    const transactions: Transaction[] = [
      { ...baseTxn, quantity: '10', price: '$100', fees: '1.50' },
      { ...baseTxn, date: '2024-01-05', quantity: '5', price: '110', fees: '0' },
      { ...baseTxn, date: '2024-01-10', type: 'Sell', quantity: '8', price: '120', fees: '2' },
    ];

    const [position] = calculatePositions(transactions);
    expect(position.shares).toBeCloseTo(7); // 10 + 5 - 8
    expect(position.totalCost).toBeCloseTo(724.0333, 3); // cost basis reduced by sale
    expect(position.averageCost).toBeCloseTo(position.totalCost / position.shares);
  });

  it('drops positions when all shares are sold', () => {
    const transactions: Transaction[] = [
      { ...baseTxn, quantity: '2', price: '50', fees: '0.5' },
      { ...baseTxn, type: 'Sell', date: '2024-01-02', quantity: '2', price: '60', fees: '0' },
    ];

    const positions = calculatePositions(transactions);
    expect(positions).toHaveLength(0);
  });
});

describe('calculatePortfolioSummary', () => {
  it('sums totals per currency and overall with FX rates', () => {
    const positions = [
      { stock: 'NASDAQ:AAPL', currency: 'USD', shares: 5, averageCost: 100, totalCost: 500, currentValue: 650 },
      { stock: 'TPE:2330', currency: 'TWD', shares: 10, averageCost: 200, totalCost: 2000, currentValue: 2200 },
    ];

    const fxRates = new Map<string, number>([
      ['USD', 1],
      ['TWD', 0.032], // 1 TWD = 0.032 USD
    ]);

    const summary = calculatePortfolioSummary(positions as any, fxRates);
    // USD: 650, TWD: 2200 * 0.032 = 70.4 → Total: 720.4
    expect(summary.totalValue).toBeCloseTo(720.4, 1);
    // USD: 500, TWD: 2000 * 0.032 = 64 → Total: 564
    expect(summary.totalCost).toBeCloseTo(564, 1);
    // Gain/Loss: 720.4 - 564 = 156.4
    expect(summary.totalGainLoss).toBeCloseTo(156.4, 1);
    expect(summary.byCurrency['USD'].positions).toBe(1);
    expect(summary.byCurrency['TWD'].gainLoss).toBe(200);
  });
});

describe('updatePositionWithPrice', () => {
  it('annotates positions with market values', () => {
    const position = {
      stock: 'NASDAQ:AAPL',
      currency: 'USD',
      shares: 3,
      averageCost: 90,
      totalCost: 270,
    };

    const updated = updatePositionWithPrice(position as any, 120);
    expect(updated.currentPrice).toBe(120);
    expect(updated.currentValue).toBe(360);
    expect(updated.gainLoss).toBe(90);
    expect(updated.gainLossPercent).toBeCloseTo(33.333, 2);
    expect(updated.lastUpdated).toBeTruthy();
  });
});
