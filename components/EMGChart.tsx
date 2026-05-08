'use client';

import {
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
import { rawEmgToMv, EMG_ADC_FULL_SCALE_MV } from '@/lib/emg-calibration';

interface EMGChartProps {
  data: ChartDataPoint[];
  /** Prefer latest instantaneous mV shown in header when live count is ahead of `data` */
  currentMv?: number | null;
}

export function EMGChart({ data, currentMv }: EMGChartProps) {
  const plotData =
    data.length === 0
      ? []
      : data.map((row) => ({
          ...row,
          emgMv: rawEmgToMv(row.emg),
        }));

  const displayMv =
    currentMv != null
      ? Math.round(currentMv * 100) / 100
      : plotData.length > 0
        ? plotData[plotData.length - 1].emgMv
        : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const row = payload[0].payload as ChartDataPoint & { emgMv?: number };
      const when =
        typeof row.timestamp === 'number'
          ? new Intl.DateTimeFormat(undefined, {
              dateStyle: 'medium',
              timeStyle: 'medium',
              hour12: false,
            }).format(row.timestamp)
          : payload[0].label;
      const mv = payload[0].value ?? row.emgMv;
      return (
        <div className="glass-card-sm !p-3 !rounded-lg shadow-xl border border-red-500/20">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{when}</p>
          <p className="text-lg font-bold text-red-500">
            {mv != null ? Number(mv).toFixed(2) : '—'}
            <span className="text-xs font-normal ml-1">mV</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card animate-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              EMG muscle signal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ADC waveform scaled to mV (counts → {(EMG_ADC_FULL_SCALE_MV).toLocaleString()} mV FS)
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-red-500" />
            <span className="text-2xl sm:text-3xl font-bold text-red-500">
              {displayMv.toFixed(1)}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Latest (instantaneous · mV)
          </p>
        </div>
      </div>

      <div className="h-64 sm:h-80">
        {plotData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Activity className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">Waiting for EMG data…</p>
            <p className="text-xs mt-1">Connect your ESP32 to start</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={plotData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
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
                domain={[0, Math.round(EMG_ADC_FULL_SCALE_MV * 100) / 100]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}`}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="emgMv"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#emgGradient)"
                animationDuration={300}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
        <div className="flex flex-wrap gap-2 justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Vertical axis: mV ({EMG_ADC_FULL_SCALE_MV.toLocaleString()} mV FS · 4095 counts)</span>
          <span>Axis / tooltips use device local date &amp; time</span>
        </div>
      </div>
    </div>
  );
}

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
