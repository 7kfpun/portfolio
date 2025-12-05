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
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const MetricsTable = styled.table`
  width: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-collapse: collapse;
  overflow: hidden;
`;

const MetricRow = styled.tr`
  border-bottom: 1px solid #e2e8f0;

  &:last-child {
    border-bottom: none;
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
  width: 40%;
`;

const MetricValue = styled.td<{ $color?: string }>`
  padding: 0.875rem 1.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.$color || '#0f172a'};
  text-align: right;
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
  display: flex;
  gap: 0.5rem;
`;

const ChartControls = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const TimeRangeButton = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid ${props => props.$active ? '#667eea' : '#e2e8f0'};
  border-radius: 6px;
  background: ${props => props.$active ? '#667eea' : 'white'};
  color: ${props => props.$active ? 'white' : '#475569'};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 120ms ease;

  &:hover {
    border-color: #667eea;
    background: ${props => props.$active ? '#667eea' : '#f8fafc'};
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

  const navChartContainerRef = useRef<HTMLDivElement | null>(null);
  const navChartInstanceRef = useRef<ReturnType<typeof createChart> | null>(null);
  const navSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const [markerTooltipState, setMarkerTooltipState] = useState({
    visible: false,
    x: 0,
    y: 0,
    content: '',
  });
  const toTimestamp = (date: string): UTCTimestamp =>
    (Math.floor(new Date(date).getTime() / 1000) as UTCTimestamp);
  const [dividendPeriodMode, setDividendPeriodMode] = useState<'year' | 'quarter'>('year');
  const [showPositionSeries, setShowPositionSeries] = useState(true);
  const [showEventMarkers, setShowEventMarkers] = useState(true);

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
      case '1M':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(startDate.getMonth() - 6);
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
      });

      return markers;
    }, []);
  }, [transactionEvents, markerDetails, showEventMarkers]);

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

    const areaSeries = chart.addAreaSeries({
      lineColor: '#667eea',
      lineWidth: 2,
      topColor: 'rgba(102, 126, 234, 0.4)',
      bottomColor: 'rgba(102, 126, 234, 0.05)',
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#a5b4fc',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      priceLineVisible: false,
      lastValueVisible: false,
      base: 0,
    });

    const positionSeries = chart.addLineSeries({
      color: '#0ea5e9',
      lineWidth: 1.5,
      priceScaleId: 'shares',
      priceFormat: {
        type: 'volume',
        minMove: 0.0001,
        precision: 4,
      },
      lastValueVisible: false,
    });

    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chart.priceScale('shares').applyOptions({
      position: 'left',
      visible: true,
      borderVisible: true,
      alignLabels: true,
      borderColor: '#e2e8f0',
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
    } else {
      const handleResize = () => {
        chart.resize(container.clientWidth, container.clientHeight);
      };
      window.addEventListener('resize', handleResize);
      chartInstanceRef.current = chart;
      priceSeriesRef.current = areaSeries;
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
        chartInstanceRef.current = null;
        priceSeriesRef.current = null;
        volumeSeriesRef.current = null;
        positionSeriesRef.current = null;
      };
    }

    chartInstanceRef.current = chart;
    priceSeriesRef.current = areaSeries;
    volumeSeriesRef.current = volumeSeries;
    positionSeriesRef.current = positionSeries;

    return () => {
      resizeObserver?.disconnect();
      chart.remove();
      chartInstanceRef.current = null;
      priceSeriesRef.current = null;
      volumeSeriesRef.current = null;
      positionSeriesRef.current = null;
    };
  }, [loading]);

  useEffect(() => {
    if (!priceSeriesRef.current || !volumeSeriesRef.current || !positionSeriesRef.current) return;

    const seriesData = chartData.map(point => ({
      time: toTimestamp(point.date),
      value: point.close,
    }));

    priceSeriesRef.current.setData(seriesData);
    volumeSeriesRef.current.setData(volumeSeriesData);
    positionSeriesRef.current.setData(positionSeriesData);

    if (seriesData.length > 0) {
      chartInstanceRef.current?.timeScale().fitContent();
    }
  }, [chartData, volumeSeriesData, positionSeriesData]);

  useEffect(() => {
    if (!priceSeriesRef.current) return;
    priceSeriesRef.current.setMarkers(showEventMarkers ? chartMarkers : []);
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
    if (!chartInstanceRef.current) return;

    const chart = chartInstanceRef.current;

    const handleMove = (param: Parameters<typeof chart.subscribeCrosshairMove>[0]) => {
      if (!param || !param.time || !param.point) {
        setMarkerTooltipState(prev =>
          prev.visible ? { ...prev, visible: false } : prev
        );
        return;
      }

      const event = markerDetails.get(param.time as UTCTimestamp);
      if (!event || (event.type !== 'buy' && event.type !== 'sell')) {
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

      const content = `${event.type === 'buy' ? 'Buy' : 'Sell'} • Price ${formatCurrencyValue(event.price)} • Amount ${formatCurrencyValue(event.amount)}`;

      setMarkerTooltipState({
        visible: true,
        x: param.point.x,
        y: param.point.y,
        content,
      });
    };

    chart.subscribeCrosshairMove(handleMove);

    return () => {
      chart.unsubscribeCrosshairMove(handleMove);
    };
  }, [markerDetails, currencySymbol]);

  useEffect(() => {
    if (loading || !navChartData || navChartData.length === 0) {
      return;
    }

    const container = navChartContainerRef.current;
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

    const navSeries = chart.addSeries('Area', {
      lineColor: '#10b981',
      lineWidth: 2,
      topColor: 'rgba(16, 185, 129, 0.4)',
      bottomColor: 'rgba(16, 185, 129, 0.05)',
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
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
    }

    navChartInstanceRef.current = chart;
    navSeriesRef.current = navSeries;

    return () => {
      resizeObserver?.disconnect();
      chart.remove();
      navChartInstanceRef.current = null;
      navSeriesRef.current = null;
    };
  }, [loading, navChartData]);

  useEffect(() => {
    if (!navSeriesRef.current || navChartData.length === 0) return;

    const navSeriesData = navChartData.map(point => ({
      time: toTimestamp(point.date),
      value: point.close,
    }));

    navSeriesRef.current.setData(navSeriesData);

    if (navSeriesData.length > 0) {
      navChartInstanceRef.current?.timeScale().fitContent();
    }
  }, [navChartData]);

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
        <StockTitle>{stockData.symbol}</StockTitle>
        <StockSubtitle>{stockData.currency} • {stockData.position.shares} shares</StockSubtitle>
      </Header>

      <MetricsContainer>
        <MetricsTable>
          <tbody>
            <MetricRow>
              <MetricLabel>Current Price</MetricLabel>
              <MetricValue>{currencySymbol}{stockData.position.currentPrice?.toFixed(2) || 'N/A'}</MetricValue>
            </MetricRow>

            <MetricRow>
              <MetricLabel>Total Return</MetricLabel>
              <MetricValue $color={isPositive ? '#10b981' : '#ef4444'}>
                <MetricValueWithChange>
                  {currencySymbol}{metrics.totalReturn.toFixed(2)}
                  <MetricChange $positive={isPositive}>
                    {isPositive ? '+' : ''}{metrics.totalReturnPercent.toFixed(2)}%
                  </MetricChange>
                </MetricValueWithChange>
              </MetricValue>
            </MetricRow>

            <MetricRow>
              <MetricLabel>Annualized Return</MetricLabel>
              <MetricValue>{metrics.annualizedReturn.toFixed(2)}%</MetricValue>
            </MetricRow>

            <MetricRow>
              <MetricLabel>Holding Period</MetricLabel>
              <MetricValue>{metrics.holdingPeriodDays} days</MetricValue>
            </MetricRow>

            <MetricRow>
              <MetricLabel>Current Value</MetricLabel>
              <MetricValue>{currencySymbol}{stockData.position.currentValue?.toFixed(2) || 'N/A'}</MetricValue>
            </MetricRow>

            <MetricRow>
              <MetricLabel>Average Cost</MetricLabel>
              <MetricValue>{currencySymbol}{stockData.position.averageCost.toFixed(2)}</MetricValue>
            </MetricRow>
          </tbody>
        </MetricsTable>

        <MetricsTable>
          <tbody>
            <MetricRow>
              <MetricLabel>Max Drawdown</MetricLabel>
              <MetricValue $color="#ef4444">
                -{currencySymbol}{metrics.maxDrawdown.toFixed(2)} (-{metrics.maxDrawdownPercent.toFixed(2)}%)
              </MetricValue>
            </MetricRow>

            <MetricRow>
              <MetricLabel>Volatility (Annual)</MetricLabel>
              <MetricValue>{metrics.priceVolatility.toFixed(2)}%</MetricValue>
            </MetricRow>

            <MetricRow>
              <MetricLabel>Best Day Gain</MetricLabel>
              <MetricValue $color="#10b981">
                +{currencySymbol}{metrics.bestDayGain.toFixed(2)}
              </MetricValue>
            </MetricRow>

            <MetricRow>
              <MetricLabel>Worst Day Loss</MetricLabel>
              <MetricValue $color="#ef4444">
                {currencySymbol}{metrics.worstDayLoss.toFixed(2)}
              </MetricValue>
            </MetricRow>

            <MetricRow>
              <MetricLabel>Highest Price</MetricLabel>
              <MetricValue>{currencySymbol}{metrics.highestPrice.toFixed(2)}</MetricValue>
            </MetricRow>

            <MetricRow>
              <MetricLabel>Lowest Price</MetricLabel>
              <MetricValue>{currencySymbol}{metrics.lowestPrice.toFixed(2)}</MetricValue>
            </MetricRow>
          </tbody>
        </MetricsTable>
      </MetricsContainer>

      {navChartData.length > 0 && (
        <ChartSection>
          <ChartHeader>
            <ChartTitle>Portfolio Value (NAV)</ChartTitle>
          </ChartHeader>
          <ChartCanvas>
            <ChartCanvasInner ref={navChartContainerRef} />
          </ChartCanvas>
        </ChartSection>
      )}

      <ChartSection>
        <ChartHeader>
          <ChartTitle>Price History</ChartTitle>
          <ChartControls>
            <TimeRangeSelector>
              {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map(range => (
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
              left: markerTooltipState.x,
              top: markerTooltipState.y,
            }}
          >
            {markerTooltipState.content}
          </MarkerTooltip>
        </ChartCanvas>
      </ChartSection>

      <Section>
        <SectionTitle>
          <DollarSign size={20} />
          Dividend Summary
        </SectionTitle>
        {dividendSummary && dividendSummary.dividendCount > 0 ? (
          <>
            <DividendLayout>
              <DividendTableContainer>
                <DividendTable>
                  <tbody>
                    <DividendRow>
                      <DividendCell>Total Dividends</DividendCell>
                      <DividendCell>
                        {currencySymbol}
                        {dividendSummary.totalDividends.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </DividendCell>
                    </DividendRow>
                    <DividendRow>
                      <DividendCell>Payout Count</DividendCell>
                      <DividendCell>{dividendSummary.dividendCount}</DividendCell>
                    </DividendRow>
                    <DividendRow>
                      <DividendCell>Average Payout</DividendCell>
                      <DividendCell>
                        {currencySymbol}
                        {dividendSummary.averageDividend.toFixed(2)}
                      </DividendCell>
                    </DividendRow>
                    <DividendRow>
                      <DividendCell>Annual Yield</DividendCell>
                      <DividendCell>
                        {dividendSummary.annualYield
                          ? `${dividendSummary.annualYield.toFixed(2)}%`
                          : '—'}
                      </DividendCell>
                    </DividendRow>
                    {dividendSummary.lastDividendDate && (
                      <DividendRow>
                        <DividendCell>Last Dividend Date</DividendCell>
                        <DividendCell>{dividendSummary.lastDividendDate}</DividendCell>
                      </DividendRow>
                    )}
                  </tbody>
                </DividendTable>
              </DividendTableContainer>

              <DividendTableContainer>
                <DividendDistributionHeader>
                  <PerformanceLabel style={{ margin: 0 }}>Distribution Overview</PerformanceLabel>
                  <DividendPeriodToggle>
                    <DividendPeriodButton
                      type="button"
                      $active={dividendPeriodMode === 'year'}
                      onClick={() => setDividendPeriodMode('year')}
                    >
                      By Year
                    </DividendPeriodButton>
                    <DividendPeriodButton
                      type="button"
                      $active={dividendPeriodMode === 'quarter'}
                      onClick={() => setDividendPeriodMode('quarter')}
                    >
                      By Quarter
                    </DividendPeriodButton>
                  </DividendPeriodToggle>
                </DividendDistributionHeader>
                <DividendScrollArea>
                  <DividendScrollInner>
                    <DividendTable>
                      <thead>
                        <DividendRow>
                          <DividendCell>
                            <strong>{dividendPeriodMode === 'year' ? 'Year' : 'Quarter'}</strong>
                          </DividendCell>
                          <DividendCell>
                            <strong>Total</strong>
                          </DividendCell>
                          <DividendCell>
                            <strong>Count</strong>
                          </DividendCell>
                        </DividendRow>
                      </thead>
                      <tbody>
                        {(dividendPeriodMode === 'year'
                          ? dividendSummary.perYearTotals
                          : dividendSummary.perQuarterTotals
                        ).map(period => (
                          <DividendRow key={period.period}>
                            <DividendCell>{period.period}</DividendCell>
                            <DividendCell>
                              {currencySymbol}
                              {period.total.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </DividendCell>
                            <DividendCell>{period.count}</DividendCell>
                          </DividendRow>
                        ))}
                      </tbody>
                    </DividendTable>
                  </DividendScrollInner>
                </DividendScrollArea>
              </DividendTableContainer>
            </DividendLayout>
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
