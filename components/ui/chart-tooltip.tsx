'use client';

import React from 'react';
import { formatCurrency, formatCurrencyNoDecimals, formatNumber, formatPercentage, calculatePercentageChange } from '@/lib/utils/date';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string | number | (string | number)[];
    value?: string | number | (string | number)[];
    dataKey?: string | number;
    color?: string;
    payload?: any;
  }>;
  label?: string | number;
  valueFormatter?: (value: number) => string;
  currentLabel?: string;
  comparisonLabel?: string;
  comparisonKey?: string; // Key to find comparison value in payload (e.g., '_comparisonRevenue')
}

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter = (value) => formatNumber(value),
  currentLabel = 'Current year',
  comparisonLabel = 'Same period last year',
  comparisonKey,
}: ChartTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const rawValue = payload[0]?.value;
  const currentValue = typeof rawValue === 'number' ? rawValue : 0;
  const payloadData = payload[0]?.payload;
  const comparisonValue = comparisonKey && payloadData
    ? payloadData[comparisonKey] ?? null
    : null;
  const percentageChange = comparisonValue !== null && typeof comparisonValue === 'number' && typeof currentValue === 'number'
    ? calculatePercentageChange(comparisonValue, currentValue)
    : null;

  // Use label (x-axis value) if available, otherwise fall back to currentLabel
  const displayLabel = label !== undefined ? String(label) : currentLabel;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[200px]">
      {/* Current Period Section */}
      <div className="flex items-start gap-3">
        {/* Blue indicator bar */}
        <div className="w-1 bg-blue-500 rounded-full flex-shrink-0 self-stretch" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm text-gray-700 font-medium">{displayLabel}</span>
            {percentageChange !== null && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white whitespace-nowrap">
                {percentageChange >= 0 ? '+' : ''}{formatPercentage(percentageChange)}
              </span>
            )}
          </div>
          <p className="text-xl font-bold text-gray-900">
            {valueFormatter(currentValue)}
          </p>
        </div>
      </div>

      {/* Comparison Period Section */}
      {comparisonValue !== null && (
        <div className="flex items-start gap-3 pt-2 mt-2 border-t border-gray-100">
          {/* Light gray indicator bar */}
          <div className="w-1 bg-gray-300 rounded-full flex-shrink-0 self-stretch" />
          
          <div className="flex-1 min-w-0">
            <span className="text-sm text-gray-700 font-medium block mb-1">
              {comparisonLabel}
            </span>
            <p className="text-xl font-bold text-gray-900">
              {valueFormatter(comparisonValue)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

