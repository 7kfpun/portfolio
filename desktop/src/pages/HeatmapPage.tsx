import { useMemo, useEffect, useState } from 'react';
import styled from 'styled-components';
import { usePortfolioStore } from '../store/portfolioStore';
import { useTransactionsStore } from '../store/transactionsStore';
import { priceDataService } from '../services/priceDataService';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { Container, Header, Meta, Title, Description, Card, LoadingText } from '../components/PageLayout';
import { Stats, StatCardComponent } from '../components/StatsCards';
import { Position } from '../types/Portfolio';
import { PriceRecord } from '../types/PriceData';

const HeatmapGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
  padding: 1rem 0;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.5rem;
  }
`;

const StockCell = styled.div<{ $percentChange: number; $size: number }>`
  position: relative;
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease;
  min-height: ${props => Math.max(100, props.$size)}px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  background: ${props => {
    const intensity = Math.min(Math.abs(props.$percentChange) / 10, 1);
    if (props.$percentChange > 0) {
      return `hsl(142, ${Math.round(70 + intensity * 20)}%, ${Math.round(65 - intensity * 30)}%)`;
    } else if (props.$percentChange < 0) {
      return `hsl(0, ${Math.round(70 + intensity * 20)}%, ${Math.round(65 - intensity * 30)}%)`;
    }
    return '#e2e8f0';
  }};

  color: ${props => {
    const intensity = Math.min(Math.abs(props.$percentChange) / 10, 1);
    return intensity > 0.4 ? 'white' : '#1e293b';
  }};

  border: 1px solid ${props => {
    const intensity = Math.min(Math.abs(props.$percentChange) / 10, 1);
    if (props.$percentChange > 0) {
      return `hsl(142, ${Math.round(70)}%, ${Math.round(50 - intensity * 20)}%)`;
    } else if (props.$percentChange < 0) {
      return `hsl(0, ${Math.round(70)}%, ${Math.round(50 - intensity * 20)}%)`;
    }
    return '#cbd5e1';
  }};

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    z-index: 10;
  }

  @media (max-width: 768px) {
    padding: 0.75rem;
    min-height: ${props => Math.max(80, props.$size * 0.8)}px;
  }
`;

const StockSymbol = styled.div`
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const StockShares = styled.div`
  font-size: 0.75rem;
  opacity: 0.85;
  margin-bottom: 0.5rem;

  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
`;

const StockValue = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  margin-top: auto;

  @media (max-width: 768px) {
    font-size: 0.75rem;
  }
`;

const StockChange = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  margin-top: 0.25rem;

  @media (max-width: 768px) {
    font-size: 0.95rem;
  }
`;

const StockDailyChange = styled.div<{ $positive: boolean }>`
  font-size: 0.75rem;
  font-weight: 600;
  margin-top: 0.25rem;
  color: ${props => props.$positive ? '#16a34a' : '#dc2626'};
  opacity: 0.9;

  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
`;

const CurrencySection = styled.div`
  margin-bottom: 2rem;
`;

const CurrencyTitle = styled.h3<{ $color: string }>`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${props => props.$color};
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid ${props => props.$color}33;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const Legend = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
  font-size: 0.85rem;
  color: #64748b;
  flex-wrap: wrap;
`;

const LegendLabel = styled.span`
  font-weight: 600;
`;

const LegendGradient = styled.div`
  display: flex;
  gap: 0.25rem;
  align-items: center;
`;

const LegendCell = styled.div<{ $color: string }>`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: ${props => props.$color};
  border: 1px solid rgba(0, 0, 0, 0.1);
`;

const TableContainer = styled.div`
  margin-top: 2rem;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;

  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const Th = styled.th`
  text-align: left;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;

  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
  }
`;

const Td = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  color: #1e293b;

  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
  }
`;

const PercentageCell = styled(Td)<{ $positive: boolean }>`
  font-weight: 600;
  color: ${props => props.$positive ? '#16a34a' : '#dc2626'};
`;

const TabContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 2px solid #e2e8f0;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 0.75rem 1.5rem;
  border: none;
  background: ${props => props.$active ? '#667eea' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#64748b'};
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
  border-radius: 8px 8px 0 0;

  &:hover {
    background: ${props => props.$active ? '#667eea' : '#f1f5f9'};
    color: ${props => props.$active ? 'white' : '#475569'};
  }

  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }
`;

const CURRENCY_COLORS: Record<string, string> = {
  USD: '#2563eb',
  TWD: '#dc2626',
  JPY: '#16a34a',
  HKD: '#fb923c',
};

interface StockData extends Position {
  size: number;
  dailyGainLoss: number;
  dailyGainLossPercent: number;
}

export function HeatmapPage() {
  const transactions = useTransactionsStore(state => state.transactions);
  const loadingTransactions = useTransactionsStore(state => state.loading);
  const loadTransactions = useTransactionsStore(state => state.loadTransactions);

  const positions = usePortfolioStore(state => state.positions);
  const calculatePortfolio = usePortfolioStore(state => state.calculatePortfolio);
  const loadingPrices = usePortfolioStore(state => state.loadingPrices);
  const refreshPrices = usePortfolioStore(state => state.refreshPrices);

  const [activeTab, setActiveTab] = useState<'heatmap' | 'table'>('heatmap');
  const [historicalPrices, setHistoricalPrices] = useState<Map<string, PriceRecord[]>>(new Map());

  useEffect(() => {
    if (transactions.length === 0) {
      loadTransactions();
    }
  }, [transactions.length, loadTransactions]);

  useEffect(() => {
    if (transactions.length > 0) {
      calculatePortfolio();
    }
  }, [transactions.length, calculatePortfolio]);

  useEffect(() => {
    const loadHistoricalPrices = async () => {
      const allPrices = await priceDataService.loadAllPrices({ latestOnly: false });
      const priceMap = new Map<string, PriceRecord[]>();

      for (const price of allPrices) {
        if (!priceMap.has(price.symbol)) {
          priceMap.set(price.symbol, []);
        }
        priceMap.get(price.symbol)!.push(price);
      }

      priceMap.forEach((prices, symbol) => {
        priceMap.set(symbol, prices.sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
      });

      setHistoricalPrices(priceMap);
    };

    if (positions.length > 0) {
      loadHistoricalPrices();
    }
  }, [positions.length]);

  const stocksByCurrency = useMemo(() => {
    const grouped = new Map<string, StockData[]>();

    if (positions.length === 0) return grouped;

    const totalPortfolioValue = positions.reduce(
      (sum, p) => sum + (p.currentValue || p.totalCost),
      0
    );

    positions.forEach(position => {
      const currentValue = position.currentValue || position.totalCost;
      const percentOfPortfolio = (currentValue / totalPortfolioValue) * 100;
      const size = Math.sqrt(percentOfPortfolio) * 40;

      let dailyGainLoss = 0;
      let dailyGainLossPercent = 0;

      const priceHistory = historicalPrices.get(position.stock);
      if (priceHistory && priceHistory.length >= 2 && position.currentPrice) {
        const previousPrice = priceHistory[1]?.close;
        if (previousPrice) {
          dailyGainLoss = (position.currentPrice - previousPrice) * position.shares;
          dailyGainLossPercent = ((position.currentPrice - previousPrice) / previousPrice) * 100;
        }
      }

      const stockData: StockData = {
        ...position,
        size,
        dailyGainLoss,
        dailyGainLossPercent,
      };

      const currency = position.currency;
      if (!grouped.has(currency)) {
        grouped.set(currency, []);
      }
      grouped.get(currency)!.push(stockData);
    });

    grouped.forEach((stocks, currency) => {
      grouped.set(
        currency,
        stocks.sort((a, b) => (b.currentValue || b.totalCost) - (a.currentValue || a.totalCost))
      );
    });

    return grouped;
  }, [positions, historicalPrices]);

  const portfolioStats = useMemo(() => {
    if (positions.length === 0) {
      return {
        totalValue: 0,
        totalGain: 0,
        totalGainPercent: 0,
        gainers: 0,
        losers: 0,
        neutral: 0,
        totalDailyGain: 0,
        totalDailyGainPercent: 0,
      };
    }

    const totalValue = positions.reduce((sum, p) => sum + (p.currentValue || p.totalCost), 0);
    const totalCost = positions.reduce((sum, p) => sum + p.totalCost, 0);
    const totalGain = totalValue - totalCost;
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

    const gainers = positions.filter(p => (p.gainLossPercent || 0) > 0).length;
    const losers = positions.filter(p => (p.gainLossPercent || 0) < 0).length;
    const neutral = positions.filter(p => (p.gainLossPercent || 0) === 0).length;

    let totalDailyGain = 0;
    Array.from(stocksByCurrency.values()).forEach(stocks => {
      stocks.forEach(stock => {
        totalDailyGain += stock.dailyGainLoss;
      });
    });
    const totalDailyGainPercent = totalValue > 0 ? (totalDailyGain / totalValue) * 100 : 0;

    return { totalValue, totalGain, totalGainPercent, gainers, losers, neutral, totalDailyGain, totalDailyGainPercent };
  }, [positions, stocksByCurrency]);

  const allStocks = useMemo(() => {
    const stocks: StockData[] = [];
    stocksByCurrency.forEach(stockList => {
      stocks.push(...stockList);
    });
    return stocks.sort((a, b) => Math.abs(b.dailyGainLoss) - Math.abs(a.dailyGainLoss));
  }, [stocksByCurrency]);

  if (loadingTransactions || loadingPrices) {
    return (
      <Container>
        <Card>
          <LoadingText>Loading portfolio data...</LoadingText>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Meta>Portfolio Visualization</Meta>
        <Title>Portfolio Heatmap</Title>
        <Description>
          Visual representation of your holdings performance
        </Description>
      </Header>

      <Stats>
        <StatCardComponent
          icon={<DollarSign size={20} color="#667eea" />}
          label="Total Value"
          value={`$${portfolioStats.totalValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
        />
        <StatCardComponent
          icon={portfolioStats.totalGain >= 0 ? <TrendingUp size={20} color="#16a34a" /> : <TrendingDown size={20} color="#dc2626" />}
          label="Total Gain/Loss"
          value={`${portfolioStats.totalGain >= 0 ? '+' : ''}${portfolioStats.totalGainPercent.toFixed(2)}%`}
          variant={portfolioStats.totalGain >= 0 ? 'positive' : 'negative'}
          valueColor={portfolioStats.totalGain >= 0 ? '#16a34a' : '#dc2626'}
        />
        <StatCardComponent
          icon={<Calendar size={20} color={portfolioStats.totalDailyGain >= 0 ? '#16a34a' : '#dc2626'} />}
          label="Daily Gain/Loss"
          value={`${portfolioStats.totalDailyGain >= 0 ? '+' : ''}$${Math.abs(portfolioStats.totalDailyGain).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} (${portfolioStats.totalDailyGain >= 0 ? '+' : ''}${portfolioStats.totalDailyGainPercent.toFixed(2)}%)`}
          variant={portfolioStats.totalDailyGain >= 0 ? 'positive' : 'negative'}
          valueColor={portfolioStats.totalDailyGain >= 0 ? '#16a34a' : '#dc2626'}
        />
        <StatCardComponent
          icon={<TrendingUp size={20} color="#16a34a" />}
          label="Gainers"
          value={portfolioStats.gainers}
          variant="positive"
          valueColor="#16a34a"
        />
      </Stats>

      <Card>
        <TabContainer>
          <Tab $active={activeTab === 'heatmap'} onClick={() => setActiveTab('heatmap')}>
            Heatmap View
          </Tab>
          <Tab $active={activeTab === 'table'} onClick={() => setActiveTab('table')}>
            Table View
          </Tab>
        </TabContainer>

        {activeTab === 'heatmap' ? (
          <>
            {Array.from(stocksByCurrency.entries()).map(([currency, stocks]) => (
              <CurrencySection key={currency}>
                <CurrencyTitle $color={CURRENCY_COLORS[currency] || '#64748b'}>
                  {currency} Holdings ({stocks.length})
                </CurrencyTitle>
                <HeatmapGrid>
                  {stocks.map(stock => {
                    const percentChange = stock.gainLossPercent || 0;
                    const currentValue = stock.currentValue || stock.totalCost;

                    return (
                      <StockCell
                        key={stock.stock}
                        $percentChange={percentChange}
                        $size={stock.size}
                      >
                        <div>
                          <StockSymbol>{stock.stock}</StockSymbol>
                          <StockShares>{stock.shares.toLocaleString()} shares</StockShares>
                        </div>
                        <div>
                          <StockValue>
                            ${currentValue.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </StockValue>
                          <StockChange>
                            {percentChange >= 0 ? '+' : ''}
                            {percentChange.toFixed(2)}%
                          </StockChange>
                          <StockDailyChange $positive={stock.dailyGainLoss >= 0}>
                            Day: {stock.dailyGainLoss >= 0 ? '+' : ''}
                            {stock.dailyGainLossPercent.toFixed(2)}%
                          </StockDailyChange>
                        </div>
                      </StockCell>
                    );
                  })}
                </HeatmapGrid>
              </CurrencySection>
            ))}

            {stocksByCurrency.size === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                No positions found. Add transactions to see your portfolio heatmap.
              </div>
            )}

            <Legend>
              <LegendLabel>Performance:</LegendLabel>
              <LegendGradient>
                <LegendCell $color="#fee2e2" />
                <LegendCell $color="#fca5a5" />
                <LegendCell $color="#dc2626" />
                <span>Strong Loss</span>
              </LegendGradient>
              <LegendGradient>
                <LegendCell $color="#e2e8f0" />
                <span>Neutral</span>
              </LegendGradient>
              <LegendGradient>
                <span>Strong Gain</span>
                <LegendCell $color="#86efac" />
                <LegendCell $color="#4ade80" />
                <LegendCell $color="#16a34a" />
              </LegendGradient>
              <div style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.7 }}>
                Cell size represents portfolio weight
              </div>
            </Legend>
          </>
        ) : (
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <Th>Symbol</Th>
                  <Th>Currency</Th>
                  <Th>Shares</Th>
                  <Th>Current Price</Th>
                  <Th>Current Value</Th>
                  <Th>Total Gain/Loss</Th>
                  <Th>Daily Change</Th>
                  <Th>Daily Gain/Loss</Th>
                </tr>
              </thead>
              <tbody>
                {allStocks.map(stock => {
                  const currentValue = stock.currentValue || stock.totalCost;
                  const totalGainLoss = stock.gainLoss || 0;
                  const totalGainLossPercent = stock.gainLossPercent || 0;

                  return (
                    <tr key={stock.stock}>
                      <Td style={{ fontWeight: 600 }}>{stock.stock}</Td>
                      <Td>
                        <span style={{ color: CURRENCY_COLORS[stock.currency] || '#64748b', fontWeight: 600 }}>
                          {stock.currency}
                        </span>
                      </Td>
                      <Td>{stock.shares.toLocaleString()}</Td>
                      <Td>
                        ${(stock.currentPrice || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Td>
                      <Td>
                        ${currentValue.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Td>
                      <PercentageCell $positive={totalGainLoss >= 0}>
                        {totalGainLoss >= 0 ? '+' : ''}${Math.abs(totalGainLoss).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} ({totalGainLoss >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%)
                      </PercentageCell>
                      <PercentageCell $positive={stock.dailyGainLossPercent >= 0}>
                        {stock.dailyGainLossPercent >= 0 ? '+' : ''}{stock.dailyGainLossPercent.toFixed(2)}%
                      </PercentageCell>
                      <PercentageCell $positive={stock.dailyGainLoss >= 0}>
                        {stock.dailyGainLoss >= 0 ? '+' : ''}${Math.abs(stock.dailyGainLoss).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </PercentageCell>
                    </tr>
                  );
                })}
              </tbody>
            </Table>

            {allStocks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                No positions found. Add transactions to see your portfolio data.
              </div>
            )}
          </TableContainer>
        )}
      </Card>
    </Container>
  );
}
