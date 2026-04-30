'use client';

// ============================================
// MPU6050 Chart Component
// Multi-line chart showing X, Y, Z acceleration data
// Beautiful gradient fills with interactive tooltips
// ============================================

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Move3d, ArrowRight, ArrowUp, ArrowUpRight } from 'lucide-react';
import { ChartDataPoint } from '@/lib/types';

interface MPUChartProps {
  data: ChartDataPoint[];
  currentAx: number;
  currentAy: number;
  currentAz: number;
}

export function MPUChart({ data, currentAx, currentAy, currentAz }: MPUChartProps) {
  // Custom tooltip component with all three values
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card-sm !p-3 !rounded-lg shadow-xl">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <span className="text-xs" style={{ color: entry.color }}>
                  {entry.name}
                </span>
                <span className="text-sm font-semibold" style={{ color: entry.color }}>
                  {entry.value.toFixed(2)} g
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const CustomLegend = ({ payload }: any) => (
    <div className="flex justify-center gap-4 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="glass-card animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg">
            <Move3d className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              MPU6050 3-Axis Acceleration
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time motion sensor data
            </p>
          </div>
        </div>

        {/* Current Values Display */}
        <div className="flex gap-4 sm:gap-6">
          {/* X Axis */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-blue-500">
              <ArrowRight className="w-4 h-4" />
              <span className="text-lg sm:text-xl font-bold">{currentAx.toFixed(2)}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">X (g)</p>
          </div>

          {/* Y Axis */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-500">
              <ArrowUp className="w-4 h-4" />
              <span className="text-lg sm:text-xl font-bold">{currentAy.toFixed(2)}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Y (g)</p>
          </div>

          {/* Z Axis */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-amber-500">
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-lg sm:text-xl font-bold">{currentAz.toFixed(2)}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Z (g)</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 sm:h-72">
        {data.length === 0 ? (
          // Empty state
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Move3d className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">Waiting for motion data...</p>
            <p className="text-xs mt-1">Connect your ESP32 to start</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              
              <YAxis
                domain={[-16, 16]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}g`}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Legend content={<CustomLegend />} />

              {/* X Axis Line (Blue) */}
              <Line
                type="monotone"
                dataKey="ax"
                name="Ax"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                animationDuration={300}
              />

              {/* Y Axis Line (Green) */}
              <Line
                type="monotone"
                dataKey="ay"
                name="Ay"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                animationDuration={300}
              />

              {/* Z Axis Line (Amber) */}
              <Line
                type="monotone"
                dataKey="az"
                name="Az"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                animationDuration={300}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart Info */}
      <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Range: ±16g (gravitational force)</span>
          <span>Update Rate: 500ms</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Loading skeleton for MPU chart
// ============================================
export function MPUChartSkeleton() {
  return (
    <div className="glass-card animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-300 dark:bg-slate-600" />
          <div>
            <div className="h-5 w-48 bg-slate-300 dark:bg-slate-600 rounded mb-2" />
            <div className="h-3 w-36 bg-slate-300 dark:bg-slate-600 rounded" />
          </div>
        </div>
        <div className="flex gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <div className="h-6 w-12 bg-slate-300 dark:bg-slate-600 rounded mb-1" />
              <div className="h-3 w-8 bg-slate-300 dark:bg-slate-600 rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-lg" />
    </div>
  );
}
