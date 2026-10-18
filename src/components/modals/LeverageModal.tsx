/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface LeverageModalProps {
  currentLeverage: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (leverage: number) => void;
}

const PRESET_LEVERAGES = [1, 5, 10, 20, 25, 50, 75];

export function LeverageModal({
  currentLeverage,
  isOpen,
  onClose,
  onConfirm,
}: LeverageModalProps) {
  const [selectedLeverage, setSelectedLeverage] = useState(currentLeverage);

  if (!isOpen) return null;

  // Max position notional for the leverage tier
  const maxNotional = selectedLeverage > 50 ? 50000 : selectedLeverage > 20 ? 150000 : 250000;
  const adverseLiqMove = (100 / selectedLeverage).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#10141d] border border-[#232a38] rounded-xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c2331]">
          <h3 className="font-bold text-sm text-[#f1f5f9]">Adjust Leverage</h3>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-[#d1d4dc] p-1 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Large Leverage Display */}
          <div className="text-center py-2">
            <div className="text-3xl font-extrabold font-mono-num text-[#f0b90b]">
              {selectedLeverage}x
            </div>
            <div className="text-xs text-[#848e9c] mt-0.5">
              Max position value: {maxNotional.toLocaleString()} USDT
            </div>
          </div>

          {/* Slider */}
          <div className="px-1">
            <input
              type="range"
              min={1}
              max={75}
              value={selectedLeverage}
              onChange={(e) => setSelectedLeverage(Number(e.target.value))}
              className="w-full h-2 bg-[#1b2230] rounded-lg appearance-none cursor-pointer accent-[#f0b90b]"
            />
            <div className="flex justify-between text-[10px] text-[#64748b] font-mono-num mt-1">
              <span>1x</span>
              <span>25x</span>
              <span>50x</span>
              <span>75x</span>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {PRESET_LEVERAGES.map((lev) => (
              <button
                key={lev}
                type="button"
                onClick={() => setSelectedLeverage(lev)}
                className={`py-1.5 rounded text-xs font-semibold font-mono-num transition-colors ${
                  selectedLeverage === lev
                    ? 'bg-[#f0b90b] text-[#090c10]'
                    : 'bg-[#151b26] text-[#848e9c] hover:bg-[#1e2738] hover:text-[#f1f5f9]'
                }`}
              >
                {lev}x
              </button>
            ))}
          </div>

          {/* Risk Warning Notice */}
          <div className="flex items-start gap-2.5 p-2.5 bg-[#1f1712] border border-[#78350f]/60 rounded-lg text-xs text-[#fdba74]">
            <AlertTriangle size={16} className="text-[#f59e0b] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-[11px] text-[#fbbf24]">High Leverage Risk</p>
              <p className="text-[10px] leading-relaxed text-[#fed7aa]/90">
                At {selectedLeverage}x leverage, an adverse market movement of only{' '}
                <span className="font-bold underline">{adverseLiqMove}%</span> will trigger complete liquidation. Use caution and set stop-loss orders.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 p-3 border-t border-[#1c2331] bg-[#0c1017]">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-[#18202d] text-xs font-semibold text-[#848e9c] hover:text-[#d1d4dc] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm(selectedLeverage);
              onClose();
            }}
            className="flex-1 py-2 rounded-lg bg-[#f0b90b] text-xs font-bold text-[#090c10] hover:bg-[#e0ab07] transition-colors"
          >
            Confirm {selectedLeverage}x
          </button>
        </div>
      </div>
    </div>
  );
}
