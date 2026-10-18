/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AccountState } from '../../types/trading';
import { formatPercent, formatUSDT } from '../../engine/decimal';
import { X, RotateCcw, Award, TrendingUp, DollarSign, BarChart2 } from 'lucide-react';

interface AccountModalProps {
  account: AccountState;
  isOpen: boolean;
  onClose: () => void;
  onReset: (newBalance: number) => void;
}

export function AccountModal({
  account,
  isOpen,
  onClose,
  onReset,
}: AccountModalProps) {
  const [resetConfirm, setResetConfirm] = useState(false);
  const [targetBalance, setTargetBalance] = useState(10000);

  if (!isOpen) return null;

  // Compute analytics
  const closedFills = account.tradeHistory.filter((f) => f.realizedPnL !== 0);
  const totalTrades = closedFills.length;
  const winningTrades = closedFills.filter((f) => f.realizedPnL > 0);
  const losingTrades = closedFills.filter((f) => f.realizedPnL < 0);
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;

  const bestTrade = closedFills.reduce((max, f) => Math.max(max, f.realizedPnL), 0);
  const worstTrade = closedFills.reduce((min, f) => Math.min(min, f.realizedPnL), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#10141d] border border-[#232a38] rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c2331]">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-[#38bdf8]" />
            <h3 className="font-bold text-sm text-[#f1f5f9]">Demo Account Analytics</h3>
          </div>
          <button onClick={onClose} className="text-[#64748b] hover:text-[#d1d4dc] p-1">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar text-xs">
          {/* Equity Overview Card */}
          <div className="bg-[#151c27] p-3.5 rounded-xl border border-[#222c3d] space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-[#848e9c]">Account Equity</span>
              <span className="text-xl font-black font-mono-num text-[#38bdf8]">
                {formatUSDT(account.accountEquity)} USDT
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1e2736] font-mono-num text-[11px]">
              <div>
                <span className="text-[#64748b] block">Wallet Balance:</span>
                <span className="text-[#d1d4dc] font-semibold">{formatUSDT(account.walletBalance)} USDT</span>
              </div>
              <div>
                <span className="text-[#64748b] block">Free Margin:</span>
                <span className="text-[#0ecb81] font-semibold">{formatUSDT(account.availableBalance)} USDT</span>
              </div>
              <div>
                <span className="text-[#64748b] block">Unrealized PnL:</span>
                <span className={`font-semibold ${account.totalUnrealizedPnL >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {account.totalUnrealizedPnL >= 0 ? '+' : ''}{formatUSDT(account.totalUnrealizedPnL)} USDT
                </span>
              </div>
              <div>
                <span className="text-[#64748b] block">Realized PnL:</span>
                <span className={`font-semibold ${account.totalRealizedPnL >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {account.totalRealizedPnL >= 0 ? '+' : ''}{formatUSDT(account.totalRealizedPnL)} USDT
                </span>
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#131822] p-2.5 rounded-lg border border-[#1e2533]">
              <span className="text-[#848e9c] text-[10px] block">Win Rate</span>
              <span className="text-sm font-bold font-mono-num text-[#f0b90b]">
                {formatPercent(winRate, 1, false)}
              </span>
              <span className="text-[10px] text-[#64748b] block mt-0.5">
                {winningTrades.length}W / {losingTrades.length}L
              </span>
            </div>

            <div className="bg-[#131822] p-2.5 rounded-lg border border-[#1e2533]">
              <span className="text-[#848e9c] text-[10px] block">Total Trades</span>
              <span className="text-sm font-bold font-mono-num text-[#f1f5f9]">
                {totalTrades}
              </span>
              <span className="text-[10px] text-[#64748b] block mt-0.5">
                Closed fills
              </span>
            </div>

            <div className="bg-[#131822] p-2.5 rounded-lg border border-[#1e2533]">
              <span className="text-[#848e9c] text-[10px] block">Best Trade</span>
              <span className="text-xs font-bold font-mono-num text-[#0ecb81]">
                +{formatUSDT(bestTrade)} USDT
              </span>
            </div>

            <div className="bg-[#131822] p-2.5 rounded-lg border border-[#1e2533]">
              <span className="text-[#848e9c] text-[10px] block">Worst Trade</span>
              <span className="text-xs font-bold font-mono-num text-[#f6465d]">
                {formatUSDT(worstTrade)} USDT
              </span>
            </div>

            <div className="bg-[#131822] p-2.5 rounded-lg border border-[#1e2533]">
              <span className="text-[#848e9c] text-[10px] block">Total Fees Paid</span>
              <span className="text-xs font-semibold font-mono-num text-[#848e9c]">
                {formatUSDT(account.totalFeesPaid)} USDT
              </span>
            </div>

            <div className="bg-[#131822] p-2.5 rounded-lg border border-[#1e2533]">
              <span className="text-[#848e9c] text-[10px] block">Funding Paid</span>
              <span className="text-xs font-semibold font-mono-num text-[#848e9c]">
                {formatUSDT(account.totalFundingPaid)} USDT
              </span>
            </div>
          </div>

          {/* Reset Demo Balance Section */}
          <div className="pt-2 border-t border-[#1e2533] space-y-2">
            <div className="font-semibold text-xs text-[#f1f5f9] flex items-center gap-1.5">
              <RotateCcw size={13} className="text-[#f59e0b]" /> Reset Virtual Demo Balance
            </div>

            {!resetConfirm ? (
              <div className="space-y-2">
                <div className="text-[11px] text-[#848e9c]">
                  Select initial virtual starting funds:
                </div>
                <div className="grid grid-cols-4 gap-1.5 font-mono-num">
                  {[2000, 5000, 10000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTargetBalance(amt)}
                      className={`py-1.5 rounded text-xs font-semibold transition-colors ${
                        targetBalance === amt
                          ? 'bg-[#38bdf8] text-[#090c10]'
                          : 'bg-[#151b26] text-[#848e9c] hover:bg-[#1f2838] hover:text-[#d1d4dc]'
                      }`}
                    >
                      ${(amt / 1000)}k
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setResetConfirm(true)}
                  className="w-full py-2 bg-[#2a1b1b] border border-[#ef4444]/40 text-[#f87171] hover:bg-[#ef4444] hover:text-white rounded-lg text-xs font-bold transition-colors mt-1"
                >
                  Reset Account State
                </button>
              </div>
            ) : (
              <div className="p-3 bg-[#261214] border border-[#ef4444]/50 rounded-lg space-y-2.5">
                <p className="text-xs text-[#fca5a5] font-medium leading-relaxed">
                  Are you sure? This will clear all open positions, cancel open orders, and reset demo equity to ${targetBalance.toLocaleString()} USDT.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setResetConfirm(false)}
                    className="flex-1 py-1.5 bg-[#18202d] text-xs font-semibold text-[#848e9c] rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onReset(targetBalance);
                      setResetConfirm(false);
                      onClose();
                    }}
                    className="flex-1 py-1.5 bg-[#ef4444] text-xs font-bold text-white rounded-md hover:bg-[#dc2626]"
                  >
                    Yes, Reset Demo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
