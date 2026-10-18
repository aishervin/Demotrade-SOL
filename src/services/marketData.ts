/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Candle, MarketTick, OrderBookData, RecentTrade, Timeframe } from '../types/trading';
import { roundTo } from '../engine/decimal';

export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'stale' | 'simulated';

export interface MarketDataCallbacks {
  onTick: (tick: MarketTick) => void;
  onCandle: (candle: Candle, isBarClosed: boolean) => void;
  onHistoricalCandles: (candles: Candle[]) => void;
  onOrderBook: (book: OrderBookData) => void;
  onTrade: (trade: RecentTrade) => void;
  onStatusChange: (status: ConnectionStatus, latencyMs?: number) => void;
}

// Convert application timeframe to Binance kline interval string
export function mapTimeframeToBinance(tf: Timeframe): string {
  switch (tf) {
    case '1m': return '1m';
    case '3m': return '3m';
    case '5m': return '5m';
    case '15m': return '15m';
    case '30m': return '30m';
    case '1h': return '1h';
    case '4h': return '4h';
    case '1d': return '1d';
    default: return '1m';
  }
}

export class MarketDataAdapter {
  private ws: WebSocket | null = null;
  private callbacks: MarketDataCallbacks;
  private symbol: string = 'SOLUSDT';
  private timeframe: Timeframe = '1m';
  private status: ConnectionStatus = 'connecting';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private lastMessageTime = 0;
  private isDestroyed = false;
  private fallbackInterval: any = null;

  // Cached state for simulation fallback if needed
  private currentPrice = 184.50; // realistic base price
  private currentHigh = 189.20;
  private currentLow = 179.80;
  private currentVolume = 3450200;
  private currentCandle: Candle | null = null;

  constructor(callbacks: MarketDataCallbacks) {
    this.callbacks = callbacks;
  }

  public async setTimeframe(tf: Timeframe) {
    if (this.timeframe !== tf) {
      this.timeframe = tf;
      await this.bootstrapREST();
      this.reconnect();
    }
  }

