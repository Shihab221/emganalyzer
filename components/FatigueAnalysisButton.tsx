'use client';

import { useState } from 'react';
import { Activity, Loader2, Sparkles, X } from 'lucide-react';

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
  /** Full button + panel on session detail; compact opens a modal on the sessions list */
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

export function FatigueAnalysisButton({ sessionId, doctorId, variant = 'detail' }: FatigueAnalysisButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FatigueAnalysisResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const run = async () => {
    if (variant === 'list') {
      setModalOpen(true);
    }
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

  const panel = (insideModal?: boolean) => {
    const body =
      error || (result?.success && result.prediction != null && result.features) ? (
        <>
          {error && (
            <p className={`text-sm text-red-600 dark:text-red-400 ${insideModal ? '' : 'p-4 pb-0'}`}>{error}</p>
          )}
          {result?.success && result.prediction != null && result.features && (
            <div className={insideModal ? '' : 'p-4 space-y-4'}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-violet-500/20">
                  <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Fatigue analysis</h3>
                  <p className="text-sm font-medium text-violet-700 dark:text-violet-300 mt-1">
                    {outcomeDescription(result.prediction).title}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{outcomeDescription(result.prediction).hint}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                    {formatProbabilities(result.probabilities)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
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
              <p className="text-xs text-slate-500">
                Features match model input order: RMS → dominant FFT bin frequency → std dev of waveform (mV).
              </p>
            </div>
          )}
        </>
      ) : null;

    if (!insideModal && !body) return null;

    return (
      <div
        className={
          insideModal
            ? 'space-y-4'
            : 'glass-card border border-violet-500/20 bg-violet-500/5 mt-4'
        }
      >
        {body}
      </div>
    );
  };

  if (variant === 'list') {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void run();
          }}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
          Analysis
        </button>

        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            role="dialog"
            aria-modal="true"
            onClick={() => {
              setModalOpen(false);
              setError(null);
              setResult(null);
            }}
          >
            <div
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Session analysis</h2>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setError(null);
                    setResult(null);
                  }}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                {loading && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" /> Running model…
                  </div>
                )}
                {!loading && panel(true)}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 justify-end items-center">
        <button
          type="button"
          onClick={() => void run()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
          Analysis
        </button>
      </div>
      {!loading && panel()}
    </div>
  );
}
