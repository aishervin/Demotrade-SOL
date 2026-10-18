/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Translations {
  symbol: string;
  demoBadge: string;
  demoNotice: string;
  perpetual: string;
  isolated: string;
  cross: string;
  leverage: string;
  open: string;
  close: string;
  openLong: string;
  openShort: string;
  marketOrder: string;
  limitOrder: string;
  stopMarket: string;
  trailingStop: string;
  orderPrice: string;
  triggerPrice: string;
  quantity: string;
  available: string;
  cost: string;
  estLiqPrice: string;
  estOpeningFee: string;
  estClosingFee: string;
  unrealizedPnL: string;
  realizedPnL: string;
  roe: string;
  entryPrice: string;
  markPrice: string;
  size: string;
  notional: string;
  margin: string;
  takeProfit: string;
  stopLoss: string;
  tpSl: string;
  positions: string;
  openOrders: string;
  orderHistory: string;
  tradeHistory: string;
  fundingHistory: string;
  ledger: string;
  closePosition: string;
  closeAll: string;
  adjustMargin: string;
  sharePnL: string;
  reversePosition: string;
  orderBook: string;
  recentTrades: string;
  asOfNow: string;
  high24h: string;
  low24h: string;
  vol24h: string;
  fundingRate: string;
  countdown: string;
  resetDemo: string;
  resetConfirm: string;
  cancel: string;
  confirm: string;
  statusLive: string;
  statusReconnecting: string;
  statusSimulated: string;
  riskWarning75x: string;
  safetyDisclaimer: string;
  winRate: string;
  totalTrades: string;
  totalEquity: string;
  walletBalance: string;
  freeMargin: string;
}

