/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Position } from '../../types/trading';
import { formatPrice, roundTo } from '../../engine/decimal';
import { calculateUnrealizedPnL, calculateROE } from '../../engine/margin';
import { X, Target, ShieldAlert } from 'lucide-react';

interface TPSLModalProps {
  position: Position | null;
  currentPrice: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tp?: number, sl?: number) => void;
}

export function TPSLModal({
  position,
  currentPrice,
  isOpen,
  onClose,
  onConfirm,
}: TPSLModalProps) {
  if (!isOpen || !position) return null;

  const [tpInput, setTpInput] = useState<string>(
    position.takeProfitPrice ? String(position.takeProfitPrice) : ''
  );
  const [slInput, setSlInput] = useState<string>(
    position.stopLossPrice ? String(position.stopLossPrice) : ''
  );

  const tpVal = parseFloat(tpInput);
  const slVal = parseFloat(slInput);

  // Projected TP PnL
  const tpPnL = !isNaN(tpVal) && tpVal > 0
    ? calculateUnrealizedPnL(position.side, position.size, position.entryPrice, tpVal)
    : null;
  const tpRoe = tpPnL !== null ? calculateROE(tpPnL, position.isolatedMargin) : null;

  // Projected SL PnL
  const slPnL = !isNaN(slVal) && slVal > 0
    ? calculateUnrealizedPnL(position.side, position.size, position.entryPrice, slVal)
    : null;
  const slRoe = slPnL !== null ? calculateROE(slPnL, position.isolatedMargin) : null;

  const handleQuickTPPercent = (pct: number) => {
    const factor = position.side === 'long' ? (1 + pct / (100 * position.leverage)) : (1 - pct / (100 * position.leverage));
    setTpInput(String(roundTo(position.entryPrice * factor, 2)));
  };

  const handleQuickSLPercent = (pct: number) => {
    const factor = position.side === 'long' ? (1 - pct / (100 * position.leverage)) : (1 + pct / (100 * position.leverage));
    setSlInput(String(roundTo(position.entryPrice * factor, 2)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#10141d] border border-[#232a38] rounded-xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c2331]">
          <div>
            <h3 className="font-bold text-sm text-[#f1f5f9]">TP / SL Management</h3>
            <span className={`text-[11px] font-semibold font-mono-num ${position.side === 'long' ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
              {position.leverage}x {position.side.toUpperCase()} · Entry: {formatPrice(position.entryPrice)}
            </span>
          </div>
          <button onClick={onClose} className="text-[#64748b] hover:text-[#d1d4dc] p-1 rounded-md">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Take Profit Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="text-[#0ecb81] font-semibold flex items-center gap-1">
                <Target size={13} /> Take Profit Price
              </label>
              {tpPnL !== null && (
                <span className="font-mono-num text-[11px] text-[#0ecb81]">
                  Est. +{tpPnL} USDT (+{tpRoe}%)
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder={`Target Price (e.g. ${roundTo(position.side === 'long' ? currentPrice * 1.05 : currentPrice * 0.95, 2)})`}
                value={tpInput}
                onChange={(e) => setTpInput(e.target.value)}
                className="w-full bg-[#141a24] border border-[#232a38] rounded-lg px-3 py-2 text-xs font-mono-num text-[#f1f5f9] focus:outline-none focus:border-[#0ecb81]"
              />
              <span className="absolute right-3 top-2 text-[10px] text-[#64748b]">USDT</span>
            </div>
            <div className="flex gap-1.5">
              {[25, 50, 100, 200].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleQuickTPPercent(pct)}
                  className="flex-1 py-1 bg-[#151b26] rounded text-[10px] text-[#848e9c] hover:bg-[#1a2536] hover:text-[#0ecb81] font-mono-num transition-colors"
                >
                  +{pct}% ROE
                </button>
              ))}
            </div>
          </div>

          {/* Stop Loss Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="text-[#f6465d] font-semibold flex items-center gap-1">
                <ShieldAlert size={13} /> Stop Loss Price
              </label>
              {slPnL !== null && (
                <span className="font-mono-num text-[11px] text-[#f6465d]">
                  Est. {slPnL} USDT ({slRoe}%)
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder={`Trigger Price (e.g. ${roundTo(position.side === 'long' ? currentPrice * 0.98 : currentPrice * 1.02, 2)})`}
                value={slInput}
                onChange={(e) => setSlInput(e.target.value)}
                className="w-full bg-[#141a24] border border-[#232a38] rounded-lg px-3 py-2 text-xs font-mono-num text-[#f1f5f9] focus:outline-none focus:border-[#f6465d]"
              />
              <span className="absolute right-3 top-2 text-[10px] text-[#64748b]">USDT</span>
            </div>
            <div className="flex gap-1.5">
              {[15, 30, 50, 75].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleQuickSLPercent(pct)}
                  className="flex-1 py-1 bg-[#151b26] rounded text-[10px] text-[#848e9c] hover:bg-[#2b171c] hover:text-[#f6465d] font-mono-num transition-colors"
                >
                  -{pct}% ROE
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 p-3 border-t border-[#1c2331] bg-[#0c1017]">
          <button
            onClick={() => {
              onConfirm(undefined, undefined);
              onClose();
            }}
            className="py-2 px-3 rounded-lg bg-[#18202d] text-xs font-semibold text-[#848e9c] hover:text-[#ef4444] transition-colors"
          >
            Clear TP/SL
          </button>
          <button
            onClick={() => {
              const tp = !isNaN(tpVal) && tpVal > 0 ? tpVal : undefined;
              const sl = !isNaN(slVal) && slVal > 0 ? slVal : undefined;
              onConfirm(tp, sl);
              onClose();
            }}
            className="flex-1 py-2 rounded-lg bg-[#38bdf8] text-xs font-bold text-[#090c10] hover:bg-[#0284c7] transition-colors"
          >
            Save TP / SL
          </button>
        </div>
      </div>
    </div>
  );
}
