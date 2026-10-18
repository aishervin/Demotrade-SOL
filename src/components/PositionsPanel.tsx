/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Position } from '../types/trading';
import { formatAmount, formatPercent, formatPrice, formatUSDT } from '../engine/decimal';
import { Share2, SlidersHorizontal, ArrowLeftRight, X, ShieldAlert, Target } from 'lucide-react';

interface PositionsPanelProps {
  positions: Position[];
  currentPrice: number;
  onClosePosition: (positionId: string, qtySOL: number) => void;
  onCloseAll: () => void;
  onOpenTPSL: (position: Position) => void;
  onOpenAdjustMargin: (position: Position) => void;
  onOpenShareCard: (position: Position) => void;
  onReversePosition: (positionId: string) => void;
}

export function PositionsPanel({
  positions,
  currentPrice,
  onClosePosition,
  onCloseAll,
  onOpenTPSL,
  onOpenAdjustMargin,
  onOpenShareCard,
  onReversePosition,
}: PositionsPanelProps) {
  const [partialCloseModalPos, setPartialCloseModalPos] = useState<Position | null>(null);
  const [partialPercent, setPartialPercent] = useState<number>(50);

  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-[#64748b] text-xs">
        <p>No open positions</p>
        <p className="text-[10px] text-[#475569] mt-0.5">
          Execute a LONG or SHORT trade to start paper trading.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-[#181d27]">
      {/* Positions List */}
      {positions.map((pos) => {
        const isLong = pos.side === 'long';
        const isProfit = pos.unrealizedPnL >= 0;

        return (
          <div
            key={pos.id}
            className="p-3 bg-[#0c1017] hover:bg-[#0f141d] transition-colors text-xs"
          >
            {/* Position Top Bar */}
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                    isLong
                      ? 'bg-[#0ecb81]/15 text-[#0ecb81] border border-[#0ecb81]/30'
                      : 'bg-[#f6465d]/15 text-[#f6465d] border border-[#f6465d]/30'
                  }`}
                >
                  {pos.side} {pos.leverage}x
                </span>
                <span className="font-bold text-sm text-[#f1f5f9]">{pos.symbol}</span>
                <span className="text-[10px] text-[#848e9c] bg-[#141a24] px-1 py-0.5 rounded">
                  {pos.marginMode}
                </span>
              </div>

              {/* Share & Reverse */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onOpenShareCard(pos)}
                  className="p-1 rounded bg-[#151c27] text-[#848e9c] hover:text-[#38bdf8] transition-colors"
                  title="Share PnL Card"
                >
                  <Share2 size={13} />
                </button>
                <button
                  onClick={() => onReversePosition(pos.id)}
                  className="p-1 rounded bg-[#151c27] text-[#848e9c] hover:text-[#f0b90b] transition-colors"
                  title="Reverse Position"
                >
                  <ArrowLeftRight size={13} />
                </button>
              </div>
            </div>

            {/* PnL and Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 font-mono-num">
              {/* PnL & ROE */}
              <div>
                <span className="text-[10px] text-[#64748b] block">Unrealized PnL (ROE%)</span>
                <div
                  className={`text-sm font-bold flex items-baseline gap-1 ${
                    isProfit ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                  }`}
                >
                  <span>{isProfit ? '+' : ''}{formatUSDT(pos.unrealizedPnL)}</span>
                  <span className="text-xs">({formatPercent(pos.unrealizedPnLPercent, 2)})</span>
                </div>
              </div>

              {/* Size & Margin */}
              <div>
                <span className="text-[10px] text-[#64748b] block">Size / Margin</span>
                <div className="text-[#f1f5f9] font-medium">
                  {formatAmount(pos.size, 3)} SOL
                  <span className="text-[#848e9c] text-[10px] ml-1">
                    ({formatUSDT(pos.isolatedMargin)} USDT)
                  </span>
                </div>
              </div>

              {/* Entry & Mark Price */}
              <div>
                <span className="text-[10px] text-[#64748b] block">Entry / Mark</span>
                <div className="text-[#d1d4dc]">
                  {formatPrice(pos.entryPrice)} / {formatPrice(pos.markPrice)}
                </div>
              </div>

              {/* Estimated Liq Price */}
              <div>
                <span className="text-[10px] text-[#f97316] font-medium block">Est. Liq Price</span>
                <div className="text-[#f97316] font-bold">
                  {pos.estimatedLiquidationPrice > 0 ? formatPrice(pos.estimatedLiquidationPrice) : '--'}
                </div>
              </div>
            </div>

            {/* Active TP / SL Tags */}
            <div className="flex items-center gap-2 py-1.5 text-[10px] font-mono-num text-[#848e9c]">
              <span className="flex items-center gap-1">
                <Target size={11} className="text-[#0ecb81]" />
                TP: {pos.takeProfitPrice ? formatPrice(pos.takeProfitPrice) : '--'}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <ShieldAlert size={11} className="text-[#f6465d]" />
                SL: {pos.stopLossPrice ? formatPrice(pos.stopLossPrice) : '--'}
              </span>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-[#181f2c]">
              <button
                type="button"
                onClick={() => onOpenTPSL(pos)}
                className="flex-1 py-1.5 px-2 bg-[#141b26] hover:bg-[#1a2332] text-[#848e9c] hover:text-[#d1d4dc] rounded font-medium text-[11px] transition-colors"
              >
                TP / SL
              </button>

              <button
                type="button"
                onClick={() => onOpenAdjustMargin(pos)}
                className="flex-1 py-1.5 px-2 bg-[#141b26] hover:bg-[#1a2332] text-[#848e9c] hover:text-[#d1d4dc] rounded font-medium text-[11px] transition-colors"
              >
                Adjust Margin
              </button>

              <button
                type="button"
                onClick={() => setPartialCloseModalPos(pos)}
                className="flex-1 py-1.5 px-2 bg-[#141b26] hover:bg-[#1a2332] text-[#848e9c] hover:text-[#d1d4dc] rounded font-medium text-[11px] transition-colors"
              >
                Partial Close
              </button>

              <button
                type="button"
                onClick={() => onClosePosition(pos.id, pos.size)}
                className="py-1.5 px-3 bg-[#f6465d]/20 hover:bg-[#f6465d] text-[#f6465d] hover:text-white rounded font-bold text-[11px] transition-colors"
              >
                Market Close
              </button>
            </div>
          </div>
        );
      })}

      {/* Partial Close Dialog */}
      {partialCloseModalPos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#10141d] border border-[#232a38] rounded-xl w-full max-w-sm p-4 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-[#1c2331]">
              <h4 className="font-bold text-sm text-[#f1f5f9]">Partial Close Position</h4>
              <button
                onClick={() => setPartialCloseModalPos(null)}
                className="text-[#64748b] hover:text-[#d1d4dc]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[#848e9c]">
                <span>Close Percentage</span>
                <span className="font-mono-num text-[#38bdf8] font-bold">{partialPercent}%</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setPartialPercent(pct)}
                    className={`py-1.5 rounded text-xs font-semibold font-mono-num ${
                      partialPercent === pct ? 'bg-[#38bdf8] text-[#090c10]' : 'bg-[#151b26] text-[#848e9c]'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <div className="p-2.5 bg-[#141a24] rounded-lg text-xs font-mono-num space-y-1">
                <div className="flex justify-between text-[#848e9c]">
                  <span>Closing Amount:</span>
                  <span className="text-white">
                    {formatAmount(partialCloseModalPos.size * (partialPercent / 100), 3)} SOL
                  </span>
                </div>
                <div className="flex justify-between text-[#848e9c]">
                  <span>Execution Price:</span>
                  <span className="text-[#38bdf8]">{formatPrice(currentPrice)} USDT</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setPartialCloseModalPos(null)}
                className="flex-1 py-2 bg-[#18202d] text-xs font-semibold text-[#848e9c] rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const qty = partialCloseModalPos.size * (partialPercent / 100);
                  onClosePosition(partialCloseModalPos.id, qty);
                  setPartialCloseModalPos(null);
                }}
                className="flex-1 py-2 bg-[#f6465d] text-xs font-bold text-white rounded-lg hover:bg-[#d63449]"
              >
                Confirm Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
