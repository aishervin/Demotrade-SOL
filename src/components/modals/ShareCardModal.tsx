/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Position } from '../../types/trading';
import { formatPercent, formatPrice, formatUSDT } from '../../engine/decimal';
import confetti from 'canvas-confetti';
import { X, Share2, Copy, Check, Flame } from 'lucide-react';

interface ShareCardModalProps {
  position: Position | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareCardModal({
  position,
  isOpen,
  onClose,
}: ShareCardModalProps) {
  useEffect(() => {
    if (isOpen && position && position.unrealizedPnL > 0) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  }, [isOpen, position]);

  if (!isOpen || !position) return null;

  const isProfit = position.unrealizedPnL >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#0f131c] border border-[#232a38] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1c2331]">
          <h3 className="font-bold text-xs text-[#848e9c] uppercase tracking-wider">
            Share Position Card
          </h3>
          <button onClick={onClose} className="text-[#64748b] hover:text-[#d1d4dc] p-1">
            <X size={18} />
          </button>
        </div>

        {/* Share Card Content */}
        <div className="p-4">
          <div
            id="pnl-share-card"
            className="relative overflow-hidden rounded-xl border border-[#263147] p-5 shadow-2xl bg-gradient-to-b from-[#131926] via-[#0b0e14] to-[#080b0f]"
          >
            {/* Background Watermark Glow */}
            <div
              className={`absolute -right-10 -bottom-10 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-20 ${
                isProfit ? 'bg-[#0ecb81]' : 'bg-[#f6465d]'
              }`}
            />

            {/* Brand & Market */}
            <div className="flex items-center justify-between relative z-10 pb-4 border-b border-[#1e2637]">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-[#f1f5f9] tracking-wide">
                    Apex<span className="text-[#38bdf8]">Futures</span>
                  </span>
                  <span className="px-1.5 py-0.2 bg-[#f0b90b]/15 text-[#f0b90b] text-[9px] font-bold rounded">
                    DEMO
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="font-bold text-xs text-[#d1d4dc]">SOL/USDT</span>
                  <span className="text-[10px] text-[#848e9c]">Perpetual</span>
                  <span className="px-1.5 py-0.2 bg-[#1e293b] text-[#38bdf8] text-[9px] font-semibold rounded">
                    {position.leverage}x {position.marginMode}
                  </span>
                </div>
              </div>
              <div
                className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                  position.side === 'long'
                    ? 'bg-[#0ecb81]/15 text-[#0ecb81] border border-[#0ecb81]/30'
                    : 'bg-[#f6465d]/15 text-[#f6465d] border border-[#f6465d]/30'
                }`}
              >
                {position.side}
              </div>
            </div>

            {/* Center ROE */}
            <div className="py-5 relative z-10 text-center">
              <div className="text-[11px] font-medium text-[#848e9c] uppercase tracking-wider mb-1">
                Return on Equity (ROE)
              </div>
              <div
                className={`text-4xl sm:text-5xl font-black font-mono-num tracking-tight ${
                  isProfit ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                }`}
              >
                {formatPercent(position.unrealizedPnLPercent, 2)}
              </div>
              <div className="font-mono-num text-xs font-semibold text-[#848e9c] mt-1">
                PnL: {position.unrealizedPnL >= 0 ? '+' : ''}
                {formatUSDT(position.unrealizedPnL)} USDT
              </div>
            </div>

            {/* Price Details */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#1e2637] relative z-10 text-xs font-mono-num">
              <div>
                <span className="text-[10px] text-[#64748b] block">Entry Price</span>
                <span className="text-[#d1d4dc] font-semibold">{formatPrice(position.entryPrice)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#64748b] block">Mark Price</span>
                <span className="text-[#38bdf8] font-semibold">{formatPrice(position.markPrice)}</span>
              </div>
            </div>

            {/* Card Footer Tag */}
            <div className="mt-4 pt-2 flex items-center justify-between text-[9px] text-[#64748b] border-t border-[#18202e]">
              <span>Paper Trading Terminal</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 p-3 border-t border-[#1c2331] bg-[#0c1017]">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(
                `ApexFutures SOL/USDT ${position.side.toUpperCase()} ${position.leverage}x: ${formatPercent(position.unrealizedPnLPercent, 2)} (${position.unrealizedPnL >= 0 ? '+' : ''}${formatUSDT(position.unrealizedPnL)} USDT)`
              );
              onClose();
            }}
            className="flex-1 py-2 rounded-lg bg-[#1e293b] text-xs font-bold text-[#f1f5f9] hover:bg-[#283548] flex items-center justify-center gap-1.5 transition-colors"
          >
            <Copy size={13} /> Copy Details
          </button>
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-[#38bdf8] text-xs font-bold text-[#090c10] hover:bg-[#0284c7]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