  public async start() {
    this.isDestroyed = false;
    this.callbacks.onStatusChange('connecting');

    // 1. First bootstrap via REST endpoints for instant render
    await this.bootstrapREST();

    // 2. Open WebSocket stream
    this.connectWebSocket();

    // 3. Setup watchdog timer to detect stale data
    this.startWatchdog();
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.fallbackInterval) clearInterval(this.fallbackInterval);
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
  }

  /**
   * Fetch initial 24h ticker, klines, and depth snapshot via REST
   */
  public async bootstrapREST(): Promise<Candle[]> {
    const binanceTf = mapTimeframeToBinance(this.timeframe);
    let historicalCandles: Candle[] = [];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const [tickerRes, klinesRes, depthRes] = await Promise.allSettled([
        fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${this.symbol}`, { signal: controller.signal }),
        fetch(`https://api.binance.com/api/v3/klines?symbol=${this.symbol}&interval=${binanceTf}&limit=120`, { signal: controller.signal }),
        fetch(`https://api.binance.com/api/v3/depth?symbol=${this.symbol}&limit=20`, { signal: controller.signal }),
      ]);
      clearTimeout(timeoutId);

      // Process 24h ticker
      if (tickerRes.status === 'fulfilled' && tickerRes.value.ok) {
        const t = await tickerRes.value.json();
        const price = parseFloat(t.lastPrice);
        const bidPrice = parseFloat(t.bidPrice);
        const askPrice = parseFloat(t.askPrice);
        const high24h = parseFloat(t.highPrice);
        const low24h = parseFloat(t.lowPrice);
        const volume24h = parseFloat(t.volume);
        const priceChange24h = parseFloat(t.priceChange);
        const priceChangePercent24h = parseFloat(t.priceChangePercent);

        this.currentPrice = price;
        this.currentHigh = high24h;
        this.currentLow = low24h;

        const tick: MarketTick = {
          symbol: 'SOL/USDT',
          price,
          bidPrice: bidPrice || roundTo(price * 0.9999, 2),
          askPrice: askPrice || roundTo(price * 1.0001, 2),
          high24h,
          low24h,
          volume24h,
          quoteVolume24h: parseFloat(t.quoteVolume || '0'),
          priceChange24h,
          priceChangePercent24h,
          timestamp: Date.now(),
          source: 'binance_live',
        };
        this.callbacks.onTick(tick);
      }

      // Process historical klines
      if (klinesRes.status === 'fulfilled' && klinesRes.value.ok) {
        const rawKlines: any[][] = await klinesRes.value.json();
        historicalCandles = rawKlines.map((k) => ({
          time: Math.floor(k[0] / 1000),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));

        if (historicalCandles.length > 0) {
          historicalCandles.sort((a, b) => a.time - b.time);
          this.currentCandle = historicalCandles[historicalCandles.length - 1];
        }
      }

      // Process depth snapshot
      if (depthRes.status === 'fulfilled' && depthRes.value.ok) {
        const d = await depthRes.value.json();
        this.processDepthSnapshot(d.bids, d.asks);
      }
    } catch (e) {
      console.warn('REST bootstrap encountered network issue, using initial synthetic seed:', e);
      historicalCandles = this.generateSyntheticHistory();
    }

    if (historicalCandles.length === 0) {
      historicalCandles = this.generateSyntheticHistory();
    }

    // Sort ascending by timestamp and emit the full history
    historicalCandles.sort((a, b) => a.time - b.time);
    this.currentCandle = historicalCandles[historicalCandles.length - 1];
    this.currentPrice = this.currentCandle.close;
    this.callbacks.onHistoricalCandles(historicalCandles);

    return historicalCandles;
  }

  /**
   * Connect to Binance combined WebSocket stream
   */
  private connectWebSocket() {
    if (this.isDestroyed) return;
    const binanceTf = mapTimeframeToBinance(this.timeframe);

    // Multi-stream endpoint: ticker, 100ms depth, kline, trade
    const streamNames = [
      `solusdt@ticker`,
      `solusdt@kline_${binanceTf}`,
      `solusdt@depth20@100ms`,
      `solusdt@trade`,
    ].join('/');

    const wsUrl = `wss://stream.binance.com:9443/ws/${streamNames}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.status = 'live';
        this.reconnectAttempts = 0;
        this.lastMessageTime = Date.now();
        this.callbacks.onStatusChange('live', 35);
        if (this.fallbackInterval) {
          clearInterval(this.fallbackInterval);
          this.fallbackInterval = null;
        }
      };

      this.ws.onmessage = (event) => {
        this.lastMessageTime = Date.now();
        try {
          const data = JSON.parse(event.data);
          this.handleStreamMessage(data);
        } catch (_) {}
      };

      this.ws.onerror = () => {
        // Handle error and switch to fallback if needed
        this.handleDisconnect();
      };

      this.ws.onclose = () => {
        this.handleDisconnect();
      };
    } catch (err) {
      this.handleDisconnect();
    }
  }

  private handleStreamMessage(msg: any) {
    const eventType = msg.e;

    // 24hr Ticker update
    if (eventType === '24hrTicker') {
      const price = parseFloat(msg.c);
      const bid = parseFloat(msg.b);
      const ask = parseFloat(msg.a);
      const high = parseFloat(msg.h);
      const low = parseFloat(msg.l);
      const vol = parseFloat(msg.v);
      const change = parseFloat(msg.p);
      const changePct = parseFloat(msg.P);

      this.currentPrice = price;
      this.currentHigh = high;
      this.currentLow = low;

      const tick: MarketTick = {
        symbol: 'SOL/USDT',
        price,
        bidPrice: bid || roundTo(price * 0.9999, 2),
        askPrice: ask || roundTo(price * 1.0001, 2),
        high24h: high,
        low24h: low,
        volume24h: vol,
        quoteVolume24h: parseFloat(msg.q || '0'),
        priceChange24h: change,
        priceChangePercent24h: changePct,
        timestamp: msg.E || Date.now(),
        source: 'binance_live',
      };
      this.callbacks.onTick(tick);
    }
    // Candlestick update
    else if (eventType === 'kline') {
      const k = msg.k;
      const candle: Candle = {
        time: Math.floor(k.t / 1000),
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v),
      };
      this.currentCandle = candle;
      this.callbacks.onCandle(candle, k.x);
    }
    // Depth update
    else if (msg.bids && msg.asks) {
      this.processDepthSnapshot(msg.bids, msg.asks);
    }
    // Recent Trade update
    else if (eventType === 'trade') {
      const trade: RecentTrade = {
        id: String(msg.t),
        price: parseFloat(msg.p),
        quantity: parseFloat(msg.q),
        side: msg.m ? 'sell' : 'buy', // m is true if buyer was market maker
        time: msg.T,
      };
      this.callbacks.onTrade(trade);
    }
  }

  private processDepthSnapshot(rawBids: any[], rawAsks: any[]) {
    let bidTotal = 0;
    const bids = rawBids.slice(0, 10).map((b) => {
      const price = parseFloat(b[0]);
      const quantity = parseFloat(b[1]);
      bidTotal += quantity;
      return { price, quantity, total: roundTo(bidTotal, 3) };
    });

    let askTotal = 0;
    const asks = rawAsks.slice(0, 10).map((a) => {
      const price = parseFloat(a[0]);
      const quantity = parseFloat(a[1]);
      askTotal += quantity;
      return { price, quantity, total: roundTo(askTotal, 3) };
    });

    const bestBid = bids[0]?.price || this.currentPrice;
    const bestAsk = asks[0]?.price || this.currentPrice + 0.02;
    const spread = roundTo(bestAsk - bestBid, 2);
    const spreadPercent = roundTo((spread / bestBid) * 100, 3);

    this.callbacks.onOrderBook({
      bids,
      asks,
      spread,
      spreadPercent,
      lastUpdated: Date.now(),
    });
  }

  private handleDisconnect() {
    if (this.isDestroyed) return;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.status = 'reconnecting';
      this.callbacks.onStatusChange('reconnecting');
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 8000);
      this.reconnectTimer = setTimeout(() => {
        this.connectWebSocket();
      }, delay);
    } else {
      // Switch gracefully to high-fidelity simulated fallback feed
      this.startSimulatedFeed();
    }
  }

  public reconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
    }
    this.reconnectAttempts = 0;
    this.connectWebSocket();
  }

  /**
   * Watchdog timer to detect frozen/silent connections
   */
  private startWatchdog() {
    this.pingTimer = setInterval(() => {
      if (this.status === 'live' && Date.now() - this.lastMessageTime > 8000) {
        this.callbacks.onStatusChange('stale');
        this.reconnect();
      }
    }, 4000);
  }

  /**
   * Realistic simulated feed in case user is offline or Binance WS is restricted
   */
  private startSimulatedFeed() {
    if (this.fallbackInterval) return;
    this.status = 'simulated';
    this.callbacks.onStatusChange('simulated', 12);

    this.fallbackInterval = setInterval(() => {
      if (this.isDestroyed) return;

      // Random micro-oscillation (-0.15% to +0.15%)
      const deltaPercent = (Math.random() - 0.495) * 0.0012;
      const newPrice = roundTo(this.currentPrice * (1 + deltaPercent), 2);
      this.currentPrice = newPrice;
      this.currentHigh = Math.max(this.currentHigh, newPrice);
      this.currentLow = Math.min(this.currentLow, newPrice);

      const bidPrice = roundTo(newPrice - 0.01 - Math.random() * 0.02, 2);
      const askPrice = roundTo(newPrice + 0.01 + Math.random() * 0.02, 2);

      const tick: MarketTick = {
        symbol: 'SOL/USDT',
        price: newPrice,
        bidPrice,
        askPrice,
        high24h: this.currentHigh,
        low24h: this.currentLow,
        volume24h: roundTo(this.currentVolume + Math.random() * 50, 1),
        quoteVolume24h: roundTo(this.currentVolume * newPrice, 1),
        priceChange24h: roundTo(newPrice - 180.0, 2),
        priceChangePercent24h: roundTo(((newPrice - 180.0) / 180.0) * 100, 2),
        timestamp: Date.now(),
        source: 'simulated_fallback',
      };
      this.callbacks.onTick(tick);

      // Emit simulated trade
      const tradeSide = Math.random() > 0.5 ? 'buy' : 'sell';
      this.callbacks.onTrade({
        id: `sim-t-${Date.now()}`,
        price: newPrice,
        quantity: roundTo(0.1 + Math.random() * 15, 2),
        side: tradeSide,
        time: Date.now(),
      });

      // Update current candle
      const nowSec = Math.floor(Date.now() / 1000);
      const candleIntervalSec = this.getTimeframeSeconds();
      const bucketTime = Math.floor(nowSec / candleIntervalSec) * candleIntervalSec;

      if (!this.currentCandle || this.currentCandle.time !== bucketTime) {
        this.currentCandle = {
          time: bucketTime,
          open: newPrice,
          high: newPrice,
          low: newPrice,
          close: newPrice,
          volume: roundTo(1 + Math.random() * 5, 2),
        };
        this.callbacks.onCandle(this.currentCandle, false);
      } else {
        this.currentCandle = {
          ...this.currentCandle,
          high: Math.max(this.currentCandle.high, newPrice),
          low: Math.min(this.currentCandle.low, newPrice),
          close: newPrice,
          volume: roundTo(this.currentCandle.volume + Math.random() * 2, 2),
        };
        this.callbacks.onCandle(this.currentCandle, false);
      }

      // Generate synthetic depth
      this.generateSyntheticOrderBook(newPrice);
    }, 400);
  }

  private generateSyntheticOrderBook(centerPrice: number) {
    const bids: any[] = [];
    const asks: any[] = [];
    let bidTot = 0;
    let askTot = 0;

    for (let i = 1; i <= 10; i++) {
      const bPrice = roundTo(centerPrice - i * 0.02, 2);
      const bQty = roundTo(1 + Math.random() * 25, 2);
      bidTot += bQty;
      bids.push({ price: bPrice, quantity: bQty, total: roundTo(bidTot, 3) });

      const aPrice = roundTo(centerPrice + i * 0.02, 2);
      const aQty = roundTo(1 + Math.random() * 25, 2);
      askTot += aQty;
      asks.push({ price: aPrice, quantity: aQty, total: roundTo(askTot, 3) });
    }

    const spread = roundTo(asks[0].price - bids[0].price, 2);
    this.callbacks.onOrderBook({
      bids,
      asks,
      spread,
      spreadPercent: roundTo((spread / centerPrice) * 100, 3),
      lastUpdated: Date.now(),
    });
  }

  private getTimeframeSeconds(): number {
    switch (this.timeframe) {
      case '1m': return 60;
      case '3m': return 180;
      case '5m': return 300;
      case '15m': return 900;
      case '30m': return 1800;
      case '1h': return 3600;
      case '4h': return 14400;
      case '1d': return 86400;
      default: return 60;
    }
  }

  private generateSyntheticHistory(): Candle[] {
    const candles: Candle[] = [];
    const nowSec = Math.floor(Date.now() / 1000);
    const stepSec = this.getTimeframeSeconds();
    const alignedNowSec = Math.floor(nowSec / stepSec) * stepSec;
    let price = this.currentPrice || 184.50;

    for (let i = 120; i >= 0; i--) {
      const time = alignedNowSec - i * stepSec;
      const change = (Math.random() - 0.49) * 1.5;
      const open = price;
      const close = roundTo(open + change, 2);
      const high = roundTo(Math.max(open, close) + Math.random() * 0.8, 2);
      const low = roundTo(Math.min(open, close) - Math.random() * 0.8, 2);
      const volume = roundTo(50 + Math.random() * 400, 1);
      price = close;
      candles.push({ time, open, high, low, close, volume });
    }
    this.currentPrice = price;
    return candles;
  }
}
