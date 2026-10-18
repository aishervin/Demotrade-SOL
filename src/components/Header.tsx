/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MarketTick } from '../types/trading';
import { ConnectionStatus } from '../services/marketData';
import { formatPrice, formatUSDT } from '../engine/decimal';
import {
  ChevronDown,
  BarChart2,
  Calculator,
  MoreHorizontal,
  Wallet,
  RotateCcw,
} from 'lucide-react';

interface HeaderProps {
  tick: MarketTick;
  connectionStatus: ConnectionStatus;
  latencyMs: number;
  walletBalance: number;
  accountEquity: number;
  isChartVisible: boolean;
  onToggleChart: () => void;
  language: 'en' | 'fa';
  onToggleLanguage: () => void;
  onOpenAccountModal: () => void;
}

export function Header({
  tick,
  connectionStatus,
  latencyMs,
  walletBalance,
  accountEquity,
  isChartVisible,
  onToggleChart,
  language,
  onToggleLanguage,
  onOpenAccountModal,
}: HeaderProps) {
  const isUp = tick.priceChangePercent24h >= 0;

  return (
    <header className="flex flex-col bg-black border-b border-[#1c1c1c] select-none text-white font-sans sticky top-0 z-40">
      {/* Top Demo indicator bar */}
      <div className="flex items-center justify-between px-3 py-0.5 bg-[#0d0d0d] border-b border-[#1a1a1a] text-[10px] text-[#888]">
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.2 bg-[#f0b90b]/20 text-[#f0b90b] font-bold rounded text-[9px]">
            DEMO TRADING
          </span>
          <span className="hidden sm:inline text-[#666]">
            Simulated Paper Funds Only
          </span>
        </div>

        {/* Live connection state */}
        <div className="flex items-center gap-2 font-mono-num text-[10px]">
          <span className="text-[#888]">
            Equity: <span className="text-white font-bold">{formatUSDT(accountEquity)}</span> USDT
          </span>
          <div className="flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connectionStatus === 'live'
                  ? 'bg-[#0ecb81] animate-ping'
                  : connectionStatus === 'simulated'
                  ? 'bg-[#38bdf8]'
                  : 'bg-[#f0b90b]'
              }`}
            />
            <span className={connectionStatus === 'live' ? 'text-[#0ecb81]' : 'text-[#888]'}>
              {connectionStatus === 'live' ? `${latencyMs}ms` : connectionStatus.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Main KCEX Top Bar */}
      <div className="flex items-center justify-between px-3 py-2.5">
        {/* Left: Solana Icon + SOL/USDT ▼ */}
        <div className="flex items-center gap-2 cursor-pointer">
          {/* Solana stylized icon */}
          <div className="w-5 h-5 rounded-md flex flex-col justify-center gap-0.5">
            <div className="h-1 w-full bg-gradient-to-r from-[#9945FF] to-[#14F195] rounded-full" />
            <div className="h-1 w-3/4 bg-gradient-to-r from-[#14F195] to-[#9945FF] rounded-full" />
            <div className="h-1 w-full bg-gradient-to-r from-[#9945FF] to-[#14F195] rounded-full" />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-base font-extrabold tracking-tight text-white">
              SOL<span className="text-[#999] text-sm">/USDT</span>
            </span>
            <ChevronDown size={14} className="text-[#888]" />
          </div>
        </div>

        {/* Right action icons (KCEX style: Candlestick chart icon 中, calculator +/-, menu ...) */}
        <div className="flex items-center gap-3">
          {/* Candlestick Chart toggle icon (The KCEX 中 icon) */}
          <button
            type="button"
            onClick={onToggleChart}
            className={`p-1.5 rounded-md transition-colors ${
              isChartVisible ? 'bg-[#222] text-[#38bdf8]' : 'text-[#aaa] hover:text-white hover:bg-[#1a1a1a]'
            }`}
            title="Toggle Chart / نمایش یا بستن نمودار"
          >
            <div className="flex items-center gap-0.5 h-4 px-0.5">
              <div className="w-1 h-3 bg-current rounded-2xs" />
              <div className="w-1 h-4 bg-current rounded-2xs" />
            </div>
          </button>

          {/* Calculator / Demo Account modal */}
          <button
            type="button"
            onClick={onOpenAccountModal}
            className="p-1.5 text-[#aaa] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-colors"
            title="Account & Risk Analytics"
          >
            <Calculator size={17} />
          </button>

          {/* Language Toggle */}
          <button
            type="button"
            onClick={onToggleLanguage}
            className="px-1.5 py-0.5 text-[11px] font-bold text-[#aaa] hover:text-white bg-[#181818] rounded border border-[#262626] transition-colors"
            title="Change Language"
          >
            {language === 'en' ? 'FA' : 'EN'}
          </button>

          {/* More options / Reset */}
          <button
            type="button"
            onClick={onOpenAccountModal}
            className="p-1.5 text-[#aaa] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-colors"
            title="Settings & Reset"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
