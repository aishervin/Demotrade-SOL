/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  LineStyle,
  CandlestickData,
  HistogramData,
  LineData,
  Time,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from 'lightweight-charts';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Candle, IndicatorConfig, Position, Timeframe } from '../types/trading';
import { formatPrice } from '../engine/decimal';
import {
  Maximize2,
  Minimize2,
  TrendingUp,
  Sliders,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';

interface ChartContainerProps {
  candles: Candle[];
  positions: Position[];
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  indicators: IndicatorConfig;
  onIndicatorsChange: (indicators: IndicatorConfig) => void;
  currentPrice: number;
}

const TIMEFRAMES: Timeframe[] = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d'];

// EMA calculation helper
function calculateEMA(candles: Candle[], period: number): LineData<Time>[] {
  if (candles.length < period) return [];
  const k = 2 / (period + 1);
  const result: LineData<Time>[] = [];
  let ema = candles.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;

  for (let i = period - 1; i < candles.length; i++) {
    const c = candles[i];
    ema = c.close * k + ema * (1 - k);
    result.push({
      time: c.time as Time,
      value: ema,
    });
  }
  return result;
}

// Bollinger Bands calculation helper
function calculateBollingerBands(candles: Candle[], period = 20, multiplier = 2) {
  if (candles.length < period) return { upper: [], middle: [], lower: [] };
  const upper: LineData<Time>[] = [];
  const middle: LineData<Time>[] = [];
  const lower: LineData<Time>[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, c) => acc + c.close, 0);
    const mean = sum / period;
    const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    const time = candles[i].time as Time;
    upper.push({ time, value: mean + multiplier * stdDev });
    middle.push({ time, value: mean });
    lower.push({ time, value: mean - multiplier * stdDev });
  }

  return { upper, middle, lower };
}

