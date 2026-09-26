/** @format */

'use client';

import React, { useState } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface DonutChartProps {
  data: Array<Record<string, string | number>>;
  nameKey: string;
  valueKey: string;
  colors?: string[];
  valueFormatter?: (value: number) => string;
}

const DEFAULT_COLORS = [
  '#f97316', // Orange (accent)
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#64748b', // Slate
];

interface DonutTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: Record<string, string | number>; color?: string }>;
  nameKey: string;
  valueKey: string;
  valueFormatter: (value: number) => string;
  total: number;
}

function DonutTooltip({
  active,
  payload,
  nameKey,
  valueKey,
  valueFormatter,
  total,
}: DonutTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    const val = Number(item[valueKey] || 0);
    const pct = total > 0 ? Math.round((val / total) * 100) : 0;
    return (
      <div
        style={{
          background: 'var(--surface-dark-alt, #14171d)',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
          borderRadius: 8,
          padding: '8px 12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          fontSize: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          minWidth: 140,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: payload[0].color,
            }}
          />
          <span style={{ fontWeight: 600, color: '#f8fafc' }}>
            {item[nameKey]}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#94a3b8', fontSize: 11 }}>Revenue:</span>
          <span style={{ fontWeight: 700, color: 'var(--accent-primary, #f97316)' }}>
            {valueFormatter(val)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#94a3b8', fontSize: 11 }}>Share:</span>
          <span style={{ fontWeight: 600, color: '#38bdf8' }}>
            {pct}%
          </span>
        </div>
      </div>
    );
  }
  return null;
}

export function DonutChart({
  data,
  nameKey,
  valueKey,
  colors = DEFAULT_COLORS,
  valueFormatter = (val) => `PKR ${val.toLocaleString()}`,
}: DonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + (Number(item[valueKey]) || 0), 0);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-secondary text-xs">
        No category revenue data available
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full justify-between">
      {/* SVG Donut Container with guaranteed proportions */}
      <div className="relative w-full h-[160px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
              dataKey={valueKey}
              nameKey={nameKey}
              stroke="none"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                  style={{
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease, transform 0.2s ease',
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              content={
                <DonutTooltip
                  nameKey={nameKey}
                  valueKey={valueKey}
                  valueFormatter={valueFormatter}
                  total={total}
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total Text (Absolute Centered Inside Donut Hole) */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ transform: 'translateY(-1px)' }}
        >
          <span
            style={{
              color: '#ffffff',
              fontWeight: 800,
              fontSize: total >= 1000000 ? 13 : 15,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            {valueFormatter(total)}
          </span>
          <span
            style={{
              color: '#94a3b8',
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginTop: 2,
            }}
          >
            Total Sales
          </span>
        </div>
      </div>

      {/* Clean Structured Category Legend Breakdown (Outside SVG) */}
      <div className="mt-3 pt-2 border-t border-white/5 flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
        {data.map((item, index) => {
          const val = Number(item[valueKey] || 0);
          const pct = total > 0 ? Math.round((val / total) * 100) : 0;
          const color = colors[index % colors.length];
          const isSelected = activeIndex === index;

          return (
            <div
              key={`legend-${index}`}
              className="flex items-center justify-between py-1 px-1.5 rounded transition-colors text-xs"
              style={{
                background: isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span
                  className="truncate text-slate-300 font-medium"
                  title={String(item[nameKey])}
                >
                  {item[nameKey]}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold text-white">
                  {valueFormatter(val)}
                </span>
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{
                    backgroundColor: `${color}20`,
                    color: color,
                  }}
                >
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

