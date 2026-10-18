/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Position } from '../../types/trading';
import { formatPrice, formatUSDT, roundTo } from '../../engine/decimal';
import { calculateIsolatedLiquidationPrice } from '../../engine/margin';
import { X, Plus, Minus, ShieldCheck } from 'lucide-react';

interface AdjustMarginModalProps {
  position: Position | null;
  availableBalance: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (delta: number) => void;
}

export function AdjustMarginModal({
  position,
  availableBalance,
  isOpen,
  onClose,
  onConfirm,
}: AdjustMarginModalProps) {
  if (!isOpen || !position) return null;

  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [amountInput, setAmountInput] = useState<string>('50');

  const deltaAmount = parseFloat(amountInput) || 0;
  const signedDelta = mode === 'add' ? deltaAmount : -deltaAmount;

  const projectedMargin = roundTo(position.isolatedMargin + signedDelta, 2);
  const projectedLiqPrice = calculateIsolatedLiquidationPrice(
    position.side,
    position.size,
    position.entryPrice,
    Math.max(1, projectedMargin),
    position.leverage
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#10141d] border border-[#232a38] rounded-xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c2331]">
          <div>
            <h3 className="font-bold text-sm text-[#f1f5f9]">Adjust Isolated Margin</h3>
            <span className="text-[11px] text-[#848e9c]">
              {position.symbol} · {position.leverage}x {position.side.toUpperCase()}
            </span>
          </div>
          <button onClick={onClose} className="text-[#64748b] hover:text-[#d1d4dc] p-1 rounded-md">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 text-xs">
          {/* Mode Switcher */}
          <div className="flex bg-[#141a24] p-1 rounded-lg border border-[#202736]">
            <button
              onClick={() => setMode('add')}
              className={`flex-1 py-1.5 rounded-md font-semibold flex items-center justify-center gap-1 transition-colors ${
                mode === 'add' ? 'bg-[#0ecb81] text-[#090c10]' : 'text-[#848e9c] hover:text-white'
              }`}
            >
              <Plus size={13} /> Add Margin
            </button>
            <button
              onClick={() => setMode('remove')}
              className={`flex-1 py-1.5 rounded-md font-semibold flex items-center justify-center gap-1 transition-colors ${
                mode === 'remove' ? 'bg-[#f6465d] text-white' : 'text-[#848e9c] hover:text-white'
              }`}
            >
              <Minus size={13} /> Remove Margin
            </button>
          </div>

          {/* Amount input */}
          <div className="space-y-1">
            <div className="flex justify-between text-[#848e9c]">
              <span>Amount (USDT)</span>
              <span>Available: {formatUSDT(availableBalance)} USDT</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="1"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full bg-[#141a24] border border-[#232a38] rounded-lg px-3 py-2 text-xs font-mono-num text-[#f1f5f9] focus:outline-none focus:border-[#38bdf8]"
              />
              <button
                type="button"
                onClick={() => setAmountInput(String(Math.floor(mode === 'add' ? availableBalance : position.isolatedMargin * 0.5)))}
                className="absolute right-2.5 top-2 text-[10px] font-semibold text-[#38bdf8] hover:underline"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Impact Overview */}
          <div className="bg-[#141a24] p-2.5 rounded-lg border border-[#1e2533] space-y-1.5 font-mono-num">
            <div className="flex justify-between text-[#848e9c]">
              <span>Current Margin:</span>
              <span className="text-white">{formatUSDT(position.isolatedMargin)} USDT</span>
            </div>
            <div className="flex justify-between text-[#848e9c]">
              <span>Projected Margin:</span>
              <span className="text-[#38bdf8] font-semibold">{formatUSDT(projectedMargin)} USDT</span>
            </div>
            <div className="border-t border-[#1e2533] pt-1.5 flex justify-between">
              <span className="text-[#848e9c]">Current Liq Price:</span>
              <span className="text-[#f97316]">{formatPrice(position.estimatedLiquidationPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#848e9c]">New Liq Price:</span>
              <span className="text-[#0ecb81] font-bold">{formatPrice(projectedLiqPrice)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 p-3 border-t border-[#1c2331] bg-[#0c1017]">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-[#18202d] text-xs font-semibold text-[#848e9c] hover:text-[#d1d4dc]"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (deltaAmount > 0) {
                onConfirm(signedDelta);
                onClose();
              }
            }}
            className="flex-1 py-2 rounded-lg bg-[#38bdf8] text-xs font-bold text-[#090c10] hover:bg-[#0284c7]"
          >
            Confirm Adjustment
          </button>
        </div>
      </div>
    </div>
  );
}
