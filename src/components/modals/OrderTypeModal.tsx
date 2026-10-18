/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { OrderType } from '../../types/trading';
import { X, HelpCircle, Check, ArrowRight, TrendingUp, Zap, Flag, Activity, Sliders } from 'lucide-react';

interface OrderTypeModalProps {
  currentType: OrderType;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: OrderType) => void;
}

const ORDER_TYPES: Array<{
  id: OrderType;
  name: string;
  description: string;
}> = [
  {
    id: 'limit',
    name: 'Limit',
    description: 'Buy or Sell at a Specific Price',
  },
  {
    id: 'market',
    name: 'Market',
    description: 'Quickly buy or sell at the best available price',
  },
  {
    id: 'stop_market',
    name: 'Trigger',
    description: 'Trigger a limit or market order when the preset target price is reached',
  },
  {
    id: 'trailing_stop',
    name: 'Trailing Stop',
    description: 'Track the market price and automatically execute a market order once the preset value is reached',
  },
];

export function OrderTypeModal({
  currentType,
  isOpen,
  onClose,
  onSelect,
}: OrderTypeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs">
      <div className="bg-[#121212] border-t sm:border border-[#222222] rounded-t-2xl sm:rounded-2xl w-full max-w-md p-4 space-y-3 animate-in slide-in-from-bottom-6 duration-200 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#222]">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-bold text-white">Order Type</h3>
            <HelpCircle size={15} className="text-[#888]" />
          </div>
          <button onClick={onClose} className="text-[#888] hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {/* Options List */}
        <div className="space-y-2 py-1">
          {ORDER_TYPES.map((ot) => {
            const isSelected = currentType === ot.id;
            return (
              <div
                key={ot.id}
                onClick={() => {
                  onSelect(ot.id);
                  onClose();
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#1b1b1b] border-white/60 shadow-md'
                    : 'bg-[#161616] border-[#252525] hover:border-[#383838]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{ot.name}</span>
                  </div>
                  <p className="text-xs text-[#8c8c8c] leading-relaxed">
                    {ot.description}
                  </p>
                </div>
                {isSelected && (
                  <div className="shrink-0 mt-1 h-5 w-5 rounded-full bg-white flex items-center justify-center">
                    <Check size={12} className="text-black stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
