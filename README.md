# ApexFutures — Production-Quality SOL/USDT Futures Demo Platform

A high-performance, mobile-first cryptocurrency futures paper-trading web application inspired by professional crypto exchange ergonomics (KCEX & Binance Futures), engineered for simulated leveraged trading with zero financial risk.

## 🌟 Key Features

- **Primary Market**: SOL/USDT Perpetual Contract.
- **Default Leverage**: 75x (Configurable from 1x to 75x with interactive slider, quick presets, and real-time liquidation sensitivity warnings).
- **Default Margin Mode**: Isolated Margin (with one-click toggle to Cross Margin and explanatory modal).
- **Live Market Data Adapter**:
  - Real-time Binance WebSocket stream (`solusdt@ticker`, `solusdt@kline_1m`, `solusdt@depth20@100ms`, `solusdt@trade`).
  - Automatic REST bootstrap for instant loading of historical candles and 24h market stats.
  - Heartbeat watchdog with automatic reconnection backoff.
  - Seamless simulated fallback feed if offline or in region-restricted environments.
  - Visible live status indicators (`LIVE [ms]`, `RECONNECTING`, `SIMULATED FEED`).
- **Interactive Candlestick Chart (TradingView Lightweight Charts)**:
  - Timeframes: `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`.
  - Indicators: EMA (9, 21), Bollinger Bands (20, 2), Volume histogram.
  - Visual position lines drawn directly on the chart:
    - Average Entry Price line
    - Estimated Liquidation Price line (Orange dashed)
    - Take-Profit line (Green dotted)
    - Stop-Loss line (Red dotted)
  - Fullscreen toggle, pan, zoom, and crosshair.
- **High-Density Order Book & Trades**:
  - Live Asks (Red) and Bids (Green) with horizontal cumulative depth bars.
  - Real-time spread display and last traded price.
  - Precision selector (0.01, 0.1, 1.0).
  - Recent live trades stream with side-by-side timestamps.
- **Order Types & Execution Engine**:
  - **Market**: Instant fill at best executable price with realistic micro-slippage.
  - **Limit**: Pending order queue matched on live price ticks.
  - **Stop-Market / Trigger**: Triggers market order when mark price crosses trigger price.
  - **Trailing Stop**: Tracks favorable peak price and triggers order after callback % retracement.
  - **Take-Profit & Stop-Loss (TP/SL)**: Inline when placing orders or editable on open positions.
  - **Reduce-Only & Post-Only** support.
- **Position & Risk Management**:
  - Live unrealized PnL and ROE % updated on every tick without UI lag.
  - Market Close and Partial Close (25%, 50%, 75%, 100%).
  - Adjust Isolated Margin (Add or Remove collateral with live liquidation preview).
  - Position Reversal (instantly flips Long to Short or vice versa).
  - PnL Share Card Generator (celebration confetti + high-res card for social sharing).
- **Funding Rate Simulation**:
  - 8-hour countdown timer to funding epochs.
  - Simulated funding payments (+0.0100%) applied to open positions.
  - "Settle Funding Now" button for instant simulation testing.
- **Account Ledger & Analytics**:
  - Comprehensive trade history, order history, and funding logs.
  - Double-entry balance ledger recording all deposits, margin reservations, fills, fees, and liquidations.
  - Analytics dashboard: Win Rate %, Profit Factor, Best/Worst Trade, Total Fees.
  - Demo Reset Modal: Reset virtual funds to $1k, $5k, $10k, or $50k USDT.
- **Mobile-First UX & Internationalization**:
  - Fully responsive on mobile, Android safe-areas, tablet, and desktop.
  - English and Persian (فارسی) localization with RTL support.
- **Persistence**:
  - Automatic localStorage / IndexedDB persistence preserves account state across reloads.

---

## 📐 Financial Calculation Engine

### 1. Notional Value
$$\text{Notional (USDT)} = \text{Quantity (SOL)} \times \text{Price (USDT)}$$

### 2. Initial Margin
$$\text{Initial Margin} = \frac{\text{Notional}}{\text{Leverage}}$$

### 3. Unrealized PnL & Return on Equity (ROE)
- **Long**: $\text{PnL} = \text{Quantity} \times (\text{MarkPrice} - \text{EntryPrice})$
- **Short**: $\text{PnL} = \text{Quantity} \times (\text{EntryPrice} - \text{MarkPrice})$
- **ROE %**: $\text{ROE} = \left(\frac{\text{Unrealized PnL}}{\text{Allocated Margin}}\right) \times 100$

### 4. Isolated Liquidation Price (Linear USDT Contract)
- **Long Liquidation**:
  $$\text{LiqPrice}_{\text{Long}} = \frac{\text{EntryPrice} \times \text{Size} - \text{IsolatedMargin} + \text{EstClosingFee}}{\text{Size} \times (1 - \text{MMR})}$$
- **Short Liquidation**:
  $$\text{LiqPrice}_{\text{Short}} = \frac{\text{EntryPrice} \times \text{Size} + \text{IsolatedMargin} - \text{EstClosingFee}}{\text{Size} \times (1 + \text{MMR})}$$
*(Where MMR is Tiered Maintenance Margin Rate: 0.5% base for SOL/USDT).*

---

## 🧪 Testing

Run the automated test suite:

```bash
npm test
```

Unit tests cover:
- Long and Short PnL formulas
- 1x, 10x, 50x, and 75x leverage margin requirements
- Liquidation price mathematical derivations
- Partial and full closes
- Average entry price recalculation on scaling into positions
- Stop-loss, Take-profit, and Trailing stop triggers on market ticks
- Limit order matching
- Funding settlements
- Available margin validation and reduce-only guards

---

## 🔒 Safety & Disclaimers

**DEMO PAPER TRADING ONLY**: This application is strictly an educational simulator utilizing virtual demo funds. It does not submit orders to real cryptocurrency exchanges, does not process real funds, and never asks for private keys or seed phrases.
