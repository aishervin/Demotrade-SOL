/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MarginMode } from '../../types/trading';
import { X, ShieldAlert, Check } from 'lucide-react';

interface MarginModeModalProps {
  currentMode: MarginMode;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: MarginMode) => void;
}

export function MarginModeModal({
  currentMode,
  isOpen,
  onClose,
  onConfirm,
}: MarginModeModalProps) {
  const [selectedMode, setSelectedMode] = useState<MarginMode>(currentMode);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#10141d] border border-[#232a38] rounded-xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c2331]">
          <h3 className="font-bold text-sm text-[#f1f5f9]">Margin Mode</h3>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-[#d1d4dc] p-1 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Isolated Option */}
          <div
            onClick={() => setSelectedMode('isolated')}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              selectedMode === 'isolated'
                ? 'bg-[#152033] border-[#38bdf8]'
                : 'bg-[#131822] border-[#202736] hover:border-[#2d384e]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-[#f1f5f9] flex items-center gap-1.5">
                Isolated Margin (Default)
              </span>
              {selectedMode === 'isolated' && <Check size={16} className="text-[#38bdf8]" />}
            </div>
            <p className="text-xs text-[#848e9c] leading-relaxed">
              Manage risk on individual positions by restricting the allocated margin. If the margin ratio reaches 100%, only that specific position is liquidated.
            </p>
          </div>

          {/* Cross Option */}
          <div
            onClick={() => setSelectedMode('cross')}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              selectedMode === 'cross'
                ? 'bg-[#152033] border-[#38bdf8]'
                : 'bg-[#131822] border-[#202736] hover:border-[#2d384e]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-[#f1f5f9] flex items-center gap-1.5">
                Cross Margin
              </span>
              {selectedMode === 'cross' && <Check size={16} className="text-[#38bdf8]" />}
            </div>
            <p className="text-xs text-[#848e9c] leading-relaxed">
              All cross positions share the entire available account balance. In the event of liquidation, the trader may lose all available demo balance and open cross positions.
            </p>
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
              onConfirm(selectedMode);
              onClose();
            }}
            className="flex-1 py-2 rounded-lg bg-[#38bdf8] text-xs font-bold text-[#090c10] hover:bg-[#0284c7] transition-colors"
          >
            Confirm Mode
          </button>
        </div>
      </div>
    </div>
  );
}