export function ChartContainer({
  candles,
  positions,
  timeframe,
  onTimeframeChange,
  indicators,
  onIndicatorsChange,
  currentPrice,
}: ChartContainerProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const ema9SeriesRef = useRef<any>(null);
  const ema21SeriesRef = useRef<any>(null);
  const bbUpperSeriesRef = useRef<any>(null);
  const bbMiddleSeriesRef = useRef<any>(null);
  const bbLowerSeriesRef = useRef<any>(null);

  // Price lines references
  const priceLinesRef = useRef<any[]>([]);
  const hasFittedRef = useRef<boolean>(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);

  // Reset fit on timeframe change
  useEffect(() => {
    hasFittedRef.current = false;
  }, [timeframe]);

  // Initialize TradingView lightweight chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 340,
      layout: {
        background: { type: ColorType.Solid, color: '#000000' },
        textColor: '#848e9c',
        fontFamily: "'JetBrains Mono', 'Plus Jakarta Sans', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(30, 36, 48, 0.45)', style: LineStyle.Dotted },
        horzLines: { color: 'rgba(30, 36, 48, 0.45)', style: LineStyle.Dotted },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#363c4e',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#202634',
        },
        horzLine: {
          color: '#363c4e',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#202634',
        },
      },
      rightPriceScale: {
        borderColor: '#1c1c1c',
        scaleMargins: {
          top: 0.1,
          bottom: 0.22,
        },
      },
      timeScale: {
        borderColor: '#1c1c1c',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 9,
        minBarSpacing: 3,
        rightOffset: 6,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // Add Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#0ecb81',
      downColor: '#f6465d',
      borderVisible: false,
      wickUpColor: '#0ecb81',
      wickDownColor: '#f6465d',
    });
    candleSeriesRef.current = candleSeries;

    // Add Volume Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // separate overlay scale
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // Add EMA9 Line Series
    const ema9Series = chart.addSeries(LineSeries, {
      color: '#f0b90b', // Gold
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    ema9SeriesRef.current = ema9Series;

    // Add EMA21 Line Series
    const ema21Series = chart.addSeries(LineSeries, {
      color: '#8b5cf6', // Violet
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    ema21SeriesRef.current = ema21Series;

    // Add Bollinger Bands Series
    const bbUpper = chart.addSeries(LineSeries, {
      color: 'rgba(41, 98, 255, 0.6)',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const bbMiddle = chart.addSeries(LineSeries, {
      color: 'rgba(41, 98, 255, 0.4)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const bbLower = chart.addSeries(LineSeries, {
      color: 'rgba(41, 98, 255, 0.6)',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    bbUpperSeriesRef.current = bbUpper;
    bbMiddleSeriesRef.current = bbMiddle;
    bbLowerSeriesRef.current = bbLower;

    // Resize observer
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight || 340,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Update chart data whenever candles or indicators change
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return;

    // Format candlestick data
    const sorted = [...candles].sort((a, b) => a.time - b.time);

    // Filter duplicates by time
    const deduped: Candle[] = [];
    const seenTimes = new Set<number>();
    for (const c of sorted) {
      if (!seenTimes.has(c.time)) {
        seenTimes.add(c.time);
        deduped.push(c);
      }
    }

    const candleData: CandlestickData<Time>[] = deduped.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeriesRef.current.setData(candleData);

    // Auto fit content so candles span properly from left to right
    if (!hasFittedRef.current && candleData.length > 5 && chartRef.current) {
      chartRef.current.timeScale().fitContent();
      hasFittedRef.current = true;
    }

    // Update volume series
    if (volumeSeriesRef.current) {
      if (indicators.showVolume) {
        const volumeData: HistogramData<Time>[] = deduped.map((c) => ({
          time: c.time as Time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(14, 203, 129, 0.25)' : 'rgba(246, 70, 93, 0.25)',
        }));
        volumeSeriesRef.current.setData(volumeData);
      } else {
        volumeSeriesRef.current.setData([]);
      }
    }

    // Update EMA9
    if (ema9SeriesRef.current) {
      if (indicators.showEMA9) {
        const ema9 = calculateEMA(deduped, 9);
        ema9SeriesRef.current.setData(ema9);
      } else {
        ema9SeriesRef.current.setData([]);
      }
    }

    // Update EMA21
    if (ema21SeriesRef.current) {
      if (indicators.showEMA21) {
        const ema21 = calculateEMA(deduped, 21);
        ema21SeriesRef.current.setData(ema21);
      } else {
        ema21SeriesRef.current.setData([]);
      }
    }

    // Update Bollinger Bands
    if (bbUpperSeriesRef.current && bbMiddleSeriesRef.current && bbLowerSeriesRef.current) {
      if (indicators.showBollingerBands) {
        const bb = calculateBollingerBands(deduped, 20, 2);
        bbUpperSeriesRef.current.setData(bb.upper);
        bbMiddleSeriesRef.current.setData(bb.middle);
        bbLowerSeriesRef.current.setData(bb.lower);
      } else {
        bbUpperSeriesRef.current.setData([]);
        bbMiddleSeriesRef.current.setData([]);
        bbLowerSeriesRef.current.setData([]);
      }
    }
  }, [candles, indicators]);

  // Update position lines on chart (Entry price, Liquidation price, TP/SL lines)
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    // Clear old lines
    for (const line of priceLinesRef.current) {
      try {
        candleSeriesRef.current.removePriceLine(line);
      } catch (_) {}
    }
    priceLinesRef.current = [];

    // Draw active positions
    for (const pos of positions) {
      if (pos.symbol === 'SOL/USDT') {
        // Entry line
        const entryLine = candleSeriesRef.current.createPriceLine({
          price: pos.entryPrice,
          color: pos.side === 'long' ? '#0ecb81' : '#f6465d',
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `${pos.leverage}x ${pos.side.toUpperCase()} @ ${formatPrice(pos.entryPrice)}`,
        });
        priceLinesRef.current.push(entryLine);

        // Liquidation line
        if (pos.estimatedLiquidationPrice > 0) {
          const liqLine = candleSeriesRef.current.createPriceLine({
            price: pos.estimatedLiquidationPrice,
            color: '#f97316', // Orange warning
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `Liq: ${formatPrice(pos.estimatedLiquidationPrice)}`,
          });
          priceLinesRef.current.push(liqLine);
        }

        // Take Profit line
        if (pos.takeProfitPrice && pos.takeProfitPrice > 0) {
          const tpLine = candleSeriesRef.current.createPriceLine({
            price: pos.takeProfitPrice,
            color: '#10b981',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: `TP: ${formatPrice(pos.takeProfitPrice)}`,
          });
          priceLinesRef.current.push(tpLine);
        }

        // Stop Loss line
        if (pos.stopLossPrice && pos.stopLossPrice > 0) {
          const slLine = candleSeriesRef.current.createPriceLine({
            price: pos.stopLossPrice,
            color: '#ef4444',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: `SL: ${formatPrice(pos.stopLossPrice)}`,
          });
          priceLinesRef.current.push(slLine);
        }
      }
    }
  }, [positions]);

  return (
    <div
      dir="ltr"
      style={{ direction: 'ltr' }}
      className={`relative flex flex-col bg-black border-b border-[#1c1c1c] transition-all duration-200 ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen' : 'h-[270px] sm:h-[320px] md:h-[380px] w-full'
      }`}
    >
      {/* Timeframe & Indicator Bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#1c1c1c] bg-black text-xs select-none">
        {/* Timeframe Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <span className="text-[#64748b] text-[10px] font-semibold uppercase tracking-wider mr-1 hidden sm:inline">
            Time
          </span>
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-[#1e293b] text-[#38bdf8] font-semibold'
                  : 'text-[#848e9c] hover:text-[#d1d4dc] hover:bg-[#151b26]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Indicator & Controls */}
        <div className="flex items-center gap-1.5 ml-2">
          {/* Indicator toggles dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
                showIndicatorMenu ? 'bg-[#1e293b] text-[#38bdf8]' : 'text-[#848e9c] hover:text-[#d1d4dc] hover:bg-[#151b26]'
              }`}
            >
              <Sliders size={12} />
              <span className="hidden sm:inline">Indicators</span>
            </button>

            {showIndicatorMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#121722] border border-[#232b3b] rounded-lg shadow-2xl p-2 z-50 text-xs text-[#d1d4dc]">
                <div className="font-semibold text-[#848e9c] text-[10px] uppercase pb-1 mb-1 border-b border-[#1e2430]">
                  Overlays & Signals
                </div>
                <label className="flex items-center justify-between py-1 cursor-pointer hover:text-white">
                  <span className="flex items-center gap-1.5 text-[#f0b90b]">EMA (9)</span>
                  <input
                    type="checkbox"
                    checked={indicators.showEMA9}
                    onChange={(e) => onIndicatorsChange({ ...indicators, showEMA9: e.target.checked })}
                    className="accent-[#f0b90b] rounded"
                  />
                </label>
                <label className="flex items-center justify-between py-1 cursor-pointer hover:text-white">
                  <span className="flex items-center gap-1.5 text-[#8b5cf6]">EMA (21)</span>
                  <input
                    type="checkbox"
                    checked={indicators.showEMA21}
                    onChange={(e) => onIndicatorsChange({ ...indicators, showEMA21: e.target.checked })}
                    className="accent-[#8b5cf6] rounded"
                  />
                </label>
                <label className="flex items-center justify-between py-1 cursor-pointer hover:text-white">
                  <span className="flex items-center gap-1.5 text-[#38bdf8]">Bollinger Bands</span>
                  <input
                    type="checkbox"
                    checked={indicators.showBollingerBands}
                    onChange={(e) => onIndicatorsChange({ ...indicators, showBollingerBands: e.target.checked })}
                    className="accent-[#38bdf8] rounded"
                  />
                </label>
                <label className="flex items-center justify-between py-1 cursor-pointer hover:text-white">
                  <span className="flex items-center gap-1.5 text-[#22c55e]">Volume</span>
                  <input
                    type="checkbox"
                    checked={indicators.showVolume}
                    onChange={(e) => onIndicatorsChange({ ...indicators, showVolume: e.target.checked })}
                    className="accent-[#22c55e] rounded"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded text-[#848e9c] hover:text-[#d1d4dc] hover:bg-[#151b26]"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Chart'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div
        ref={chartContainerRef}
        dir="ltr"
        style={{ direction: 'ltr' }}
        className="flex-1 w-full h-full cursor-crosshair"
      />

      {/* Real-time Indicator Legend overlay */}
      <div className="absolute left-3 top-10 flex flex-wrap gap-2 text-[10px] font-mono-num pointer-events-none z-10 opacity-80">
        {indicators.showEMA9 && (
          <span className="text-[#f0b90b] bg-[#0c1017]/80 px-1 py-0.5 rounded">EMA(9)</span>
        )}
        {indicators.showEMA21 && (
          <span className="text-[#8b5cf6] bg-[#0c1017]/80 px-1 py-0.5 rounded">EMA(21)</span>
        )}
        {indicators.showBollingerBands && (
          <span className="text-[#38bdf8] bg-[#0c1017]/80 px-1 py-0.5 rounded">BOLL(20,2)</span>
        )}
      </div>
    </div>
  );
}
