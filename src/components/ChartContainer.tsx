/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createChart,
  IChartApi,
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
  Sliders,
  RotateCcw,
  Clock,
  Activity,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface ChartContainerProps {
  candles: Candle[];
  positions: Position[];
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  indicators: IndicatorConfig;
  onIndicatorsChange: (indicators: IndicatorConfig) => void;
  currentPrice: number;
  priceChangePercent24h?: number;
  priceChange24h?: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  fundingCountdown?: string;
  fundingRateText?: string;
  heightClass?: string;
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
  priceChangePercent24h = 0,
  priceChange24h = 0,
  high24h,
  low24h,
  volume24h,
  fundingCountdown,
  fundingRateText,
  heightClass,
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

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [chartMode, setChartMode] = useState<'compact' | 'normal'>('compact');

  const isUp = priceChangePercent24h >= 0;

  // Initialize TradingView lightweight chart with strict LTR isolation
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth || 320,
      height: chartContainerRef.current.clientHeight || 200,
      layout: {
        background: { type: ColorType.Solid, color: '#000000' },
        textColor: '#848e9c',
        fontFamily: "'JetBrains Mono', 'Plus Jakarta Sans', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(30, 36, 48, 0.35)', style: LineStyle.Dotted },
        horzLines: { color: 'rgba(30, 36, 48, 0.35)', style: LineStyle.Dotted },
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
          top: 0.08,
          bottom: 0.16,
        },
        visible: true,
        entireTextOnly: true,
      },
      timeScale: {
        borderColor: '#1c1c1c',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 7,
        minBarSpacing: 3,
        rightOffset: 4,
        fixLeftEdge: true, // Fixes candles starting properly from left to right!
        fixRightEdge: false,
        shiftVisibleRangeOnNewBar: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false, // Prevents blocking vertical mobile page scroll!
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
        top: 0.82,
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
      color: 'rgba(56, 189, 248, 0.7)',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const bbMiddle = chart.addSeries(LineSeries, {
      color: 'rgba(56, 189, 248, 0.45)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const bbLower = chart.addSeries(LineSeries, {
      color: 'rgba(56, 189, 248, 0.7)',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    bbUpperSeriesRef.current = bbUpper;
    bbMiddleSeriesRef.current = bbMiddle;
    bbLowerSeriesRef.current = bbLower;

    // Responsive resize observer
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight || 200,
        });
        chart.timeScale().fitContent();
      }
    };

    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Fit content helper
  const fitChart = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  // Update chart data whenever candles or indicators change
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return;

    // Format and strictly sort candlestick data ascending
    const sorted = [...candles].sort((a, b) => a.time - b.time);

    // Strictly deduplicate by time (Lightweight Charts requirement)
    const deduped: Candle[] = [];
    let lastTime = -1;
    for (const c of sorted) {
      if (c.time > lastTime) {
        deduped.push(c);
        lastTime = c.time;
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

    // Fit content smoothly so candles span neatly from left to right
    requestAnimationFrame(() => {
      if (chartRef.current && candleData.length > 5) {
        chartRef.current.timeScale().fitContent();
      }
    });

    // Update volume series
    if (volumeSeriesRef.current) {
      if (indicators.showVolume) {
        const volumeData: HistogramData<Time>[] = deduped.map((c) => ({
          time: c.time as Time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(14, 203, 129, 0.28)' : 'rgba(246, 70, 93, 0.28)',
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
  }, [candles, indicators, timeframe]);

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
      style={{
        direction: 'ltr',
        unicodeBidi: 'isolate',
        textAlign: 'left',
      }}
      className={`relative flex flex-col bg-black border-b border-[#1c1c1c] w-full transition-all duration-150 ${
        isFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen'
          : heightClass
          ? heightClass
          : chartMode === 'compact'
          ? 'h-[260px] sm:h-[300px] lg:h-[350px]'
          : 'h-[380px] sm:h-[440px] lg:h-[500px]'
      }`}
    >
      {/* 1. Integrated Compact Header with Price, 24h stats, and Controls */}
      <div className="flex flex-wrap items-center justify-between px-2.5 py-1 bg-[#090909] border-b border-[#1c1c1c] text-xs gap-1 select-none">
        {/* Left: Live Price & 24h Change */}
        <div className="flex items-center gap-2">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-base sm:text-lg font-black font-mono-num tracking-tight transition-colors duration-200 ${
                isUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'
              }`}
            >
              ${formatPrice(currentPrice)}
            </span>
            <span
              className={`text-[10px] font-bold font-mono-num px-1.5 py-0.2 rounded transition-colors ${
                isUp
                  ? 'text-[#0ecb81] bg-[#0ecb81]/15 border border-[#0ecb81]/30'
                  : 'text-[#f6465d] bg-[#f6465d]/15 border border-[#f6465d]/30'
              }`}
            >
              {isUp ? '+' : ''}
              {priceChangePercent24h.toFixed(2)}%
            </span>
          </div>

          {/* 24h High, Low & Volume (Responsive) */}
          <div className="hidden xs:flex items-center gap-2 text-[10px] text-[#777] font-mono-num border-l border-[#222] pl-2">
            <div>
              <span className="text-[#555] mr-0.5">24hH</span>
              <span className="text-[#bbb]">${formatPrice(high24h || currentPrice * 1.015)}</span>
            </div>
            <div>
              <span className="text-[#555] mr-0.5">24hL</span>
              <span className="text-[#bbb]">${formatPrice(low24h || currentPrice * 0.985)}</span>
            </div>
            {volume24h && (
              <div className="hidden md:block">
                <span className="text-[#555] mr-0.5">Vol</span>
                <span className="text-[#bbb]">{(volume24h / 1000).toFixed(0)}K</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Timeframes & Tools */}
        <div className="flex items-center gap-1">
          {/* Timeframe Chips */}
          <div className="flex items-center bg-[#141414] rounded-md p-0.5 border border-[#222]">
            {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf as Timeframe)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                  timeframe === tf
                    ? 'bg-[#2a2a2a] text-[#38bdf8] shadow-xs'
                    : 'text-[#777] hover:text-[#ddd]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Indicators dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
              className={`p-1 rounded text-[11px] transition-colors border ${
                showIndicatorMenu
                  ? 'bg-[#1e293b] text-[#38bdf8] border-[#38bdf8]/40'
                  : 'bg-[#141414] text-[#888] hover:text-[#ddd] border-[#222]'
              }`}
              title="Technical Indicators"
            >
              <Sliders size={12} />
            </button>

            {showIndicatorMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-[#121722] border border-[#232b3b] rounded-lg shadow-2xl p-2 z-50 text-xs text-[#d1d4dc]">
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

          {/* Reset / Fit View button */}
          <button
            onClick={fitChart}
            className="p-1 rounded bg-[#141414] text-[#888] hover:text-[#ddd] border border-[#222]"
            title="Reset View / Fit Candles"
          >
            <RotateCcw size={12} />
          </button>

          {/* Compact / Expand Toggle */}
          <button
            onClick={() => setChartMode(chartMode === 'compact' ? 'normal' : 'compact')}
            className="hidden sm:flex items-center gap-0.5 px-1.5 py-1 rounded bg-[#141414] text-[#888] hover:text-[#ddd] border border-[#222] text-[10px] font-semibold"
            title="Toggle Chart Height"
          >
            <span>{chartMode === 'compact' ? 'Expand' : 'Compact'}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded bg-[#141414] text-[#888] hover:text-[#ddd] border border-[#222]"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Chart'}
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* 2. Chart Canvas Container (strictly isolated LTR) */}
      <div
        ref={chartContainerRef}
        dir="ltr"
        style={{
          direction: 'ltr',
          unicodeBidi: 'isolate',
          textAlign: 'left',
        }}
        className="flex-1 w-full h-full cursor-crosshair overflow-hidden"
      />

      {/* 3. Real-time Indicator Legend overlay */}
      <div className="absolute left-2.5 bottom-1.5 flex flex-wrap gap-1.5 text-[9px] font-mono-num pointer-events-none z-10 opacity-75">
        {indicators.showEMA9 && (
          <span className="text-[#f0b90b] bg-[#0c1017]/85 px-1 py-0.2 rounded border border-[#f0b90b]/20">
            EMA(9)
          </span>
        )}
        {indicators.showEMA21 && (
          <span className="text-[#8b5cf6] bg-[#0c1017]/85 px-1 py-0.2 rounded border border-[#8b5cf6]/20">
            EMA(21)
          </span>
        )}
        {indicators.showBollingerBands && (
          <span className="text-[#38bdf8] bg-[#0c1017]/85 px-1 py-0.2 rounded border border-[#38bdf8]/20">
            BOLL(20,2)
          </span>
        )}
        {fundingRateText && (
          <span className="text-[#888] bg-[#0c1017]/85 px-1 py-0.2 rounded border border-[#333]">
            Funding: <span className="text-[#0ecb81]">{fundingRateText}</span>
            {fundingCountdown ? ` in ${fundingCountdown}` : ''}
          </span>
        )}
      </div>
    </div>
  );
}
