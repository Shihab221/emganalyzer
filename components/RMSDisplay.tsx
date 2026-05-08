'use client';

import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { SensorData } from '@/lib/types';
import { calculateRMS, calculateStats } from '@/lib/signal-analysis';

interface RMSDisplayProps {
  data: SensorData[];
}

export function RMSDisplay({ data }: RMSDisplayProps) {
  const rms = useMemo(() => calculateRMS(data, 50), [data]);
  const stats = useMemo(() => calculateStats(data), [data]);

  const getRMSLevel = (value: number): { label: string; color: string } => {
    if (value < 500) return { label: 'Low', color: 'text-green-500' };
    if (value < 1500) return { label: 'Moderate', color: 'text-yellow-500' };
    if (value < 2500) return { label: 'High', color: 'text-orange-500' };
    return { label: 'Very High', color: 'text-red-500' };
  };

  const level = getRMSLevel(rms.value);

  return (
    <div className="glass-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
            RMS Analysis
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Root Mean Square of EMG signal
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">RMS Value</p>
          <p className="text-2xl font-bold text-purple-500">{rms.value.toFixed(1)}</p>
          <p className={`text-sm font-medium mt-1 ${level.color}`}>{level.label}</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Window Size</p>
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
            {rms.windowSize}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">samples</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Min / Max</p>
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
            {stats.min} / {stats.max}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Mean ± StdDev</p>
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
            {stats.mean.toFixed(0)} ± {stats.stdDev.toFixed(0)}
          </p>
        </div>
      </div>
    </div>
  );
}
