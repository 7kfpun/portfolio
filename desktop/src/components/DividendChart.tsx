import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, HistogramSeriesPartialOptions } from 'lightweight-charts';
import styled from 'styled-components';
import { DividendPeriodSummary } from '../types/StockDetail';

const ChartContainer = styled.div`
  width: 100%;
  height: 300px;
  position: relative;
`;

const TooltipContainer = styled.div`
  position: absolute;
  display: none;
  padding: 8px;
  box-sizing: border-box;
  font-size: 12px;
  text-align: left;
  z-index: 1000;
  top: 12px;
  left: 12px;
  pointer-events: none;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.9);
  color: #333;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  border: 1px solid #e2e8f0;
`;

interface DividendChartProps {
  data: DividendPeriodSummary[];
  periodMode: 'year' | 'quarter';
  currencySymbol?: string;
}

export const DividendChart: React.FC<DividendChartProps> = ({ data, periodMode, currencySymbol = '$' }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: '#f1f5f9' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: {
          top: 0.2,
          bottom: 0,
        },
      },
      timeScale: {
        borderVisible: false,
      },
      handleScale: false,
      handleScroll: false,
    });

    chartRef.current = chart;

    // Sort data chronologically for the chart
    const sortedData = [...data].sort((a, b) => a.period.localeCompare(b.period));

    const histogramSeries = (chart as any).addHistogramSeries({
      color: '#10b981',
      priceFormat: {
        type: 'volume', // Just prevents formatting issues, we'll use custom formatter if needed
      },
    });

    const chartData = sortedData.map(item => ({
      time: item.period, // Using string dates (YYYY or YYYY-QQ) works with custom time scale but here we might need to be careful. 
      // lightweight-charts expects YYYY-MM-DD for standard timescale.
      // For years, we might need to fake a date or use a custom index-based scale if simple strings fail.
      // Actually, string dates "2020", "2021" work fine as business days usually, but let's see. 
      value: item.total,
      color: '#10b981',
    }));

    // For simple years/quarters string, lightweight-charts might complain if it strictly enforces date format.
    // However, it supports 'Business Day' strings nicely. Let's try passing them directly. 
    // If 'time' needs to be strictly YYYY-MM-DD, we'll map '2020' to '2020-12-31' or similar.
    // Let's assume standard behavior first, but to be safe for "2020", let's map to "2020-01-01" for ordering if it parses dates.
    // Actually, simply passing "2023" often works as a business day string.

    // Safer approach: Use the custom mapping or just standard dates.
    // Let's use simple data mapping for now.

    // FIX: lightweight-charts Time must be YYYY-MM-DD or unix. "2023" isn't valid. 
    // Mapping periods to a valid date string representing that period.
    const mappedChartData = sortedData.map(item => {
      let timeStr = item.period;
      if (periodMode === 'year') {
        timeStr = `${item.period}-12-31`;
      } else {
        // "2023-Q1" -> "2023-03-31" roughly
        const [y, q] = item.period.split('-Q');
        const m = parseInt(q) * 3;
        const d = new Date(parseInt(y), m, 0); // last day of quarter
        timeStr = d.toISOString().split('T')[0];
      }
      return {
        time: timeStr,
        value: item.total,
        originalPeriod: item.period // Keep explicit period for tooltip
      };
    });

    histogramSeries.setData(mappedChartData);

    chart.timeScale().fitContent();

    // Tooltip Logic
    chart.subscribeCrosshairMove(param => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current!.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current!.clientHeight
      ) {
        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        }
        return;
      }

      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'block';
        const data = param.seriesData.get(histogramSeries);
        if (data && 'value' in data) {
          // We need to recover the original period label. 
          // Since we don't have easy access to extra data in 'data' object directly without casting or looking up
          // we can look up by time.
          const match = mappedChartData.find(d => d.time === param.time);
          const periodLabel = match ? match.originalPeriod : String(param.time);
          const value = data.value as number;

          tooltipRef.current.innerHTML = `
                <div style="font-weight: 600">${periodLabel}</div>
                <div>${currencySymbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            `;

          // Positioning
          const coordinate = histogramSeries.priceToCoordinate(value);
          const shiftedCoordinate = param.point.x - 50;

          tooltipRef.current.style.left = param.point.x + 'px';
          tooltipRef.current.style.top = param.point.y + 'px';
        }
      }
    });

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, periodMode, currencySymbol]);

  return (
    <ChartContainer ref={chartContainerRef}>
      <TooltipContainer ref={tooltipRef} />
    </ChartContainer>
  );
};
