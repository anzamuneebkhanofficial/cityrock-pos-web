/** @format */

'use client';

import React from 'react';
import { Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  deltaPct?: number; // Positive for growth, negative for decline
  sparklineData?: any[];
  sparklineKey?: string;
  isLoading?: boolean;
}

export function KpiCard({
  label,
  value,
  icon,
  color = '#6366f1',
  deltaPct,
  sparklineData,
  sparklineKey,
  isLoading,
}: KpiCardProps) {
  return (
    <div className="card flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {label}
          </p>
          {isLoading ? (
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          ) : (
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {value}
            </h3>
          )}
        </div>
        {icon && (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-4 h-[40px]">
        <div className="flex items-center gap-1.5 shrink-0 mb-1">
          {deltaPct !== undefined && !isLoading && (
            <>
              {deltaPct >= 0 ? (
                <ArrowUpRight size={16} className="text-green-500" />
              ) : (
                <ArrowDownRight size={16} className="text-red-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  deltaPct >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {Math.abs(deltaPct).toFixed(1)}%
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                vs prev
              </span>
            </>
          )}
        </div>

        {sparklineData &&
          sparklineData.length > 0 &&
          sparklineKey &&
          !isLoading && (
            <div className="flex-1 h-full w-full min-w-0 max-w-[120px] ml-auto">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={40}
              >
                <LineChart data={sparklineData}>
                  <Line
                    type="monotone"
                    dataKey={sparklineKey}
                    stroke={deltaPct && deltaPct < 0 ? '#ef4444' : '#10b981'}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
      </div>
    </div>
  );
}
