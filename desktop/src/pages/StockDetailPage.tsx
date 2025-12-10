import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useStockDetailStore } from '../store/stockDetailStore';
import { useNavigationStore } from '../store/navigationStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Activity,
  PieChart,
} from 'lucide-react';
import {
  createChart,
  ColorType,
  ISeriesApi,
  SeriesMarker,
  SeriesMarkerPosition,
  SeriesMarkerShape,
  UTCTimestamp,
  AreaSeries,
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts';
import { TanStackTable } from '../components/TanStackTable';
import { createColumnHelper } from '@tanstack/react-table';
import { MetricCard } from '../components/MetricCard';
import { PageHeaderControls } from '../components/PageLayout';
import { YahooMeta } from '../types/YahooMeta';
import { DividendChart } from '../components/DividendChart';
import { TransactionEvent } from '../types/StockDetail';
import { CURRENCY_SYMBOLS } from '../config/currencies';
import { CurrencyType } from '../types/Settings';

const EVENT_VISUALS: Record<
  TransactionEvent['type'],
  { color: string; abbreviated: string; shape: SeriesMarkerShape; position: SeriesMarkerPosition; label: string }
> = {
  buy: { color: '#16a34a', abbreviated: 'B', shape: 'arrowUp', position: 'belowBar', label: 'Buy' },
  sell: { color: '#dc2626', abbreviated: 'S', shape: 'arrowDown', position: 'aboveBar', label: 'Sell' },
  dividend: { color: '#2563eb', abbreviated: 'D', shape: 'circle', position: 'aboveBar', label: 'Div' },
  split: { color: '#f97316', abbreviated: 'SP', shape: 'square', position: 'aboveBar', label: 'Split' },
};

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  margin-bottom: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #475569;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 120ms ease;

  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const StockTitle = styled.h1`
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const StockSubtitle = styled.p`
  margin: 0;
  color: #64748b;
  font-size: 1rem;
`;

const MetricsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
  align-items: start;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const TopSummary = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e2e8f0;
`;

const BigMetricBox = styled.div<{ $align?: 'left' | 'right' }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: ${props => props.$align === 'right' ? 'flex-end' : 'flex-start'};
`;

const BigMetricLabel = styled.div`
  font-size: 1rem;
  color: #64748b;
  font-weight: 500;
`;

const BigMetricValue = styled.div<{ $color?: string }>`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${props => props.$color || '#0f172a'};
  line-height: 1;
  letter-spacing: -0.02em;
  display: flex;
  align-items: baseline;
  gap: 12px;
`;

const BigMetricSubValue = styled.span<{ $positive?: boolean }>`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${props => props.$positive ? '#10b981' : '#ef4444'};
`;

const ChartSection = styled.div`
  margin-bottom: 2rem;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ChartTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #0f172a;
`;

const TimeRangeSelector = styled.div`
  display: inline-flex;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 4px;
  gap: 0;
`;

const ChartControls = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const TimeRangeButton = styled.button<{ $active?: boolean }>`
  padding: 0.35rem 0.75rem;
  border: none;
  border-radius: 6px;
  background: ${props => props.$active ? 'white' : 'transparent'};
  color: ${props => props.$active ? '#0f172a' : '#64748b'};
  font-size: 0.85rem;
  font-weight: 500; // Increased readable weight
  cursor: pointer;
  transition: all 150ms ease;
  box-shadow: ${props => props.$active ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'};

  &:hover {
    color: #0f172a;
    background: ${props => props.$active ? 'white' : 'rgba(255,255,255,0.5)'};
  }
`;

const ToggleButton = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid ${props => (props.$active ? '#0ea5e9' : '#e2e8f0')};
  border-radius: 6px;
  background: ${props => (props.$active ? 'rgba(14, 165, 233, 0.12)' : 'white')};
  color: ${props => (props.$active ? '#0ea5e9' : '#475569')};
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 120ms ease;

  &:hover {
    border-color: #0ea5e9;
    background: ${props => (props.$active ? 'rgba(14, 165, 233, 0.2)' : '#f8fafc')};
    color: #0ea5e9;
  }
`;


const ChartCanvas = styled.div`
  width: 100%;
  height: 400px;
  position: relative;
`;

const ChartCanvasInner = styled.div`
  width: 100%;
  height: 100%;
`;

const ChartEmptyState = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.95rem;
  pointer-events: none;
`;

const ChartLegend = styled.div`
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f8fafc;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #64748b;
  cursor: default;
`;

const LegendColor = styled.div<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.$color};
`;

const MarkerTooltip = styled.div`
  position: absolute;
  background: rgba(15, 23, 42, 0.92);
  color: white;
  padding: 0.35rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  pointer-events: none;
  white-space: nowrap;
  transform: translate(-50%, -130%);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.25);
  transition: opacity 80ms ease;
`;

const Section = styled.div`
  margin-bottom: 2rem;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const SectionTitle = styled.h2`
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PerformanceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
`;

const PerformanceItem = styled.div`
  padding: 1rem;
  border-left: 3px solid #667eea;
  background: #f8fafc;
  border-radius: 4px;
`;

const PerformanceLabel = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.25rem;
`;

const PerformanceValue = styled.div<{ $color?: string }>`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.$color || '#0f172a'};
`;

const DividendMetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const DividendVisualsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const DividendPanel = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const DividendPanelHeader = styled.div`
  padding: 16px 20px;
  font-weight: 600;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const DividendPeriodToggle = styled.div`
  display: inline-flex;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  overflow: hidden;
`;

const DividendPeriodButton = styled.button<{ $active?: boolean }>`
  border: none;
  background: ${props => (props.$active ? '#2563eb' : 'transparent')};
  color: ${props => (props.$active ? 'white' : '#2563eb')};
  padding: 0.35rem 0.75rem;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.8rem;

  &:hover {
    background: ${props => (props.$active ? '#2563eb' : '#e0f2fe')};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  color: #64748b;
`;

const ErrorContainer = styled.div`
  padding: 2rem;
  text-align: center;
  color: #ef4444;
`;

export function StockDetailPage() {
  const { selectedStock, goBackToPortfolio } = useNavigationStore();
  const privacyMode = useSettingsStore(state => state.privacyMode);
  const {
    stockData,
    chartData,
    navChartData,
    transactionEvents,
    dividendSummary,
    metrics,
    yahooMeta, // Added
    loading,
    error,
    chartTimeRange,
    loadStockDetail,
    setChartTimeRange,
    clearStockDetail,
  } = useStockDetailStore();
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<ReturnType<typeof createChart> | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const positionSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const navSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [markerTooltipState, setMarkerTooltipState] = useState({
    visible: false,
    x: 0,
    y: 0,
    top: 0,
    content: null as React.ReactNode,
  });
  const toTimestamp = (date: string): UTCTimestamp =>
    (Math.floor(new Date(date).getTime() / 1000) as UTCTimestamp);
  const [dividendPeriodMode, setDividendPeriodMode] = useState<'year' | 'quarter'>('year');
  /* Default Toggles: NAV On, others Off */
  const [showPositionSeries, setShowPositionSeries] = useState(false);
  const [showNavSeries, setShowNavSeries] = useState(true);
  const [showEventMarkers, setShowEventMarkers] = useState(false);

  const formatMarkerPrice = (value: number) =>
    value >= 1000
      ? value.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

  const formatShareValue = (value?: number | null) => {
    if (value === undefined || value === null) {
      return '0';
    }

    const isWholeNumber = Number.isInteger(value);
    return value.toLocaleString(undefined, isWholeNumber
      ? {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }
      : {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      });
  };

  useEffect(() => {
    if (selectedStock) {
      loadStockDetail(selectedStock);
    }

    return () => {
      clearStockDetail();
    };
  }, [selectedStock, loadStockDetail, clearStockDetail]);

  const currencySymbol = stockData ? CURRENCY_SYMBOLS[stockData.currency as CurrencyType] || '$' : '$';

  // Transaction columns using TanStack Table
  const transactionColumnHelper = createColumnHelper<TransactionEvent>();
  const transactionColumns = useMemo(() => [
    transactionColumnHelper.accessor('date', {
      header: 'Date',
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
    transactionColumnHelper.accessor('type', {
      header: 'Type',
      cell: (info) => {
        const type = info.getValue();
        return (
          <span style={{
            color: type === 'buy' ? '#16a34a' : type === 'sell' ? '#dc2626' : type === 'dividend' ? '#2563eb' : '#f59e0b',
            fontWeight: 500,
          }}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        );
      },
      enableSorting: true,
    }),
    transactionColumnHelper.accessor('quantity', {
      header: 'Quantity',
      cell: (info) => privacyMode ? '***' : formatShareValue(info.getValue()),
      enableSorting: true,
      meta: { cellStyle: { textAlign: 'right' } },
    }),
    transactionColumnHelper.accessor('price', {
      header: 'Price',
      cell: (info) => privacyMode ? '***' : `${currencySymbol}${info.getValue().toFixed(2)}`,
      enableSorting: true,
      meta: { cellStyle: { textAlign: 'right' } },
    }),
    transactionColumnHelper.accessor('amount', {
      header: 'Amount',
      cell: (info) => privacyMode ? '***' : `${currencySymbol}${info.getValue().toFixed(2)}`,
      enableSorting: true,
      meta: { cellStyle: { textAlign: 'right' } },
    }),
    transactionColumnHelper.accessor('sharesAfter', {
      header: 'Shares After',
      cell: (info) => privacyMode ? '***' : formatShareValue(info.getValue()),
      enableSorting: true,
      meta: { cellStyle: { textAlign: 'right' } },
    }),
  ], [currencySymbol, privacyMode]);

  // Dividend summary table columns using TanStack Table
  const dividendColumnHelper = createColumnHelper<{ period: string; count: number; total: number }>();
  const dividendTableColumns = useMemo(() => [
    dividendColumnHelper.accessor('period', {
      header: 'Period',
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
    dividendColumnHelper.accessor('count', {
      header: 'Count',
      cell: (info) => info.getValue().toString(),
      enableSorting: true,
      meta: { cellStyle: { textAlign: 'center' } },
    }),
    dividendColumnHelper.accessor('total', {
      header: 'Amount',
      cell: (info) => privacyMode ? '***' : `${currencySymbol}${info.getValue().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      enableSorting: true,
      meta: { cellStyle: { textAlign: 'right' } },
    }),
  ], [currencySymbol, privacyMode]);

  const viewRangeStartDate = useMemo(() => {
    if (!chartData.length) return null;
    if (chartTimeRange === 'ALL') return null;

    const endDate = new Date(chartData[chartData.length - 1].date);
    const startDate = new Date(endDate);

    switch (chartTimeRange) {
      case '1W':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'MTD':
        startDate.setDate(1);
        break;
      case '1M':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case 'YTD':
        startDate.setMonth(0);
        startDate.setDate(1);
        break;
      case '1Y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case '5Y':
        startDate.setFullYear(startDate.getFullYear() - 5);
        break;
      default:
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    const earliestDate = new Date(chartData[0].date);
    if (startDate < earliestDate) {
      return earliestDate;
    }

    return startDate;
  }, [chartData, chartTimeRange]);

  const rangePerformance = useMemo(() => {
    if (!viewRangeStartDate || !navChartData.length) return null;

    // Find closest data point to viewRangeStartDate
    const startTimestamp = viewRangeStartDate.getTime();
    // Assuming data is sorted, find first point after or at start date
    const startNode = navChartData.find(d => new Date(d.date).getTime() >= startTimestamp);
    const endNode = navChartData[navChartData.length - 1];

    if (!startNode || !endNode) return null;

    // Calculate Net Flow (Buys - Sells) during the period
    const relevantTransactions = transactionEvents.filter(t => new Date(t.date).getTime() >= startTimestamp);

    let netFlow = 0;
    let totalInvested = 0;

    relevantTransactions.forEach(t => {
      if (t.type === 'buy') {
        netFlow += t.amount;
        totalInvested += t.amount;
      } else if (t.type === 'sell') {
        netFlow -= t.amount;
      }
    });

    const startValue = startNode.close;
    const endValue = endNode.close;

    // Profit = (End Value - Start Value) - (Net Money Invested)
    const change = (endValue - startValue) - netFlow;

    // ROI Denominator: Start Value + New Capital Invested
    const basis = startValue + totalInvested;
    const percentChange = basis !== 0 ? (change / basis) * 100 : 0;

    return {
      change,
      percentChange,
      isPositive: change >= 0
    };
  }, [viewRangeStartDate, navChartData, transactionEvents]);

  const timeRangeLabel = useMemo(() => {
    switch (chartTimeRange) {
      case '1W': return 'in the past week';
      case 'MTD': return 'in this month';
      case '1M': return 'in the past month';
      case '3M': return 'in the past 3 months';
      case '6M': return 'in the past 6 months';
      case 'YTD': return 'year to date';
      case '1Y': return 'in the past year';
      case '5Y': return 'in the past 5 years';
      case 'ALL': return 'all time';
      default: return '';
    }
  }, [chartTimeRange]);

  // Prepare metrics data for MetricCard components
  const portfolioOverviewMetrics = useMemo(() => {
    if (!stockData || !metrics) return [];

    return [
      {
        label: 'Current Price',
        value: privacyMode ? '***' : `${currencySymbol}${stockData.position.currentPrice?.toFixed(2) || 'N/A'}`,
        helpText: 'Current market price per share',
      },
      {
        label: 'Shares',
        value: privacyMode ? '***' : stockData.position.shares.toString(),
        helpText: 'Total number of shares held',
      },
      {
        label: 'Average Cost',
        value: privacyMode ? '***' : `${currencySymbol}${stockData.position.averageCost.toFixed(2)}`,
        helpText: 'Average cost per share',
      },
      {
        label: 'Holding Period',
        value: `${metrics.holdingPeriodDays} days`,
        helpText: 'Number of days since first purchase',
      },
    ];
  }, [stockData, currencySymbol, metrics, privacyMode]);

  const performanceMetrics = useMemo(() => {
    if (!metrics) return [];

    return [
      {
        label: 'Annualized Return',
        value: `${metrics.annualizedReturn.toFixed(2)}%`,
        valueColor: metrics.annualizedReturn >= 0 ? '#10b981' : '#ef4444',
        helpText: 'Compound Annual Growth Rate of the investment based on holding period',
      },
      {
        label: 'Max Drawdown (5Y)',
        value: privacyMode ? (
          <>{metrics.maxDrawdownPercent.toFixed(2)}%</>
        ) : (
          <>
            {metrics.maxDrawdownPercent.toFixed(2)}%
            <span style={{ fontSize: '0.85rem', opacity: 0.7, marginLeft: '6px', fontWeight: 500 }}>
              ({currencySymbol}{metrics.maxDrawdown.toFixed(2)})
            </span>
          </>
        ),
        valueColor: '#ef4444',
        helpText: 'Maximum observed loss from a peak to a trough within the last 5 years',
      },
      {
        label: 'Volatility (5Y)',
        value: `${metrics.priceVolatility.toFixed(2)}%`,
        helpText: 'Annualized standard deviation of daily returns over the last 5 years',
      },
      {
        label: 'Best Day Gain (5Y)',
        value: privacyMode ? (
          <>
            ***
            {metrics.bestDayGainDate && (
              <span style={{ fontSize: '0.85rem', opacity: 0.7, marginLeft: '6px', color: '#64748b', fontWeight: 500 }}>
                ({metrics.bestDayGainDate})
              </span>
            )}
          </>
        ) : (
          <>
            +{currencySymbol}{metrics.bestDayGain.toFixed(2)}
            {metrics.bestDayGainDate && (
              <span style={{ fontSize: '0.85rem', opacity: 0.7, marginLeft: '6px', color: '#64748b', fontWeight: 500 }}>
                ({metrics.bestDayGainDate})
              </span>
            )}
          </>
        ),
        valueColor: '#10b981',
        helpText: 'Largest single-day gain within the last 5 years',
      },
      {
        label: 'Worst Day Loss (5Y)',
        value: privacyMode ? (
          <>
            ***
            {metrics.worstDayLossDate && (
              <span style={{ fontSize: '0.85rem', opacity: 0.7, marginLeft: '6px', color: '#64748b', fontWeight: 500 }}>
                ({metrics.worstDayLossDate})
              </span>
            )}
          </>
        ) : (
          <>
            {currencySymbol}{metrics.worstDayLoss.toFixed(2)}
            {metrics.worstDayLossDate && (
              <span style={{ fontSize: '0.85rem', opacity: 0.7, marginLeft: '6px', color: '#64748b', fontWeight: 500 }}>
                ({metrics.worstDayLossDate})
              </span>
            )}
          </>
        ),
        valueColor: '#ef4444',
        helpText: 'Largest single-day loss within the last 5 years',
      },
    ];
  }, [metrics, currencySymbol, privacyMode]);

  const marketDataMetrics = useMemo(() => {
    if (!metrics) return [];

    const baseMetrics = [];

    if (yahooMeta) {
      baseMetrics.push(
        {
          label: 'Market Price',
          value: privacyMode ? '***' : `${currencySymbol}${yahooMeta.regularMarketPrice?.toFixed(2) || 'N/A'}`,
          helpText: 'Regular market price from Yahoo Finance',
        },
        {
          label: 'Day Range',
          value: privacyMode ? '***' : `${currencySymbol}${yahooMeta.regularMarketDayLow?.toFixed(2)} - ${currencySymbol}${yahooMeta.regularMarketDayHigh?.toFixed(2)}`,
          helpText: 'Lowest and Highest price of the current trading day',
        },
        {
          label: '52 Week Range',
          value: privacyMode ? '***' : `${currencySymbol}${yahooMeta.fiftyTwoWeekLow?.toFixed(2)} - ${currencySymbol}${yahooMeta.fiftyTwoWeekHigh?.toFixed(2)}`,
          helpText: 'Lowest and Highest price over the last 52 weeks',
        }
      );
    }

    baseMetrics.push(
      {
        label: 'Highest Price',
        value: privacyMode ? '***' : `${currencySymbol}${metrics.highestPrice.toFixed(2)}`,
        helpText: 'Highest historical price observed in your data',
      },
      {
        label: 'Lowest Price',
        value: privacyMode ? '***' : `${currencySymbol}${metrics.lowestPrice.toFixed(2)}`,
        helpText: 'Lowest historical price observed in your data',
      }
    );

    if (yahooMeta) {
      baseMetrics.push({
        label: 'Volume',
        value: yahooMeta.regularMarketVolume?.toLocaleString() || 'N/A',
        helpText: 'Volume of shares traded',
      });
    }

    return baseMetrics;
  }, [yahooMeta, metrics, currencySymbol, privacyMode]);

  const dividendMetrics = useMemo(() => {
    if (!dividendSummary || dividendSummary.dividendCount === 0) return [];

    return [
      {
        label: 'Total Dividends',
        value: privacyMode ? (
          <>
            ***
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginTop: '4px' }}>
              {dividendSummary.dividendCount} payouts
            </div>
          </>
        ) : (
          <>
            {currencySymbol}{dividendSummary.totalDividends.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginTop: '4px' }}>
              {dividendSummary.dividendCount} payouts
            </div>
          </>
        ),
        helpText: 'Sum of all dividend payouts received. Formula: Σ (Dividend Per Share × Shares Owned)',
      },
      {
        label: 'Annual Yield',
        value: (
          <>
            {dividendSummary.annualYield ? `${dividendSummary.annualYield.toFixed(2)}%` : '—'}
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginTop: '4px' }}>
              Last: {dividendSummary.lastDividendDate || 'N/A'}
            </div>
          </>
        ),
        helpText: 'Current annual dividend yield based on trailing 12-month payouts relative to current market price. Formula: (TTM Dividends / Current Price) × 100',
      },
      {
        label: 'Average Payout',
        value: privacyMode ? '***' : `${currencySymbol}${dividendSummary.averageDividend.toFixed(2)}`,
        helpText: 'Average amount received per dividend distribution. Formula: Total Dividends / Count of Distributions',
      },
    ];
  }, [dividendSummary, currencySymbol, privacyMode]); const markerDetails = useMemo(() => {
    if (!chartData.length) return new Map<UTCTimestamp, TransactionEvent>();
    const map = new Map<UTCTimestamp, TransactionEvent>();

    transactionEvents.forEach(event => {
      const time = toTimestamp(event.date);
      map.set(time, event);
    });

    return map;
  }, [transactionEvents, chartData]);

  const chartMarkers = useMemo<SeriesMarker<UTCTimestamp>[]>(() => {
    if (!chartData.length) return [];

    const markers = transactionEvents.reduce<SeriesMarker<UTCTimestamp>[]>((markers, event) => {
      const markerConfig = EVENT_VISUALS[event.type];
      const label =
        event.type === 'buy' || event.type === 'sell'
          ? `${event.type === 'buy' ? 'Buy' : 'Sell'} @ ${formatMarkerPrice(event.price)}`
          : markerConfig.abbreviated;

      markers.push({
        time: toTimestamp(event.date),
        color: markerConfig.color,
        shape: markerConfig.shape,
        position: markerConfig.position,
        text: label,
        price: event.price,
      });

      return markers;
    }, []);

    return markers;
  }, [transactionEvents, markerDetails]);

  const navSeriesData = useMemo(() => {
    return navChartData.map(point => ({
      time: toTimestamp(point.date),
      value: point.close,
    }));
  }, [navChartData]);

  const volumeSeriesData = useMemo(() => {
    let previousClose: number | null = null;
    return chartData.map(point => {
      const value = point.volume ?? 0;
      const color =
        previousClose !== null && point.close < previousClose ? '#ef4444' : '#22c55e';
      previousClose = point.close;
      return {
        time: toTimestamp(point.date),
        value,
        color,
      };
    });
  }, [chartData]);

  const positionSeriesData = useMemo(() => {
    return chartData
      .filter(point => (point.shares ?? 0) > 0)
      .map(point => ({
        time: toTimestamp(point.date),
        value: point.shares ?? 0,
      }));
  }, [chartData]);

  useEffect(() => {
    if (loading) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
        priceSeriesRef.current = null;
      }
      return;
    }

    const container = chartContainerRef.current;
    if (!container) return;

    // Clean up existing chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
      priceSeriesRef.current = null;
      navSeriesRef.current = null;
      volumeSeriesRef.current = null;
      positionSeriesRef.current = null;
    }

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#475569',
      },
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
      },
      timeScale: {
        borderColor: '#e2e8f0',
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: {
        mode: 0,
      },
    });

    // v5 API - use addSeries with series type
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#667eea',
      lineWidth: 2,
      topColor: 'rgba(102, 126, 234, 0.4)',
      bottomColor: 'rgba(102, 126, 234, 0.05)',
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    const navSeries = chart.addSeries(LineSeries, {
      color: '#10b981',
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      priceScaleId: 'left',
      visible: showNavSeries,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#a5b4fc',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      priceLineVisible: false,
      lastValueVisible: false,
      base: 0,
      visible: true,
    });

    const positionSeries = chart.addSeries(LineSeries, {
      color: '#0ea5e9',
      lineWidth: 2,
      priceScaleId: 'shares',
      priceFormat: {
        type: 'volume',
        minMove: 0.0001,
        precision: 4,
      },
      lastValueVisible: false,
      visible: showPositionSeries,
    });

    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chart.priceScale('left').applyOptions({
      visible: showNavSeries,
      borderVisible: true,
      alignLabels: true,
      borderColor: '#e2e8f0',
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    });

    chart.priceScale('shares').applyOptions({
      visible: false,   // Hide axis labels for shares to prioritize NAV visibility
      borderVisible: false,
      scaleMargins: {
        top: 0.2,
        bottom: 0.2,
      },
    });

    chart.resize(container.clientWidth, container.clientHeight);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(entries => {
          const { width, height } = entries[0].contentRect;
          chart.resize(width, height);
        })
        : null;

    if (resizeObserver) {
      resizeObserver.observe(container);
      chartInstanceRef.current = chart;
      priceSeriesRef.current = areaSeries;
      navSeriesRef.current = navSeries;
      volumeSeriesRef.current = volumeSeries;
      positionSeriesRef.current = positionSeries;
    } else {
      const handleResize = () => {
        chart.resize(container.clientWidth, container.clientHeight);
      };
      window.addEventListener('resize', handleResize);
      chartInstanceRef.current = chart;
      priceSeriesRef.current = areaSeries;
      navSeriesRef.current = navSeries;
      volumeSeriesRef.current = volumeSeries;
      positionSeriesRef.current = positionSeries;
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
        chartInstanceRef.current = null;
        priceSeriesRef.current = null;
        navSeriesRef.current = null;
        volumeSeriesRef.current = null;
        positionSeriesRef.current = null;
      };
    }

    return () => {
      resizeObserver?.disconnect();
      chart.remove();
      chartInstanceRef.current = null;
      priceSeriesRef.current = null;
      navSeriesRef.current = null;
      volumeSeriesRef.current = null;
      positionSeriesRef.current = null;
    };
  }, [loading]); // NOTE: We are NOT adding toggle states here to avoid re-creation. Initial state is captured.

  useEffect(() => {
    if (!priceSeriesRef.current || !volumeSeriesRef.current || !positionSeriesRef.current || !navSeriesRef.current) return;

    const seriesData = chartData.map(point => ({
      time: toTimestamp(point.date),
      value: point.close,
    }));

    priceSeriesRef.current.setData(seriesData);
    navSeriesRef.current.setData(navSeriesData);
    volumeSeriesRef.current.setData(volumeSeriesData);
    positionSeriesRef.current.setData(positionSeriesData);

    if (seriesData.length > 0) {
      chartInstanceRef.current?.timeScale().fitContent();
    }
  }, [chartData, volumeSeriesData, positionSeriesData, navSeriesData]);

  useEffect(() => {
    if (!priceSeriesRef.current) return;
    if (typeof (priceSeriesRef.current as any).setMarkers === 'function') {
      (priceSeriesRef.current as any).setMarkers(chartMarkers);
    }
  }, [chartMarkers]);

  useEffect(() => {
    if (!chartInstanceRef.current || chartData.length === 0) return;

    if (chartTimeRange === 'ALL' || !viewRangeStartDate) {
      chartInstanceRef.current.timeScale().fitContent();
      return;
    }

    const endTime = toTimestamp(chartData[chartData.length - 1].date);
    const startTime = Math.floor(viewRangeStartDate.getTime() / 1000) as UTCTimestamp;

    chartInstanceRef.current.timeScale().setVisibleRange({
      from: startTime,
      to: endTime,
    });
  }, [chartTimeRange, chartData, viewRangeStartDate]);

  useEffect(() => {
    if (!positionSeriesRef.current || !chartInstanceRef.current) return;
    positionSeriesRef.current.applyOptions({ visible: showPositionSeries });
    chartInstanceRef.current.priceScale('shares').applyOptions({
      visible: showPositionSeries,
      borderVisible: showPositionSeries,
      alignLabels: true,
    });
  }, [showPositionSeries]);

  useEffect(() => {
    if (!navSeriesRef.current || !chartInstanceRef.current) return;

    // Toggle Series Visibility
    navSeriesRef.current.applyOptions({ visible: showNavSeries });

    // Toggle Price Scale Visibility
    chartInstanceRef.current.priceScale('left').applyOptions({
      visible: showNavSeries,
      borderVisible: showNavSeries,
    });
  }, [showNavSeries]);

  useEffect(() => {
    if (!chartInstanceRef.current) return;

    const chart = chartInstanceRef.current;

    const handleMove = (param: any) => {
      if (!param || !param.time || !param.point) {
        setMarkerTooltipState(prev =>
          prev.visible ? { ...prev, visible: false } : prev
        );
        return;
      }

      const event = markerDetails.get(param.time as UTCTimestamp);
      const priceData = param.seriesData?.get(priceSeriesRef.current!) as { value: number; time: UTCTimestamp } | undefined;
      const navData = param.seriesData?.get(navSeriesRef.current!) as { value: number; time: UTCTimestamp } | undefined;
      const positionData = param.seriesData?.get(positionSeriesRef.current!) as { value: number; time: UTCTimestamp } | undefined;

      // Always show all data in tooltip, even if series are hidden
      const effectiveNavData = navData;
      const effectivePositionData = positionData;

      if (!event && !priceData && !effectiveNavData && !effectivePositionData) {
        setMarkerTooltipState(prev =>
          prev.visible ? { ...prev, visible: false } : prev
        );
        return;
      }

      const formatCurrencyValue = (value: number) =>
        `${currencySymbol}${value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

      const formatSharesValue = (value: number) =>
        value.toLocaleString(undefined, { maximumFractionDigits: 0 });

      const content = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ fontWeight: 600 }}>{new Date((param.time as number) * 1000).toLocaleDateString()}</div>
          {priceData && (
            <div>Price: <span style={{ color: '#667eea', fontWeight: 600 }}>{formatCurrencyValue(priceData.value)}</span></div>
          )}
          {effectiveNavData && (
            <div>NAV: <span style={{ color: '#10b981', fontWeight: 600 }}>{formatCurrencyValue(effectiveNavData.value)}</span></div>
          )}
          {effectivePositionData && (
            <div>Position: <span style={{ color: '#0ea5e9', fontWeight: 600 }}>{formatSharesValue(effectivePositionData.value)} shares</span></div>
          )}
          {event && (
            <div style={{ marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              {event.type === 'buy' ? 'Buy' : 'Sell'} • Price {formatCurrencyValue(event.price)} • Amount {formatCurrencyValue(event.amount)}
            </div>
          )}
        </div>
      );

      setMarkerTooltipState({
        visible: true,
        x: param.point.x,
        y: param.point.y,
        top: param.point.y,
        content,
      });
    };

    chart.subscribeCrosshairMove(handleMove as any);

    return () => {
      chart.unsubscribeCrosshairMove(handleMove as any);
    };
  }, [markerDetails, currencySymbol, showNavSeries]);



  if (loading) {
    return (
      <Container>
        <LoadingContainer>Loading stock details...</LoadingContainer>
      </Container>
    );
  }

  if (error || !stockData || !metrics) {
    return (
      <Container>
        <BackButton onClick={goBackToPortfolio}>
          <ArrowLeft size={18} />
          Back to Portfolio
        </BackButton>
        <ErrorContainer>{error || 'Stock data not found'}</ErrorContainer>
      </Container>
    );
  }

  const isPositive = (metrics.totalReturn || 0) >= 0;

  return (
    <Container>
      <BackButton onClick={goBackToPortfolio}>
        <ArrowLeft size={18} />
        Back to Portfolio
      </BackButton>

      <Header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <StockTitle>{yahooMeta?.longName || stockData.symbol}</StockTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <StockSubtitle>{stockData.symbol}</StockSubtitle>
              <span style={{ color: '#94a3b8' }}>•</span>
              <StockSubtitle>{stockData.currency} • {stockData.position.shares} shares</StockSubtitle>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <PageHeaderControls />
          </div>
        </div>
      </Header>

      <TopSummary>
        <BigMetricBox>
          <BigMetricLabel>Current Value</BigMetricLabel>
          <BigMetricValue>
            {privacyMode ? '***' : `${currencySymbol}${stockData.position.currentValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A'}`}
          </BigMetricValue>
        </BigMetricBox>

        <BigMetricBox $align="right">
          <BigMetricLabel>Total Return</BigMetricLabel>
          <BigMetricValue $color={isPositive ? '#10b981' : '#ef4444'}>
            {privacyMode ? '***' : `+${currencySymbol}${metrics.totalReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            <BigMetricSubValue $positive={isPositive}>
              {privacyMode ? '' : `(${isPositive ? '+' : ''}${metrics.totalReturnPercent.toFixed(2)}%)`}
            </BigMetricSubValue>
          </BigMetricValue>
        </BigMetricBox>
      </TopSummary>

      <MetricsContainer>
        {/* Column 1: Portfolio Overview */}
        <MetricCard title="Portfolio Overview" metrics={portfolioOverviewMetrics} />

        {/* Column 2: Performance Metrics */}
        <MetricCard title="Performance Metrics" metrics={performanceMetrics} />

        {/* Column 3: Market Data */}
        <MetricCard title="Market Data" metrics={marketDataMetrics} />
      </MetricsContainer>

      <ChartSection>
        <ChartHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <ChartTitle>Price & NAV History</ChartTitle>
            {rangePerformance && (
              <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#64748b' }}>
                Total return {timeRangeLabel}:{' '}
                <span style={{
                  color: rangePerformance.isPositive ? '#10b981' : '#ef4444',
                  fontWeight: 600
                }}>
                  {rangePerformance.change >= 0 ? '+' : ''}{currencySymbol}{rangePerformance.change.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {' '}
                  ({rangePerformance.isPositive ? '+' : ''}{rangePerformance.percentChange.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
          <ChartControls>
            <TimeRangeSelector className="group">
              {(['1W', 'MTD', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL'] as const).map(range => (
                <TimeRangeButton
                  key={range}
                  $active={chartTimeRange === range}
                  onClick={() => setChartTimeRange(range)}
                >
                  {range}
                </TimeRangeButton>
              ))}
            </TimeRangeSelector>
            <ToggleButton
              type="button"
              $active={showNavSeries}
              onClick={() => setShowNavSeries(prev => !prev)}
            >
              NAV
            </ToggleButton>
            <ToggleButton
              type="button"
              $active={showPositionSeries}
              onClick={() => setShowPositionSeries(prev => !prev)}
            >
              Positions
            </ToggleButton>
            <ToggleButton
              type="button"
              $active={showEventMarkers}
              onClick={() => setShowEventMarkers(prev => !prev)}
            >
              Events
            </ToggleButton>
          </ChartControls>
        </ChartHeader>

        <ChartCanvas>
          <ChartCanvasInner ref={chartContainerRef} />
          {chartData.length === 0 && (
            <ChartEmptyState>No price history available.</ChartEmptyState>
          )}
          <MarkerTooltip
            style={{
              opacity: markerTooltipState.visible ? 1 : 0,
              left: Math.min(Math.max(0, markerTooltipState.x - 75), 1000), // Keep within bounds roughly
              top: markerTooltipState.top,
              zIndex: 10,
            }}
          >
            {markerTooltipState.content}
          </MarkerTooltip>
        </ChartCanvas>

        <ChartLegend>
          <LegendItem>
            <LegendColor $color="#667eea" />
            <span>Price</span>
          </LegendItem>
          {showNavSeries && (
            <LegendItem>
              <LegendColor $color="#10b981" />
              <span>NAV</span>
            </LegendItem>
          )}
          {showPositionSeries && (
            <LegendItem>
              <LegendColor $color="#0ea5e9" />
              <span>Positions</span>
            </LegendItem>
          )}
        </ChartLegend>
      </ChartSection>

      <Section>
        <SectionTitle>
          <DollarSign size={20} />
          Dividend Summary
        </SectionTitle>
        {dividendSummary && dividendSummary.dividendCount > 0 ? (
          <>
            {/* Visuals: Chart + History Table + Metrics */}
            <DividendVisualsContainer>
              {/* Chart Panel */}
              <DividendPanel>
                <DividendPanelHeader>
                  <span>Distribution History</span>
                  <DividendPeriodToggle>
                    <DividendPeriodButton
                      $active={dividendPeriodMode === 'year'}
                      onClick={() => setDividendPeriodMode('year')}
                    >
                      Yearly
                    </DividendPeriodButton>
                    <DividendPeriodButton
                      $active={dividendPeriodMode === 'quarter'}
                      onClick={() => setDividendPeriodMode('quarter')}
                    >
                      Quarterly
                    </DividendPeriodButton>
                  </DividendPeriodToggle>
                </DividendPanelHeader>
                <div style={{ padding: '16px' }}>
                  <DividendChart
                    data={dividendPeriodMode === 'year' ? dividendSummary.perYearTotals : dividendSummary.perQuarterTotals}
                    periodMode={dividendPeriodMode}
                    currencySymbol={currencySymbol}
                  />
                </div>
              </DividendPanel>

              {/* Table Panel */}
              <DividendPanel>
                <DividendPanelHeader>
                  <span>Summary Table</span>
                </DividendPanelHeader>
                <div style={{ padding: '1rem' }}>
                  <TanStackTable
                    data={dividendPeriodMode === 'year' ? dividendSummary.perYearTotals : dividendSummary.perQuarterTotals}
                    columns={dividendTableColumns}
                    initialSorting={[{ id: 'period', desc: true }]}
                    emptyMessage="No dividend data available"
                  />
                </div>
              </DividendPanel>

              {/* Metrics Panel */}
              <DividendPanel>
                <DividendPanelHeader>
                  <span>Dividend Metrics</span>
                </DividendPanelHeader>
                <div style={{ padding: '1rem' }}>
                  <MetricCard title="" metrics={dividendMetrics} />
                </div>
              </DividendPanel>
            </DividendVisualsContainer>
          </>
        ) : (
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No dividend transactions found</p>
        )}
      </Section>

      <Section>
        <SectionTitle>
          <Activity size={20} />
          Trade History
        </SectionTitle>
        <TanStackTable
          data={transactionEvents}
          columns={transactionColumns}
          initialSorting={[{ id: 'date', desc: true }]}
          emptyMessage="No trades found"
        />
      </Section>
    </Container>
  );
}
