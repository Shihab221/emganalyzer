'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Waves } from 'lucide-react';
import { SensorData } from '@/lib/types';
import { calculateFFT, inferSampleRateHz } from '@/lib/signal-analysis';

interface FFTDisplayProps {
  data: SensorData[];
}

export function FFTDisplay({ data }: FFTDisplayProps) {
  const fft = useMemo(() => {
    const rate = inferSampleRateHz(data);
    return calculateFFT(data, Math.max(rate, 0.1));
  }, [data]);

  const chartData = useMemo(() => {
    return fft.frequencies.map((freq, i) => ({
      frequency: freq,
      magnitude: fft.magnitudes[i],
    })).slice(0, 20);
  }, [fft]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card-sm !p-3 !rounded-lg shadow-xl border border-cyan-500/20">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Freq: {payload[0].payload.frequency.toFixed(2)} Hz
          </p>
          <p className="text-lg font-bold text-cyan-500">
            {payload[0].value.toFixed(1)}
            <span className="text-xs font-normal ml-1">mV</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 shadow-lg">
            <Waves className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              FFT Analysis
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              DFT magnitude on AC mV samples (excluding DC bin for peak readout)
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm text-slate-500 dark:text-slate-400">Dominant Frequency</p>
          <p className="text-xl font-bold text-cyan-500">
            {fft.dominantFrequency.toFixed(2)} Hz
          </p>
        </div>
      </div>

      <div className="h-48">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Waves className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">Waiting for data...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="frequency"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}Hz`}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="magnitude"
                fill="#06b6d4"
                radius={[4, 4, 0, 0]}
                animationDuration={300}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
