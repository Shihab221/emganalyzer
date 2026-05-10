'use client';

import { useState } from 'react';
import { Activity, Loader2, Sparkles } from 'lucide-react';

export interface FatigueAnalysisResult {
  success: boolean;
  message?: string;
  features?: { rmsMv: number; dominantFreqHz: number; stdMv: number };
  prediction?: number;
  probabilities?: Record<string, number>;
}

interface FatigueAnalysisButtonProps {
  sessionId: string;
  doctorId: string;
  /** Session detail toolbar; panel uses full-width row beneath actions */
  variant?: 'detail' | 'list';
}

function formatProbabilities(p: Record<string, number> | undefined): string {
  if (!p) return '';
  return Object.entries(p)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([cls, v]) => `Class ${cls}: ${(v * 100).toFixed(1)}%`)
    .join(' · ');
}

function outcomeDescription(pred: number): { title: string; hint: string } {
  if (pred === 0) {
    return {
      title: 'Class 0 — lower fatigue signal (model)',
      hint: 'Relative to the other class learned by the model. Confirm clinically.',
    };
  }
  return {
    title: 'Class 1 — elevated fatigue signal (model)',
    hint: 'Relative to the other class learned by the model. Confirm clinically.',
  };
}

/** Shared scroll-safe panel (below the triggering button in document flow). */
function AnalysisSurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative z-10 w-full rounded-xl border border-violet-500/25 bg-white/95 dark:bg-slate-900/95 dark:border-violet-500/35 shadow-sm px-4 py-4 ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

export function FatigueAnalysisButton({ sessionId, doctorId, variant = 'detail' }: FatigueAnalysisButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FatigueAnalysisResult | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/fatigue-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, doctorId }),
      });
      const data = (await res.json()) as FatigueAnalysisResult & { message?: string };
      if (!res.ok || !data.success) {
        setError(data.message ?? 'Analysis failed');
        return;
      }
      setResult(data);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const resultBody =
    result?.success && result.prediction != null && result.features ? (
      <>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-violet-500/20 shrink-0">
            <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white">Fatigue analysis</h3>
            <p className="text-sm font-medium text-violet-700 dark:text-violet-300 mt-1 break-words">
              {outcomeDescription(result.prediction).title}
            </p>
            <p className="text-xs text-slate-500 mt-1">{outcomeDescription(result.prediction).hint}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              {formatProbabilities(result.probabilities)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mt-4">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
            <p className="text-slate-500 text-xs">AC RMS (mV)</p>
            <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">{result.features.rmsMv}</p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
            <p className="text-slate-500 text-xs">Dominant frequency (Hz)</p>
            <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
              {result.features.dominantFreqHz}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
            <p className="text-slate-500 text-xs">σ instantaneous (mV)</p>
            <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">{result.features.stdMv}</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
          Features match model input order: RMS → dominant FFT bin frequency → std dev of waveform (mV).
        </p>
      </>
    ) : null;

  const idleButtonClass =
    variant === 'list'
      ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60 shrink-0 self-center mr-3 my-2'
      : 'order-1 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-700 disabled:opacity-60 shrink-0';

  const panelWrapperClass =
    variant === 'list'
      ? 'w-full basis-full border-t border-slate-200/80 dark:border-slate-700/80 px-4 py-4 bg-slate-50/50 dark:bg-slate-950/30'
      : 'order-3 w-full basis-full mt-0';

  if (variant === 'list') {
    return (
      <>
        <button type="button" onClick={() => void run()} disabled={loading} className={idleButtonClass}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
          Analysis
        </button>
        {loading && (
          <div className={panelWrapperClass}>
            <AnalysisSurface>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                Running model…
              </div>
            </AnalysisSurface>
          </div>
        )}
        {!loading && error && (
          <div className={panelWrapperClass}>
            <AnalysisSurface>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </AnalysisSurface>
          </div>
        )}
        {!loading && resultBody && <div className={panelWrapperClass}><AnalysisSurface>{resultBody}</AnalysisSurface></div>}
      </>
    );
  }

  return (
    <>
      <button type="button" onClick={() => void run()} disabled={loading} className={idleButtonClass}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
        Analysis
      </button>
      {loading && (
        <div className={panelWrapperClass}>
          <AnalysisSurface>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin shrink-0" />
              Running model…
            </div>
          </AnalysisSurface>
        </div>
      )}
      {!loading && error && (
        <div className={panelWrapperClass}>
          <AnalysisSurface>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </AnalysisSurface>
        </div>
      )}
      {!loading && resultBody && <div className={panelWrapperClass}><AnalysisSurface>{resultBody}</AnalysisSurface></div>}
    </>
  );
}
