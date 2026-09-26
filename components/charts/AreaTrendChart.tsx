/** @format */

'use client';

import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface AreaTrendChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  compareKey?: string;
  color?: string;
  compareColor?: string;
  valueFormatter?: (value: number) => string;
  xFormatter?: (value: string) => string;
}

interface AreaTooltipProps {
  active?: boolean;
  payload?: Array<{ color?: string; name?: string; value?: number | string }>;
  label?: string | number;
  xFormatter: (value: string) => string;
  yKey: string;
}

function AreaTooltip({
  active,
  payload,
  label,
  xFormatter,
  yKey,
}: AreaTooltipProps) {
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
            color: 'var(--text-secondary)',
            marginBottom: 6,
            fontWeight: 500,
          }}
        >
          {xFormatter(String(label ?? ''))}
        </p>
        {payload.map((entry, index) => (
          <div
            key={`item-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 4,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: entry.color || 'var(--chart-bar-orange)',
              }}
            />
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              {entry.name === yKey ? 'Current' : 'Previous'}:{' '}
              {typeof entry.value === 'number'
                ? `PKR ${entry.value.toLocaleString()}`
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function AreaTrendChart({
  data,
  xKey,
  yKey,
  compareKey,
  color = 'var(--chart-bar-orange)',
  compareColor = 'var(--text-muted)',
  valueFormatter = (val) => `PKR ${(val / 1000).toFixed(0)}k`,
  xFormatter = (val) => val,
}: AreaTrendChartProps) {
  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      minWidth={0}
      minHeight={220}
    >
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id={`color-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          {compareKey && (
            <linearGradient
              id={`color-${compareKey}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor={compareColor} stopOpacity={0.1} />
              <stop offset="95%" stopColor={compareColor} stopOpacity={0} />
            </linearGradient>
          )}
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--border-subtle, rgba(148, 163, 184, 0.1))"
        />
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          tickFormatter={xFormatter}
          axisLine={false}
          tickLine={false}
          dy={10}
        />
        <YAxis
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          tickFormatter={valueFormatter}
          axisLine={false}
          tickLine={false}
          dx={-10}
        />
        <Tooltip
          content={<AreaTooltip xFormatter={xFormatter} yKey={yKey} />}
        />
        {compareKey && (
          <Area
            type="monotone"
            dataKey={compareKey}
            stroke={compareColor}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#color-${compareKey})`}
            activeDot={false}
          />
        )}
        <Area
          type="monotone"
          dataKey={yKey}
          stroke={color}
          strokeWidth={2}
          fillOpacity={1}
          fill={`url(#color-${yKey})`}
          activeDot={{
            r: 6,
            fill: color,
            stroke: 'var(--text-primary)',
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
