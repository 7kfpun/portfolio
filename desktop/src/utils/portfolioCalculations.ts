import { Transaction } from '../types/Transaction';
import { Position, PortfolioSummary } from '../types/Portfolio';

export function calculatePositions(transactions: Transaction[]): Position[] {
  const positionMap = new Map<string, Position>();

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const txn of sortedTransactions) {
    const key = `${txn.stock}_${txn.currency}`;
    const type = txn.type.toLowerCase();

    const quantity = parseFloat(txn.quantity.replace(/[^0-9.-]/g, '')) || 0;
    const price = parseFloat(txn.price.replace(/[^0-9.-]/g, '')) || 0;
    const fees = parseFloat(txn.fees.replace(/[^0-9.-]/g, '')) || 0;
    const splitRatio = parseFloat(txn.split_ratio.replace(/[^0-9.-]/g, '')) || 1;

    if (!positionMap.has(key)) {
      positionMap.set(key, {
        stock: txn.stock,
        currency: txn.currency,
        shares: 0,
        averageCost: 0,
        totalCost: 0,
      });
    }

    const position = positionMap.get(key)!;

    if (type === 'buy' || type === 'purchase') {
      const cost = quantity * price + fees;
      const newShares = position.shares + quantity;
      const newTotalCost = position.totalCost + cost;

      position.shares = newShares;
      position.totalCost = newTotalCost;
      position.averageCost = newShares > 0 ? newTotalCost / newShares : 0;
    } else if (type === 'sell' || type === 'sale') {
      const costBasis = position.averageCost * quantity;
      position.shares -= quantity;
      position.totalCost -= costBasis;

      if (position.shares <= 0) {
        position.shares = 0;
        position.totalCost = 0;
        position.averageCost = 0;
      }
    } else if (type === 'split') {
      if (splitRatio > 0 && position.shares > 0) {
        position.shares = position.shares * splitRatio;
        position.averageCost = position.averageCost / splitRatio;
      }
    }
  }

  return Array.from(positionMap.values()).filter(p => p.shares > 0);
}

export function calculatePortfolioSummary(
  positions: Position[],
  fxRates?: Map<string, number>
): PortfolioSummary {
  let totalValueUSD = 0;
  let totalCostUSD = 0;
  const byCurrency: PortfolioSummary['byCurrency'] = {};

  const convertToUSD = (amount: number, currency: string): number => {
    if (currency === 'USD') return amount;
    if (!fxRates) return 0;
    const rate = fxRates.get(currency);
    return rate ? amount * rate : 0;
  };

  for (const position of positions) {
    const value = position.currentValue || position.totalCost;
    const cost = position.totalCost;
    const gainLoss = value - cost;

    totalValueUSD += convertToUSD(value, position.currency);
    totalCostUSD += convertToUSD(cost, position.currency);

    if (!byCurrency[position.currency]) {
      byCurrency[position.currency] = {
        value: 0,
        cost: 0,
        gainLoss: 0,
        positions: 0,
      };
    }

    byCurrency[position.currency].value += value;
    byCurrency[position.currency].cost += cost;
    byCurrency[position.currency].gainLoss += gainLoss;
    byCurrency[position.currency].positions += 1;
  }

  const totalGainLoss = totalValueUSD - totalCostUSD;
  const totalGainLossPercent = totalCostUSD > 0 ? (totalGainLoss / totalCostUSD) * 100 : 0;

  return {
    positions,
    totalValue: totalValueUSD,
    totalCost: totalCostUSD,
    totalGainLoss,
    totalGainLossPercent,
    byCurrency,
  };
}

export function updatePositionWithPrice(position: Position, currentPrice: number): Position {
  const currentValue = position.shares * currentPrice;
  const gainLoss = currentValue - position.totalCost;
  const gainLossPercent =
    position.totalCost > 0 ? (gainLoss / position.totalCost) * 100 : 0;

  return {
    ...position,
    currentPrice,
    currentValue,
    gainLoss,
    gainLossPercent,
    lastUpdated: new Date().toISOString(),
  };
}
