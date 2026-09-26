/** @format */

'use client';

import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';

interface BarTimeChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string; // The time/category key
  yKey: string; // The value key
  color?: string;
  valueFormatter?: (value: number) => string;
  xFormatter?: (value: string) => string;
}

interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string | number;
  xFormatter: (value: string) => string;
  valueFormatter: (value: number) => string;
}

function BarTooltip({
  active,
  payload,
  label,
  xFormatter,
  valueFormatter,
}: BarTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'var(--surface-dark-alt)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          fontSize: 12,
        }}
      >
        <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>
          {xFormatter(String(label ?? ''))}
        </p>
        <p style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
          {valueFormatter(Number(payload[0].value || 0))}
        </p>
      </div>
    );
  }
  return null;
}

export function BarTimeChart({
  data,
  xKey,
  yKey,
  color = '#f97316',
  valueFormatter = (val) => val.toLocaleString(),
  xFormatter = (val) => val,
}: BarTimeChartProps) {
  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      minWidth={0}
      minHeight={220}
    >
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--border-subtle, rgba(148, 163, 184, 0.1))"
        />
        <XAxis
          dataKey={xKey}
          tick={{ fill: '#64748b', fontSize: 12 }}
          tickFormatter={xFormatter}
          axisLine={false}
          tickLine={false}
          dy={10}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 12 }}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
          axisLine={false}
          tickLine={false}
          dx={-10}
        />
        <Tooltip
          cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }}
          content={
            <BarTooltip
              xFormatter={xFormatter}
              valueFormatter={valueFormatter}
            />
          }
        />
        <Bar dataKey={yKey} radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
