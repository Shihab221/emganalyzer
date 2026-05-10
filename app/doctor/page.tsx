'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/Header';
import {
  ArrowRight,
  LogOut,
  Stethoscope,
  UserRound,
  Activity,
  CalendarClock,
} from 'lucide-react';

interface PatientRow {
  id: string;
  name: string;
  email: string;
  age?: number;
  gender?: string;
  heightM?: number;
  weightKg?: number;
  bmi?: number;
  isRecording: boolean;
  activeSessionId: string | null;
  createdAt: number;
}

interface SessionListItem {
  id: string;
  patientId: string;
  startTime: number;
}

export default function DoctorHomePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout, isDoctor } = useAuth();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [pr, sr] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/sessions'),
      ]);
      const p = await pr.json();
      const s = await sr.json();
      if (p.success) setPatients(p.patients);
      if (s.success) setSessions(s.sessions);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (!authLoading && user && !isDoctor) {
      router.replace('/dashboard');
      return;
    }
    if (user && isDoctor) {
      fetchAll();
    }
  }, [authLoading, user, isDoctor, router, fetchAll]);

  const logoutClick = () => {
    logout();
    router.push('/login');
  };

  const counts = (patientId: string) =>
    sessions.filter((ses) => ses.patientId === patientId).length;

  const lastStarted = (patientId: string) => {
    const list = sessions.filter((ses) => ses.patientId === patientId);
    if (!list.length) return null;
    return Math.max(...list.map((x) => x.startTime));
  };

  const sortedPatients = [...patients].sort((a, b) => {
    if (a.isRecording !== b.isRecording) return a.isRecording ? -1 : 1;
    const la = lastStarted(a.id) ?? 0;
    const lb = lastStarted(b.id) ?? 0;
    if (la !== lb) return lb - la;
    return b.createdAt - a.createdAt;
  });

  if (authLoading || !user || !isDoctor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 rounded-full border-b-2 border-red-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10">
      <Header />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Patients
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Open a patient to review captured sessions (with comments per recording).
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <span className="text-sm text-slate-600 dark:text-slate-300">{user.name}</span>
            <button
              type="button"
              onClick={() => fetchAll()}
              className="btn-icon text-sm text-slate-600 dark:text-slate-300"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={logoutClick}
              className="btn-icon flex gap-2 text-sm text-red-600 dark:text-red-400"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500">Loading patient list…</p>
        ) : sortedPatients.length === 0 ? (
          <p className="text-slate-500">No registered patients.</p>
        ) : (
          <ul className="space-y-4">
            {sortedPatients.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/doctor/patients/${p.id}`}
                  className="doctor-roster-card group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-500"
                >
                  <div className="flex flex-1 flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-2xl rounded-br-md bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-600/25 ring-[3px] ring-white/70 dark:ring-slate-800/90">
                          <UserRound className="h-[1.35rem] w-[1.35rem]" aria-hidden />
                        </div>
                        {p.isRecording && (
                          <span
                            className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse"
                            title="Recording"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                            {p.name}
                          </span>
                          {p.isRecording && (
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                              Live
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{p.email}</p>
                        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {p.age != null && <span className="text-slate-500 dark:text-slate-400">{p.age} yrs</span>}
                          {p.gender && <span className="capitalize">{p.gender}</span>}
                          {p.heightM != null && <span>{p.heightM} m</span>}
                          {p.weightKg != null && <span>{p.weightKg} kg</span>}
                          {p.bmi != null && <span className="text-teal-600/90 dark:text-teal-400/90">BMI {p.bmi}</span>}
                        </div>
                      </div>
                    </div>
                    {/* Stats + CTA */}
                    <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-4 border-t border-slate-200/70 pt-4 dark:border-white/10 sm:w-auto sm:border-t-0 sm:pt-0 sm:pl-2">
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-2 rounded-xl bg-white/65 px-3 py-1.5 shadow-sm dark:bg-slate-950/35">
                          <Activity className="h-4 w-4 shrink-0 text-red-500" aria-hidden />
                          <span className="font-semibold tabular-nums">{counts(p.id)}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">session{counts(p.id) === 1 ? '' : 's'}</span>
                        </span>
                        {lastStarted(p.id) ? (
                          <span className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <CalendarClock className="h-4 w-4 shrink-0 text-teal-500" aria-hidden />
                            {new Intl.DateTimeFormat(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                              hour12: false,
                            }).format(lastStarted(p.id)!)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic dark:text-slate-500">No sessions yet</span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-teal-600/30 transition-all group-hover:shadow-lg group-hover:shadow-teal-500/35 group-hover:brightness-110 dark:shadow-teal-900/40">
                        Open
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
