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
          <ul className="space-y-3">
            {sortedPatients.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/doctor/patients/${p.id}`}
                  className="glass-card flex flex-wrap items-center justify-between gap-4 hover:border-emerald-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <div className="p-2.5 rounded-xl bg-slate-200 dark:bg-slate-700">
                      <UserRound className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {p.name}
                        </span>
                        {p.isRecording && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Recording now
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{p.email}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {p.age != null && <span>{p.age} yrs</span>}
                        {p.gender && (
                          <span className="capitalize ml-2">{p.gender}</span>
                        )}
                        {p.heightM != null && (
                          <span className="ml-2">{p.heightM} m</span>
                        )}
                        {p.weightKg != null && (
                          <span className="ml-2">{p.weightKg} kg</span>
                        )}
                        {p.bmi != null && (
                          <span className="ml-2">BMI {p.bmi}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      <Activity className="w-4 h-4 text-red-500" />
                      {counts(p.id)} recording{counts(p.id) === 1 ? '' : 's'}
                    </span>
                    {lastStarted(p.id) && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <CalendarClock className="w-4 h-4" />
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                          hour12: false,
                        }).format(lastStarted(p.id)!)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                      Open <ArrowRight className="w-4 h-4" />
                    </span>
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
