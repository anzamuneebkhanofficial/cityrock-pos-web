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

interface BarRankChartProps {
  data: Array<Record<string, string | number>>;
  yKey: string; // The category key (e.g. productName)
  xKey: string; // The value key (e.g. totalRevenue)
  color?: string;
  valueFormatter?: (value: number) => string;
}

interface RankTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: Record<string, string | number>;
    value?: number | string;
  }>;
  yKey: string;
  valueFormatter: (value: number) => string;
}

function RankTooltip({
  active,
  payload,
  yKey,
  valueFormatter,
}: RankTooltipProps) {
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
        <p
          style={{
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 4,
          }}
        >
          {payload[0].payload[yKey]}
        </p>
        <p style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
          {valueFormatter(Number(payload[0].value || 0))}
        </p>
      </div>
    );
  }
  return null;
}

export function BarRankChart({
  data,
  yKey,
  xKey,
  color = 'var(--chart-bar-orange)',
  valueFormatter = (val) => val.toLocaleString(),
}: BarRankChartProps) {
  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      minWidth={0}
      minHeight={220}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
          stroke="var(--border-subtle, rgba(148, 163, 184, 0.1))"
        />
        <XAxis
          type="number"
          tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
        />
        <YAxis
          type="category"
          dataKey={yKey}
          tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
          tickFormatter={(v) =>
            typeof v === 'string' && v.length > 22 ? `${v.slice(0, 20)}…` : v
          }
          axisLine={false}
          tickLine={false}
          width={150}
        />
        <Tooltip
          cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }}
          content={<RankTooltip yKey={yKey} valueFormatter={valueFormatter} />}
        />
        <Bar dataKey={xKey} radius={[0, 4, 4, 0]} maxBarSize={32}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
