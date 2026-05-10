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

  return (
    <div className="glass-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
            RMS analysis
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rolling window on AC mV samples (mean removed inside window)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Window size</p>
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
            {rms.windowSize}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">samples</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Min / Max</p>
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
            {stats.min.toFixed(1)} / {stats.max.toFixed(1)} <span className="text-xs">mV</span>
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Instantaneous waveform</p>
        </div>
      </div>
    </div>
  );
}
