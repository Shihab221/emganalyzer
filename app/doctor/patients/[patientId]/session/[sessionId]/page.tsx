'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/Header';
import { EMGChart } from '@/components/EMGChart';
import { RMSDisplay } from '@/components/RMSDisplay';
import { FFTDisplay } from '@/components/FFTDisplay';
import { PatientInfo } from '@/components/PatientInfo';
import { CommentSection } from '@/components/CommentSection';
import { DISPLAY_SAMPLE_RATE_HZ } from '@/lib/constants';
import { rawEmgToMv } from '@/lib/emg-calibration';
import type { ChartDataPoint, EMGSession } from '@/lib/types';
import { SensorCard } from '@/components/SensorCard';
import { Activity, ArrowLeft, Clock, Download } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

function formatChartAxis(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(timestamp);
}

export default function DoctorSessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = typeof params?.patientId === 'string' ? params.patientId : '';
  const sessionId = typeof params?.sessionId === 'string' ? params.sessionId : '';

  const { user, isLoading: authLoading, isDoctor } = useAuth();
  const [session, setSession] = useState<EMGSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/sessions?sessionId=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (!data.success || !data.session) {
        setError('Session not found');
        return;
      }
      setSession(data.session as EMGSession);
      setError(null);
    } catch {
      setError('Failed to load session');
    }
  }, [sessionId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (!authLoading && user && !isDoctor) {
      router.replace('/dashboard');
      return;
    }
  }, [authLoading, user, isDoctor, router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!session?.isActive) return;
    const id = setInterval(load, 1000);
    return () => clearInterval(id);
  }, [session?.isActive, load]);

  const chartData: ChartDataPoint[] =
    session?.data.map((d) => ({
      ...d,
      time: formatChartAxis(d.timestamp),
    })) ?? [];

  const durationSec =
    session && (session.endTime ?? (session.isActive ? Date.now() : session.startTime)) >= session.startTime
      ? Math.floor(
          ((session.endTime ?? (session.isActive ? Date.now() : session.startTime)) -
            session.startTime) /
            1000
        )
      : 0;

  const latestMv =
    session && session.data.length
      ? Math.round(rawEmgToMv(session.data[session.data.length - 1].emg) * 100) / 100
      : null;

  const downloadCsv = async () => {
    if (!sessionId) return;
    const response = await fetch(`/api/csv?sessionId=${encodeURIComponent(sessionId)}`);
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cd = response.headers.get('Content-Disposition');
    a.download =
      cd?.match(/filename="([^"]+)"/)?.[1]?.replace(/[^\w.-]/g, '_') ??
      `emg_session_${sessionId}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (authLoading || !user || !isDoctor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 rounded-full border-b-2 border-red-500" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen pb-10">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <button type="button" className="btn-icon mb-4" onClick={() => router.back()}>
            ← Back
          </button>
          <p className="text-red-600">{error ?? 'Not found'}</p>
        </div>
      </div>
    );
  }

  if (patientId && session.patientId !== patientId) {
    return (
      <div className="min-h-screen pb-10">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-red-600">Session does not match this patient URL.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => router.push(`/doctor/patients/${session.patientId}`)}
            className="btn-icon text-sm inline-flex gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Sessions
          </button>
          <div className="text-right text-xs text-slate-500">
            <p>
              Started:{' '}
              <span className="text-slate-700 dark:text-slate-300">
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'full',
                  timeStyle: 'medium',
                  hour12: false,
                }).format(session.startTime)}
              </span>
            </p>
            {session.endTime && (
              <p className="mt-1">
                Ended:{' '}
                <span className="text-slate-700 dark:text-slate-300">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'full',
                    timeStyle: 'medium',
                    hour12: false,
                  }).format(session.endTime)}
                </span>
              </p>
            )}
          </div>
        </div>

        <PatientInfo
          name={session.patientName}
          age={session.patientAge}
          gender={session.patientGender}
          isConnected={session.isActive}
        />

        <div className="flex flex-wrap gap-3 justify-end">
          {session.data.length > 0 && (
            <button
              type="button"
              onClick={downloadCsv}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
            >
              <Download className="w-4 h-4" /> Download CSV (timestamp · mV columns)
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SensorCard
            title="EMG (latest)"
            value={latestMv != null ? latestMv : '—'}
            unit="mV"
            icon={Activity}
            color="red"
            subtitle="Instantaneous scaled"
          />
          <SensorCard
            title="Samples"
            value={session.data.length}
            unit="pts"
            icon={Activity}
            color="blue"
            subtitle="In this recording"
          />
          <SensorCard
            title="Session duration"
            value={durationSec}
            unit="sec"
            icon={Clock}
            color="green"
            subtitle={session.isActive ? 'Still recording…' : 'Completed'}
          />
          <SensorCard
            title="Sample rate (display)"
            value={DISPLAY_SAMPLE_RATE_HZ}
            unit="Hz"
            icon={Activity}
            color="amber"
            subtitle="Reporting band"
          />
        </div>

        <EMGChart data={chartData} currentMv={latestMv} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RMSDisplay data={session.data} />
          <FFTDisplay data={session.data} />
        </div>

        <CommentSection
          sessionId={session.id}
          doctorId={user.id}
          doctorName={user.name}
        />
      </div>
    </div>
  );
}
