/** @format */

'use client';

import React from 'react';
import { Loader2, BarChart2 } from 'lucide-react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  error?: string;
  children: React.ReactNode;
  height?: number | string;
}

export function ChartCard({
  title,
  subtitle,
  actions,
  isLoading,
  isEmpty,
  emptyMessage = 'No data available for this period',
  error,
  children,
  height = 300,
}: ChartCardProps) {
  return (
    <div className="card w-full min-w-0" style={{ padding: 24 }}>
      <div className="flex justify-between items-start mb-5 gap-4">
        <div>
          <h3 className="font-bold m-0 text-base text-white">{title}</h3>
          {subtitle && (
            <p className="text-xs text-secondary mt-1">{subtitle}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      <div
        style={{
          height,
          minHeight: typeof height === 'number' ? height : 220,
          minWidth: 1,
          width: '100%',
        }}
        className="relative w-full min-w-0 flex-1 flex flex-col"
      >
        {isLoading ? (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-lg"
            style={{ background: 'rgba(0,0,0,0.2)' }}
          >
            <Loader2
              className="w-6 h-6 animate-spin"
              style={{ color: 'var(--accent-primary)' }}
            />
          </div>
        ) : error ? (
          <div
            className="absolute inset-0 flex items-center justify-center border rounded-lg text-sm text-negative p-4 text-center"
            style={{
              borderColor: 'var(--negative)',
              background: 'var(--negative-bg)',
            }}
          >
            {error}
          </div>
        ) : isEmpty ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center border border-dashed rounded-lg text-sm p-6 text-center"
            style={{ borderColor: 'var(--border-subtle)', background: 'rgba(255,255,255,0.015)' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, color: 'var(--text-muted)' }}>
              <BarChart2 size={22} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{emptyMessage}</span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
