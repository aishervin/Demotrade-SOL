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
  Calculator,
  Wallet,
  Zap,
} from 'lucide-react';

interface HeaderProps {
  tick: MarketTick;
  connectionStatus: ConnectionStatus;
  latencyMs: number;
  walletBalance: number;
  accountEquity: number;
  leverage: number;
  onOpenLeverageModal?: () => void;
  language: 'en' | 'fa';
  onToggleLanguage: () => void;
  onOpenAccountModal: () => void;
}

export function Header({
  tick,
  connectionStatus,
  latencyMs,
  accountEquity,
  leverage,
  onOpenLeverageModal,
  language,
  onToggleLanguage,
  onOpenAccountModal,
}: HeaderProps) {
  const isUp = tick.priceChangePercent24h >= 0;

  return (
    <header className="bg-[#080808] border-b border-[#1c1c1c] select-none text-white font-sans sticky top-0 z-40">
      {/* Single Ultra-Compact Pro Header Bar (~40px) */}
      <div className="flex items-center justify-between px-2.5 sm:px-3 h-10 sm:h-11">
        {/* Left: Solana Icon + SOL/USDT Perpetual + 75x Leverage Quick Tag */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Solana stylized icon */}
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded flex flex-col justify-center gap-0.5 shrink-0">
            <div className="h-0.5 sm:h-1 w-full bg-gradient-to-r from-[#9945FF] to-[#14F195] rounded-full" />
            <div className="h-0.5 sm:h-1 w-3/4 bg-gradient-to-r from-[#14F195] to-[#9945FF] rounded-full" />
            <div className="h-0.5 sm:h-1 w-full bg-gradient-to-r from-[#9945FF] to-[#14F195] rounded-full" />
          </div>

          {/* Symbol */}
          <div className="flex items-baseline gap-1 cursor-pointer" onClick={onOpenAccountModal}>
            <span className="text-sm sm:text-base font-black tracking-tight text-white font-mono-num">
              SOL<span className="text-[#888] text-[11px] sm:text-xs font-normal">/USDT</span>
            </span>
            <span className="text-[9px] font-bold px-1 py-0.2 bg-[#181818] text-[#0ecb81] rounded border border-[#2a2a2a] uppercase hidden xs:inline">
              Perp
            </span>
          </div>

          {/* Quick Leverage Pill */}
          <button
            type="button"
            onClick={onOpenLeverageModal}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#1c1c1c] hover:bg-[#282828] text-[#f0b90b] text-[10px] font-extrabold border border-[#333] transition-colors cursor-pointer"
            title="Adjust Leverage"
          >
            <Zap size={10} className="fill-[#f0b90b] text-[#f0b90b]" />
            <span>{leverage}x</span>
          </button>
        </div>

        {/* Right: Live Price, Equity, Calculator & Language */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Quick Equity Display */}
          <button
            type="button"
            onClick={onOpenAccountModal}
            className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded bg-[#121212] hover:bg-[#1a1a1a] border border-[#222] text-[11px] font-mono-num transition-colors cursor-pointer"
            title="Account Equity & Settings"
          >
            <Wallet size={12} className="text-[#888]" />
            <span className="font-bold text-white text-[11px] sm:text-xs">
              {formatUSDT(accountEquity)}
            </span>
            <span className="text-[9px] text-[#777] hidden sm:inline">USDT</span>
          </button>

          {/* Calculator modal button */}
          <button
            type="button"
            onClick={onOpenAccountModal}
            className="p-1 sm:p-1.5 text-[#888] hover:text-white hover:bg-[#1c1c1c] rounded transition-colors"
            title="Calculator & Risk Analysis"
          >
            <Calculator size={14} className="sm:w-4 sm:h-4" />
          </button>

          {/* Language Toggle */}
          <button
            type="button"
            onClick={onToggleLanguage}
            className="px-1.5 py-0.5 rounded bg-[#161616] hover:bg-[#222] text-[#888] hover:text-white text-[10px] font-bold border border-[#262626] transition-colors"
            title="Change Language"
          >
            {language === 'en' ? 'FA' : 'EN'}
          </button>

          {/* Ping indicator */}
          <div className="flex items-center gap-1 pl-0.5" title={`Latency: ${latencyMs}ms (${connectionStatus})`}>
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connectionStatus === 'live'
                  ? 'bg-[#0ecb81]'
                  : connectionStatus === 'simulated'
                  ? 'bg-[#38bdf8]'
                  : 'bg-[#f0b90b]'
              }`}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
