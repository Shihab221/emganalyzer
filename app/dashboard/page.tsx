'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/Header';
import { EMGChart, EMGChartSkeleton } from '@/components/EMGChart';
import { SensorCard, SensorCardSkeleton } from '@/components/SensorCard';
import { SensorData, ChartDataPoint, ApiResponse } from '@/lib/types';
import { DISPLAY_SAMPLE_RATE_HZ } from '@/lib/constants';
import { rawEmgToMv } from '@/lib/emg-calibration';
import {
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  Download,
  Clock,
  LogOut,
  Play,
  Square,
  UserRound,
} from 'lucide-react';

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

interface PatientDashboardProfile {
  name: string;
  email: string;
  age?: number;
  gender?: string;
  heightM?: number;
  weightKg?: number;
  bmi?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout, isDoctor, isPatient } = useAuth();

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [currentData, setCurrentData] = useState<SensorData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [lastCompletedSessionId, setLastCompletedSessionId] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientDashboardProfile | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/sensor-data');
      const result: ApiResponse = await response.json();

      if (result.success && result.latest) {
        setCurrentData(result.latest);
        setLastUpdate(new Date());
        setIsConnected(true);
        setError(null);

        if (result.history?.length) {
          setSensorData(result.history);
          const formattedData: ChartDataPoint[] = result.history.map((item) => ({
            ...item,
            time: formatChartAxis(item.timestamp),
          }));
          setChartData(formattedData);
        }
      } else {
        setIsConnected(false);
      }
    } catch {
      setError('Failed to connect to server');
      setIsConnected(false);
    } finally {
      setPageLoading(false);
    }
  }, []);

  const syncRecording = useCallback(async () => {
    if (!user?.id || !isPatient) return;
    try {
      const res = await fetch(`/api/recording?patientId=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (data.success && data.recording && data.startedAt) {
        setRecording(true);
        setRecordingStartedAt(data.startedAt);
      } else {
        setRecording(false);
        setRecordingStartedAt(null);
      }
    } catch {
      /* ignore */
    }
  }, [user?.id, isPatient]);

  const loadPatientProfile = useCallback(async () => {
    if (!user?.id || !isPatient) return;
    try {
      const res = await fetch(
        `/api/patient-profile?patientId=${encodeURIComponent(user.id)}`
      );
      const data = await res.json();
      if (data.success && data.profile) {
        setPatientProfile(data.profile as PatientDashboardProfile);
      }
    } catch {
      /* ignore */
    }
  }, [user?.id, isPatient]);

  useEffect(() => {
    if (user?.id && isPatient) {
      loadPatientProfile();
    }
  }, [user?.id, isPatient, loadPatientProfile]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (!authLoading && isDoctor) {
      router.replace('/doctor');
      return;
    }

    fetchData();
    // Poll every 200ms for real-time responsiveness (5 updates/sec)
    // This matches well with ESP32 batching at 500ms intervals
    const interval = setInterval(fetchData, 200);
    return () => clearInterval(interval);
  }, [fetchData, authLoading, user, router, isDoctor]);

  useEffect(() => {
    if (user?.id && isPatient) {
      syncRecording();
    }
  }, [user?.id, isPatient, syncRecording]);

  useEffect(() => {
    if (recording && recordingStartedAt) {
      const tick = () => {
        setElapsedSec(Math.max(0, Math.floor((Date.now() - recordingStartedAt) / 1000)));
      };
      tick();
      tickRef.current = setInterval(tick, 500);
      return () => {
        if (tickRef.current) clearInterval(tickRef.current);
      };
    }
    setElapsedSec(0);
    return undefined;
  }, [recording, recordingStartedAt]);

  const handleStart = async () => {
    if (!user?.id || recordingBusy) return;
    setRecordingBusy(true);
    try {
      const res = await fetch('/api/recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: user.id, action: 'start' }),
      });
      const data = await res.json();
      if (data.success) {
        setRecording(true);
        setRecordingStartedAt(data.startedAt ?? Date.now());
        setLastCompletedSessionId(null);
      }
    } finally {
      setRecordingBusy(false);
    }
  };

  const handleStop = async () => {
    if (!user?.id || recordingBusy) return;
    setRecordingBusy(true);
    try {
      const res = await fetch('/api/recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: user.id, action: 'stop' }),
      });
      const data = await res.json();
      if (data.success && data.session?.id) {
        setRecording(false);
        setRecordingStartedAt(null);
        setLastCompletedSessionId(data.session.id);
      }
    } finally {
      setRecordingBusy(false);
    }
  };

  const handleDownloadCsv = async () => {
    if (!lastCompletedSessionId) return;
    const response = await fetch(`/api/csv?sessionId=${encodeURIComponent(lastCompletedSessionId)}`);
    if (!response.ok) return;
    const blob = await response.blob();
    const cd = response.headers.get('Content-Disposition');
    const fallback = `emg_${lastCompletedSessionId}.csv`;
    const fn =
      cd?.match(/filename="([^"]+)"/)?.[1] ??
      cd?.match(/filename=([^;]+)/)?.[1]?.trim() ??
      fallback;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fn;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const sampleRateDisplayed = DISPLAY_SAMPLE_RATE_HZ;

  const datetimeLine = useMemo(() => {
    if (lastUpdate) {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
        hour12: false,
      }).format(lastUpdate);
    }
    if (currentData) {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
        hour12: false,
      }).format(currentData.timestamp);
    }
    return '—';
  }, [lastUpdate, currentData]);

  if (authLoading || !user || isDoctor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500" />
      </div>
    );
  }

  const connectionLabel = () => {
    if (pageLoading) return { text: 'Connecting…', color: 'text-yellow-500' };
    if (error) return { text: 'Error', color: 'text-red-500' };
    if (!isConnected) return { text: 'Waiting for ESP32', color: 'text-yellow-500' };
    return { text: 'Live stream connected', color: 'text-green-500' };
  };
  const st = connectionLabel();

  return (
    <div className="min-h-screen pb-8">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-slate-400" />
            )}
            <span className={`text-sm font-medium ${st.color}`}>{st.text}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{datetimeLine}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {user.name} ({user.role})
            </span>
            <button
              type="button"
              onClick={fetchData}
              className="btn-icon flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-icon flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {patientProfile && (
          <div className="mb-6 glass-card flex flex-wrap gap-6 items-start">
            <div className="p-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0">
              <UserRound className="w-6 h-6 text-slate-700 dark:text-slate-200" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-2">
                Your profile
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p>
                  <span className="text-slate-400 dark:text-slate-500">Name</span>
                  <br />
                  <span className="font-medium text-slate-800 dark:text-white">{patientProfile.name}</span>
                </p>
                <p>
                  <span className="text-slate-400 dark:text-slate-500">Email</span>
                  <br />
                  <span className="font-medium text-slate-800 dark:text-white break-all">
                    {patientProfile.email}
                  </span>
                </p>
                {patientProfile.age != null && (
                  <p>
                    <span className="text-slate-400 dark:text-slate-500">Age</span>
                    <br />
                    <span className="font-medium text-slate-800 dark:text-white">{patientProfile.age} yrs</span>
                  </p>
                )}
                {patientProfile.gender && (
                  <p>
                    <span className="text-slate-400 dark:text-slate-500">Gender</span>
                    <br />
                    <span className="capitalize font-medium text-slate-800 dark:text-white">
                      {patientProfile.gender}
                    </span>
                  </p>
                )}
                {patientProfile.heightM != null && (
                  <p>
                    <span className="text-slate-400 dark:text-slate-500">Height</span>
                    <br />
                    <span className="font-medium text-slate-800 dark:text-white">
                      {patientProfile.heightM} m
                    </span>
                  </p>
                )}
                {patientProfile.weightKg != null && (
                  <p>
                    <span className="text-slate-400 dark:text-slate-500">Weight</span>
                    <br />
                    <span className="font-medium text-slate-800 dark:text-white">
                      {patientProfile.weightKg} kg
                    </span>
                  </p>
                )}
                {patientProfile.bmi != null && (
                  <p>
                    <span className="text-slate-400 dark:text-slate-500">BMI</span>
                    <br />
                    <span className="font-medium text-slate-800 dark:text-white">{patientProfile.bmi}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recording controls — only buffered server-side samples while recording */}
        <div className="mb-6 glass-card flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Recording</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              Press <strong className="font-medium">Start</strong> to save streamed EMG into your session
              history for your doctor. <strong className="font-medium">Stop</strong> finishes the capture;
              timestamps use real date and time from the server.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!recording ? (
              <button
                type="button"
                disabled={recordingBusy}
                onClick={handleStart}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                <Play className="w-4 h-4" /> Start saving
              </button>
            ) : (
              <button
                type="button"
                disabled={recordingBusy}
                onClick={handleStop}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50 text-sm"
              >
                <Square className="w-4 h-4" /> Stop saving
              </button>
            )}
            {recording && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400 animate-pulse">
                Recording…
              </span>
            )}
          </div>
        </div>

        {lastCompletedSessionId && (
          <div className="mb-6 flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="btn-icon flex items-center gap-2 text-sm text-green-600 dark:text-green-400 border border-green-500/40 rounded-lg px-3 py-2"
            >
              <Download className="w-4 h-4" /> Download last session CSV
            </button>
            <span className="text-xs text-slate-500">
              CSV columns: patient name, age, gender, height (m), weight (kg), BMI, then timestamp,
              emg_mv, window AC RMS (mV), FFT peak magnitude.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {pageLoading ? (
            <>
              <SensorCardSkeleton />
              <SensorCardSkeleton />
              <SensorCardSkeleton />
              <SensorCardSkeleton />
            </>
          ) : (
            <>
              <SensorCard
                title="EMG signal"
                value={
                  currentData != null ? Math.round(rawEmgToMv(currentData.emg) * 100) / 100 : '—'
                }
                unit="mV"
                icon={Activity}
                color="red"
                subtitle="Instantaneous (ADC scaled)"
              />
              <SensorCard
                title="Live buffer"
                value={sensorData.length}
                unit="pts"
                icon={Activity}
                color="blue"
                subtitle="Recent samples on chart"
              />
              <SensorCard
                title="Session time"
                value={recording && recordingStartedAt ? elapsedSec : 0}
                unit="sec"
                icon={Clock}
                color="green"
                subtitle={recording ? 'Since Start' : 'Start recording to time'}
              />
              <SensorCard
                title="Sample rate (display)"
                value={sampleRateDisplayed}
                unit="Hz"
                icon={Activity}
                color="amber"
                subtitle="UI reporting band"
              />
            </>
          )}
        </div>

        <div className="space-y-6">
          {pageLoading ? (
            <EMGChartSkeleton />
          ) : (
            <EMGChart
              data={chartData}
              currentMv={currentData != null ? rawEmgToMv(currentData.emg) : null}
            />
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            EMG Analyzer • patient view — raw EMG only
          </p>
        </div>
      </div>
    </div>
  );
}
