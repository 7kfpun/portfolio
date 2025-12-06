import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useStockDetailStore } from '../store/stockDetailStore';
import { useNavigationStore } from '../store/navigationStore';
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
} from 'lightweight-charts';
import { AdvancedTable, Column } from '../components/AdvancedTable';
import { YahooMeta } from '../types/YahooMeta';
import { DividendChart } from '../components/DividendChart';
import { TransactionEvent } from '../types/StockDetail';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  TWD: 'NT$',
  JPY: '¥',
  HKD: 'HK$',
};

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

const CardHeader = styled.div`
  padding: 16px 20px;
  font-weight: 600;
  color: #0f172a;
  /* border-bottom: 1px solid #e2e8f0; Removed per request */
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MetricLabelContainer = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const HelpIconWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  cursor: help;
  
  &:hover {
    color: #64748b;
  }
`;

const MetricsTable = styled.table`
  width: 100%;
  height: 100%; /* Fill the grid cell height */
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-collapse: collapse;
  overflow: hidden;
  display: flex;       /* Use flex column to distribute rows */
  flex-direction: column;
`;

const MetricRow = styled.tr`
  border-bottom: 1px solid #e2e8f0;
  display: flex;       /* Table rows as flex containers */
  width: 100%; 
  justify-content: space-between;

  &:last-child {
    border-bottom: none;
    flex: 1;           /* Last item can fill remaining space if needed, or we just rely on padding */
  }

  &:hover {
    background: #f8fafc;
  }
`;

const MetricLabel = styled.td`
  padding: 0.875rem 1.25rem;
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
  /* width: 40%; Remove fixed width logic if using flex row */
  display: block;
`;

const MetricValue = styled.td<{ $color?: string }>`
  padding: 0.875rem 1.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.$color || '#0f172a'};
  text-align: right;
  display: block;
`;

const MetricValueWithChange = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
`;

const MetricChange = styled.span<{ $positive?: boolean }>`
  font-size: 0.875rem;
  color: ${props => props.$positive ? '#10b981' : '#ef4444'};
  font-weight: 500;
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

const DividendMetricCard = styled.div`
  background: white;
  padding: 1.25rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const DividendMetricTitle = styled.div`
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const DividendMetricValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
`;

const DividendMetricSub = styled.div`
  font-size: 0.85rem;
  color: #64748b;
`;

const DividendVisualsContainer = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
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

const DividendLayout = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
`;

const DividendTableContainer = styled.div`
  background: #f8fafc;
  border-radius: 14px;
  padding: 1.25rem 1.5rem;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.18);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
`;

const DividendDistributionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const DividendScrollArea = styled.div`
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
`;

const DividendScrollInner = styled.div`
  max-height: 260px;
  overflow-y: auto;
  background: white;
`;

const DividendTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const DividendRow = styled.tr`
  border-bottom: 1px solid #e2e8f0;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #eef2ff;
  }
`;