export const translations: Record<'en' | 'fa', Translations> = {
  en: {
    symbol: 'SOL/USDT',
    demoBadge: 'DEMO / PAPER',
    demoNotice: 'Simulated Funds Only · No Real Crypto',
    perpetual: 'Perpetual',
    isolated: 'Isolated',
    cross: 'Cross',
    leverage: 'Leverage',
    open: 'Open',
    close: 'Close',
    openLong: 'Open Long',
    openShort: 'Open Short',
    marketOrder: 'Market',
    limitOrder: 'Limit',
    stopMarket: 'Stop Market',
    trailingStop: 'Trailing Stop',
    orderPrice: 'Order Price',
    triggerPrice: 'Trigger Price',
    quantity: 'Quantity',
    available: 'Available',
    cost: 'Cost (Margin)',
    estLiqPrice: 'Est. Liq Price',
    estOpeningFee: 'Est. Open Fee',
    estClosingFee: 'Est. Close Fee',
    unrealizedPnL: 'Unrealized PnL',
    realizedPnL: 'Realized PnL',
    roe: 'ROE',
    entryPrice: 'Entry Price',
    markPrice: 'Mark Price',
    size: 'Size',
    notional: 'Notional',
    margin: 'Margin',
    takeProfit: 'Take Profit',
    stopLoss: 'Stop Loss',
    tpSl: 'TP / SL',
    positions: 'Positions',
    openOrders: 'Open Orders',
    orderHistory: 'Order History',
    tradeHistory: 'Trade History',
    fundingHistory: 'Funding History',
    ledger: 'Ledger',
    closePosition: 'Close',
    closeAll: 'Close All',
    adjustMargin: 'Adjust Margin',
    sharePnL: 'Share PnL',
    reversePosition: 'Reverse',
    orderBook: 'Order Book',
    recentTrades: 'Trades',
    asOfNow: 'Live',
    high24h: '24h High',
    low24h: '24h Low',
    vol24h: '24h Vol(SOL)',
    fundingRate: 'Funding Rate',
    countdown: 'Countdown',
    resetDemo: 'Reset Account',
    resetConfirm: 'Reset Demo Account to $10,000 USDT?',
    cancel: 'Cancel',
    confirm: 'Confirm',
    statusLive: 'LIVE FEED',
    statusReconnecting: 'RECONNECTING',
    statusSimulated: 'SIMULATED FEED',
    riskWarning75x: 'High Leverage Warning: At 75x leverage, a ~1.3% adverse market move will cause liquidation.',
    safetyDisclaimer: 'This platform operates exclusively with virtual demo paper money. No real cryptocurrency or exchange orders are ever submitted.',
    winRate: 'Win Rate',
    totalTrades: 'Total Trades',
    totalEquity: 'Total Equity',
    walletBalance: 'Wallet Balance',
    freeMargin: 'Available Margin',
  },
  fa: {
    symbol: 'SOL/USDT',
    demoBadge: 'حساب دمو / آزمایشی',
    demoNotice: 'موجودی شبیه‌سازی شده · بدون دارایی واقعی',
    perpetual: 'فیوچرز دائمی',
    isolated: 'ایزوله (Isolated)',
    cross: 'کراس (Cross)',
    leverage: 'اهرم (Leverage)',
    open: 'باز کردن',
    close: 'بستن',
    openLong: 'لانگ (خرید)',
    openShort: 'شورت (فروش)',
    marketOrder: 'مارکت (آنی)',
    limitOrder: 'لیمیت (شرطی)',
    stopMarket: 'استاپ مارکت',
    trailingStop: 'تریلینگ استاپ',
    orderPrice: 'قیمت سفارش',
    triggerPrice: 'قیمت فعال‌سازی',
    quantity: 'مقدار (حجم)',
    available: 'موجودی آزاد',
    cost: 'مارجین اولیه',
    estLiqPrice: 'قیمت تخمینی لیکوئید',
    estOpeningFee: 'کارمزد ورود',
    estClosingFee: 'کارمزد خروج',
    unrealizedPnL: 'سود/زیان باز',
    realizedPnL: 'سود/زیان محقق شده',
    roe: 'بازدهی (ROE)',
    entryPrice: 'قیمت ورود',
    markPrice: 'قیمت مارک',
    size: 'حجم موقعیت',
    notional: 'ارزش دلاری',
    margin: 'مارجین',
    takeProfit: 'حد سود (TP)',
    stopLoss: 'حد ضرر (SL)',
    tpSl: 'حد سود / ضرر',
    positions: 'پوزیشن‌ها',
    openOrders: 'سفارش‌های باز',
    orderHistory: 'تاریخچه سفارشات',
    tradeHistory: 'معاملات انجام‌شده',
    fundingHistory: 'تاریخچه فاندینگ',
    ledger: 'دفتر کل حساب',
    closePosition: 'بستن پوزیشن',
    closeAll: 'بستن همه',
    adjustMargin: 'تعدیل مارجین',
    sharePnL: 'کارت اشتراک سود',
    reversePosition: 'معکوس کردن',
    orderBook: 'دفتر سفارشات (اوردر بوک)',
    recentTrades: 'معاملات زنده',
    asOfNow: 'زنده',
    high24h: 'بیشترین ۲۴س',
    low24h: 'کمترین ۲۴س',
    vol24h: 'حجم ۲۴س (SOL)',
    fundingRate: 'نرخ فاندینگ',
    countdown: 'شمارش معکوس',
    resetDemo: 'بازنشانی حساب',
    resetConfirm: 'آیا می‌خواهید موجودی دمو به ۱۰,۰۰۰ تتر بازنشانی شود؟',
    cancel: 'انصراف',
    confirm: 'تایید',
    statusLive: 'دیتا زنده صرافی',
    statusReconnecting: 'در حال اتصال مجدد',
    statusSimulated: 'دیتا شبیه‌سازی‌شده',
    riskWarning75x: 'هشدار ریسک: در اهرم ۷۵ برابری، تغییر ۱.۳٪ خلاف جهت منجر به لیکوئید شدن می‌شود.',
    safetyDisclaimer: 'این سامانه صرفاً آزمایشی و با تتر مجازی کار می‌کند. هیچ سفارشی به بازار واقعی ارسال نمی‌شود.',
    winRate: 'نرخ برد',
    totalTrades: 'کل معاملات',
    totalEquity: 'دارایی کل',
    walletBalance: 'موجودی کیف پول',
    freeMargin: 'مارجین در دسترس',
  },
};
