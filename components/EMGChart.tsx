'use client';

// ============================================
// EMG Chart Component
// Real-time line chart for EMG muscle signal data
// Uses Recharts for smooth, responsive visualization
// ============================================

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Activity, Zap } from 'lucide-react';
import { ChartDataPoint } from '@/lib/types';

interface EMGChartProps {
  data: ChartDataPoint[];
  currentValue: number;
}

export function EMGChart({ data, currentValue }: EMGChartProps) {
  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const row = payload[0].payload as ChartDataPoint;
      const when = typeof row.timestamp === 'number'
        ? new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'medium',
            hour12: false,
          }).format(row.timestamp)
        : payload[0].label;
      return (
        <div className="glass-card-sm !p-3 !rounded-lg shadow-xl border border-red-500/20">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{when}</p>
          <p className="text-lg font-bold text-red-500">
            {payload[0].value}
            <span className="text-xs font-normal ml-1">raw</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              EMG Muscle Signal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time electromyography data
            </p>
          </div>
        </div>

        {/* Current Value Display */}
        <div className="text-right">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-red-500" />
            <span className="text-2xl sm:text-3xl font-bold text-red-500">
              {currentValue}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Current Value (0-4095)
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 sm:h-80">
        {data.length === 0 ? (
          // Empty state
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Activity className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">Waiting for EMG data...</p>
            <p className="text-xs mt-1">Connect your ESP32 to start</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              {/* Gradient definition for area fill */}
              <defs>
                <linearGradient id="emgGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              
              <YAxis
                domain={[0, 4095]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Area under the line */}
              <Area
                type="monotone"
                dataKey="emg"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#emgGradient)"
                animationDuration={300}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart Legend */}
      <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
        <div className="flex flex-wrap gap-2 justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>ADC range: 0 – 4095 (12‑bit)</span>
          <span>Axis / tooltips use device local date &amp; time</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Loading skeleton for EMG chart
// ============================================
export function EMGChartSkeleton() {
  return (
    <div className="glass-card animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-300 dark:bg-slate-600" />
          <div>
            <div className="h-5 w-32 bg-slate-300 dark:bg-slate-600 rounded mb-2" />
            <div className="h-3 w-48 bg-slate-300 dark:bg-slate-600 rounded" />
          </div>
        </div>
        <div className="text-right">
          <div className="h-8 w-20 bg-slate-300 dark:bg-slate-600 rounded mb-1" />
          <div className="h-3 w-24 bg-slate-300 dark:bg-slate-600 rounded" />
        </div>
      </div>
      <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-lg" />
    </div>
  );
}