const DividendCell = styled.td`
  padding: 0.9rem 1rem;
  color: #475569;
  font-size: 0.9rem;

  &:first-child {
    font-weight: 600;
    color: #0f172a;
  }
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

  const navSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
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

  const currencySymbol = stockData ? CURRENCY_SYMBOLS[stockData.currency] || '$' : '$';

  const transactionColumns = useMemo<Column<TransactionEvent>[]>(() => [
    {
      key: 'date',
      header: 'Date',
      accessor: (row) => row.date,
      width: 120,
    },
    {
      key: 'type',
      header: 'Type',
      accessor: (row) => (
        <span style={{
          color: row.type === 'buy' ? '#16a34a' : row.type === 'sell' ? '#dc2626' : row.type === 'dividend' ? '#2563eb' : '#f59e0b',
          fontWeight: 500,
        }}>
          {row.type.charAt(0).toUpperCase() + row.type.slice(1)}
        </span>
      ),
      width: 100,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      accessor: (row) => formatShareValue(row.quantity),
      align: 'right',
      width: 100,
    },
    {
      key: 'price',
      header: 'Price',
      accessor: (row) => `${currencySymbol}${row.price.toFixed(2)}`,
      align: 'right',
      width: 120,
    },
    {
      key: 'amount',
      header: 'Amount',
      accessor: (row) => `${currencySymbol}${row.amount.toFixed(2)}`,
      align: 'right',
      width: 120,
    },
    {
      key: 'sharesAfter',
      header: 'Shares After',
      accessor: (row) => formatShareValue(row.sharesAfter),
      align: 'right',
      width: 120,
    },
  ], [currencySymbol]);

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
      case 'ALL': return 'all time';
      default: return '';
    }
  }, [chartTimeRange]);

  const markerDetails = useMemo(() => {
    if (!chartData.length || !showEventMarkers) return new Map<UTCTimestamp, TransactionEvent>();
    const map = new Map<UTCTimestamp, TransactionEvent>();

    transactionEvents.forEach(event => {
      const time = toTimestamp(event.date);
      map.set(time, event);
    });

    return map;
  }, [transactionEvents, chartData, showEventMarkers]);

  const chartMarkers = useMemo<SeriesMarker<UTCTimestamp>[]>(() => {
    if (!chartData.length) return [];

    if (!showEventMarkers) return [];

    return transactionEvents.reduce<SeriesMarker<UTCTimestamp>[]>((markers, event) => {
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
  }, [transactionEvents, markerDetails, showEventMarkers]);

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
    return chartData.map(point => ({
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
      },
      crosshair: {
        mode: 0,
      },
    });

    const areaSeries = (chart as any).addAreaSeries({
      lineColor: '#667eea',
      lineWidth: 2,
      topColor: 'rgba(102, 126, 234, 0.4)',
      bottomColor: 'rgba(102, 126, 234, 0.05)',
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    const navSeries = (chart as any).addLineSeries({
      color: '#10b981',
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      priceScaleId: 'left',
      visible: showNavSeries,
    });

    const volumeSeries = (chart as any).addHistogramSeries({
      color: '#a5b4fc',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      priceLineVisible: false,
      lastValueVisible: false,
      base: 0,
      visible: true,
    });

    const positionSeries = (chart as any).addLineSeries({
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
      (priceSeriesRef.current as any).setMarkers(showEventMarkers ? chartMarkers : []);
    }
  }, [chartMarkers, showEventMarkers]);

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

      // Only show tooltip if there is something relevant to show
      // If NAV is hidden, treat navData as absent for tooltip purposes
      const effectiveNavData = showNavSeries ? navData : undefined;
      const effectivePositionData = showPositionSeries ? positionData : undefined;

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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <StockTitle>{yahooMeta?.longName || stockData.symbol}</StockTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <StockSubtitle>{stockData.symbol}</StockSubtitle>
            <span style={{ color: '#94a3b8' }}>•</span>
            <StockSubtitle>{stockData.currency} • {stockData.position.shares} shares</StockSubtitle>
          </div>
        </div>
      </Header>

      <TopSummary>
        <BigMetricBox>
          <BigMetricLabel>Current Value</BigMetricLabel>
          <BigMetricValue>
            {currencySymbol}{stockData.position.currentValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A'}
          </BigMetricValue>
        </BigMetricBox>

        <BigMetricBox $align="right">
          <BigMetricLabel>Total Return</BigMetricLabel>
          <BigMetricValue $color={isPositive ? '#10b981' : '#ef4444'}>
            +{currencySymbol}{metrics.totalReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <BigMetricSubValue $positive={isPositive}>
              ({isPositive ? '+' : ''}{metrics.totalReturnPercent.toFixed(2)}%)
            </BigMetricSubValue>
          </BigMetricValue>
        </BigMetricBox>
      </TopSummary>

      <MetricsContainer>
        {/* Column 1: Portfolio Overview */}
        <MetricsTable>
          <thead>
            <tr>
              <th colSpan={2} style={{ width: '100%', display: 'block' }}>
                <CardHeader>Portfolio Overview</CardHeader>
              </th>
            </tr>
          </thead>
          <tbody style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <MetricRow>
              <MetricLabel>
                <MetricLabelContainer>
                  Current Price
                  <HelpIconWrapper title="Current market price per share">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </HelpIconWrapper>
                </MetricLabelContainer>
              </MetricLabel>
              <MetricValue>{currencySymbol}{stockData.position.currentPrice?.toFixed(2) || 'N/A'}</MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>
                <MetricLabelContainer>
                  Shares
                  <HelpIconWrapper title="Total number of shares held">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </HelpIconWrapper>
                </MetricLabelContainer>
              </MetricLabel>
              <MetricValue>{stockData.position.shares}</MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>
                <MetricLabelContainer>
                  Average Cost
                  <HelpIconWrapper title="Average cost per share">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </HelpIconWrapper>
                </MetricLabelContainer>
              </MetricLabel>
              <MetricValue>{currencySymbol}{stockData.position.averageCost.toFixed(2)}</MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>
                <MetricLabelContainer>
                  Holding Period
                  <HelpIconWrapper title="Number of days since first purchase">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </HelpIconWrapper>
                </MetricLabelContainer>
              </MetricLabel>
              <MetricValue>{metrics.holdingPeriodDays} days</MetricValue>
            </MetricRow>
            <MetricRow style={{ flex: 1, borderBottom: 'none', minHeight: '1px' }} />
          </tbody>
        </MetricsTable>

        {/* Column 2: Performance Metrics */}
        <MetricsTable>
          <thead>
            <tr>
              <th colSpan={2} style={{ width: '100%', display: 'block' }}>
                <CardHeader>Performance Metrics</CardHeader>
              </th>
            </tr>
          </thead>
          <tbody style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <MetricRow>
              <MetricLabel>
                <MetricLabelContainer>
                  Annualized Return
                  <HelpIconWrapper title="Compound Annual Growth Rate of the investment based on holding period">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </HelpIconWrapper>
                </MetricLabelContainer>
              </MetricLabel>
              <MetricValue $color={metrics.annualizedReturn >= 0 ? '#10b981' : '#ef4444'}>
                {metrics.annualizedReturn.toFixed(2)}%
              </MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>
                <MetricLabelContainer>
                  Max Drawdown (5Y)
                  <HelpIconWrapper title="Maximum observed loss from a peak to a trough within the last 5 years">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </HelpIconWrapper>
                </MetricLabelContainer>
              </MetricLabel>
              <MetricValue $color="#ef4444">
                {metrics.maxDrawdownPercent.toFixed(2)}%
                <span style={{ fontSize: '0.85rem', opacity: 0.7, marginLeft: '6px', fontWeight: 500 }}>
                  ({currencySymbol}{metrics.maxDrawdown.toFixed(2)})
                </span>
              </MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>
                <MetricLabelContainer>
                  Volatility (5Y)
                  <HelpIconWrapper title="Annualized standard deviation of daily returns over the last 5 years">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </HelpIconWrapper>
                </MetricLabelContainer>
              </MetricLabel>
              <MetricValue>{metrics.priceVolatility.toFixed(2)}%</MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>
                <MetricLabelContainer>
                  Best Day Gain (5Y)
                  <HelpIconWrapper title="Largest single-day gain within the last 5 years">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </HelpIconWrapper>
                </MetricLabelContainer>
              </MetricLabel>
              <MetricValue $color="#10b981">
                +{currencySymbol}{metrics.bestDayGain.toFixed(2)}
                {metrics.bestDayGainDate && (
                  <span style={{ fontSize: '0.85rem', opacity: 0.7, marginLeft: '6px', color: '#64748b', fontWeight: 500 }}>
                    ({metrics.bestDayGainDate})
                  </span>
                )}
              </MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>
                <MetricLabelContainer>
                  Worst Day Loss (5Y)
                  <HelpIconWrapper title="Largest single-day loss within the last 5 years">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </HelpIconWrapper>
                </MetricLabelContainer>
              </MetricLabel>
              <MetricValue $color="#ef4444">
                {currencySymbol}{metrics.worstDayLoss.toFixed(2)}
                {metrics.worstDayLossDate && (
                  <span style={{ fontSize: '0.85rem', opacity: 0.7, marginLeft: '6px', color: '#64748b', fontWeight: 500 }}>
                    ({metrics.worstDayLossDate})
                  </span>
                )}
              </MetricValue>
            </MetricRow>
          </tbody>
        </MetricsTable>

        {/* Column 3: Market Data */}
        <MetricsTable>
          <thead>
            <tr>
              <th colSpan={2} style={{ width: '100%', display: 'block' }}>
                <CardHeader>Market Data</CardHeader>
              </th>
            </tr>
          </thead>
          <tbody style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {yahooMeta && (
              <>
                <MetricRow>
                  <MetricLabel>
                    <MetricLabelContainer>
                      Market Price
                      <HelpIconWrapper title="Regular market price from Yahoo Finance">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                      </HelpIconWrapper>
                    </MetricLabelContainer>
                  </MetricLabel>
                  <MetricValue>{currencySymbol}{yahooMeta.regularMarketPrice?.toFixed(2) || 'N/A'}</MetricValue>
                </MetricRow>
                <MetricRow>
                  <MetricLabel>
                    <MetricLabelContainer>
                      Day Range
                      <HelpIconWrapper title="Lowest and Highest price of the current trading day">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                      </HelpIconWrapper>
                    </MetricLabelContainer>
                  </MetricLabel>
                  <MetricValue>
                    {currencySymbol}{yahooMeta.regularMarketDayLow?.toFixed(2)} - {currencySymbol}{yahooMeta.regularMarketDayHigh?.toFixed(2)}
                  </MetricValue>
                </MetricRow>
                <MetricRow>
                  <MetricLabel>
                    <MetricLabelContainer>
                      52 Week Range
                      <HelpIconWrapper title="Lowest and Highest price over the last 52 weeks">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                      </HelpIconWrapper>
                    </MetricLabelContainer>
                  </MetricLabel>
                  <MetricValue>
                    {currencySymbol}{yahooMeta.fiftyTwoWeekLow?.toFixed(2)} - {currencySymbol}{yahooMeta.fiftyTwoWeekHigh?.toFixed(2)}
                  </MetricValue>
                </MetricRow>
              </>
            )}
            <MetricRow>
              <MetricLabel>
                <MetricLabelContainer>
                  Highest Price
                  <HelpIconWrapper title="Highest historical price observed in your data">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </HelpIconWrapper>
                </MetricLabelContainer>
              </MetricLabel>
              <MetricValue>{currencySymbol}{metrics.highestPrice.toFixed(2)}</MetricValue>
            </MetricRow>
            <MetricRow>
              <MetricLabel>
                <MetricLabelContainer>
                  Lowest Price
                  <HelpIconWrapper title="Lowest historical price observed in your data">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </HelpIconWrapper>
                </MetricLabelContainer>
              </MetricLabel>
              <MetricValue>{currencySymbol}{metrics.lowestPrice.toFixed(2)}</MetricValue>
            </MetricRow>
            {yahooMeta && (
              <MetricRow>
                <MetricLabel>
                  <MetricLabelContainer>
                    Volume
                    <HelpIconWrapper title="Volume of shares traded">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    </HelpIconWrapper>
                  </MetricLabelContainer>
                </MetricLabel>
                <MetricValue>{yahooMeta.regularMarketVolume?.toLocaleString()}</MetricValue>
              </MetricRow>
            )}
            {/* Filler row to push content up if needed, or let flex handle it */}
            <MetricRow style={{ flex: 1, borderBottom: 'none', minHeight: '1px' }} />
          </tbody>
        </MetricsTable>
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
              {(['1W', 'MTD', '1M', '3M', '6M', 'YTD', '1Y', 'ALL'] as const).map(range => (
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
            {/* 1. Dividend Metrics (3 Cols) */}
            <DividendMetricGrid>
              <DividendMetricCard>
                <DividendMetricTitle>
                  Total Dividends
                  <HelpIconWrapper title="Sum of all dividend payouts received. Formula: Σ (Dividend Per Share × Shares Owned)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </HelpIconWrapper>
                </DividendMetricTitle>
                <DividendMetricValue>
                  {currencySymbol}{dividendSummary.totalDividends.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </DividendMetricValue>
                <DividendMetricSub>
                  {dividendSummary.dividendCount} payouts
                </DividendMetricSub>
              </DividendMetricCard>

              <DividendMetricCard>
                <DividendMetricTitle>
                  Annual Yield
                  <HelpIconWrapper title="Current annual dividend yield based on trailing 12-month payouts relative to current market price. Formula: (TTM Dividends / Current Price) × 100">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </HelpIconWrapper>
                </DividendMetricTitle>
                <DividendMetricValue>
                  {dividendSummary.annualYield ? `${dividendSummary.annualYield.toFixed(2)}%` : '—'}
                </DividendMetricValue>
                <DividendMetricSub>
                  Last: {dividendSummary.lastDividendDate || 'N/A'}
                </DividendMetricSub>
              </DividendMetricCard>

              <DividendMetricCard>
                <DividendMetricTitle>
                  Average Payout
                  <HelpIconWrapper title="Average amount received per dividend distribution. Formula: Total Dividends / Count of Distributions">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </HelpIconWrapper>
                </DividendMetricTitle>
                <DividendMetricValue>
                  {currencySymbol}{dividendSummary.averageDividend.toFixed(2)}
                </DividendMetricValue>
              </DividendMetricCard>
            </DividendMetricGrid>

            {/* 2. Visuals: Chart + History Table */}
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
                <DividendScrollArea style={{ flex: 1 }}>
                  <DividendScrollInner>
                    <DividendTable>
                      <thead>
                        <DividendRow>
                          <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.85rem', color: '#64748b' }}>Period</th>
                          <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: '0.85rem', color: '#64748b' }}>Count</th>
                          <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '0.85rem', color: '#64748b' }}>Amount</th>
                        </DividendRow>
                      </thead>
                      <tbody>
                        {(dividendPeriodMode === 'year' ? dividendSummary.perYearTotals : dividendSummary.perQuarterTotals).map((item) => (
                          <DividendRow key={item.period}>
                            <DividendCell>{item.period}</DividendCell>
                            <DividendCell style={{ textAlign: 'center' }}>{item.count}</DividendCell>
                            <DividendCell style={{ textAlign: 'right' }}>{currencySymbol}{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</DividendCell>
                          </DividendRow>
                        ))}
                      </tbody>
                    </DividendTable>
                  </DividendScrollInner>
                </DividendScrollArea>
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
          Transaction History
        </SectionTitle>
        <AdvancedTable
          data={transactionEvents}
          columns={transactionColumns}
          defaultSortKey="date"
          defaultSortDirection="desc"
        />
      </Section>
    </Container>
  );
}
