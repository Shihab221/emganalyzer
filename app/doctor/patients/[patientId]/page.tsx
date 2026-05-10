'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/Header';
import { useEffect, useState, useCallback } from 'react';
import { FatigueAnalysisButton } from '@/components/FatigueAnalysisButton';
import { ArrowLeft, History, ChevronRight } from 'lucide-react';

interface SessionListItem {
  id: string;
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  startTime: number;
  endTime?: number;
  isActive: boolean;
  dataCount?: number;
  data?: { emg: number; timestamp: number }[];
}

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
}

export default function DoctorPatientSessionsPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = typeof params?.patientId === 'string' ? params.patientId : '';
  const { user, isLoading: authLoading, isDoctor } = useAuth();
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!patientId) return;
    try {
      const [prs, srs] = await Promise.all([
        fetch('/api/patients'),
        fetch(`/api/sessions?patientId=${encodeURIComponent(patientId)}`),
      ]);
      const pjson = await prs.json();
      const sjson = await srs.json();
      const p = (pjson.patients as PatientRow[] | undefined)?.find((x) => x.id === patientId);
      setPatient(p ?? null);
      setSessions(sjson.success ? (sjson.sessions as SessionListItem[]) ?? [] : []);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (!authLoading && user && !isDoctor) {
      router.replace('/dashboard');
      return;
    }
    fetchData();
  }, [fetchData, authLoading, user, isDoctor, router]);

  useEffect(() => {
    const t = setInterval(fetchData, 3000);
    return () => clearInterval(t);
  }, [fetchData]);

  const formatRange = (s: SessionListItem) => {
    const start = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'medium',
      hour12: false,
    }).format(s.startTime);
    const endLabel = s.endTime
      ? new Intl.DateTimeFormat(undefined, { timeStyle: 'medium', hour12: false }).format(s.endTime)
      : '…';
    return `${start} → ${endLabel}`;
  };

  const durationSec = (s: SessionListItem) => {
    const end = s.endTime ?? (s.isActive ? Date.now() : s.startTime);
    return Math.max(0, Math.floor((end - s.startTime) / 1000));
  };

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-wrap gap-4 items-center">
          <button
            type="button"
            onClick={() => router.push('/doctor')}
            className="btn-icon text-sm inline-flex gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Patients
          </button>
          <History className="w-6 h-6 text-emerald-500" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {patient?.name ?? 'Patient'}
            </h1>
            <p className="text-xs text-slate-500">
              Sessions are listed newest first. Open one to view graphs, CSV, and comments.
            </p>
          </div>
        </div>

        {patient && (
          <div className="glass-card text-sm text-slate-600 dark:text-slate-300">
            <p>
              <span className="text-slate-400">Email:</span> {patient.email}
            </p>
            <p className="mt-1">
              {patient.age != null && <span>{patient.age} yrs</span>}
              {patient.gender && <span className="capitalize ml-3">{patient.gender}</span>}
              {patient.heightM != null && <span className="ml-3">{patient.heightM} m</span>}
              {patient.weightKg != null && <span className="ml-3">{patient.weightKg} kg</span>}
              {patient.bmi != null && <span className="ml-3">BMI {patient.bmi}</span>}
              {patient.isRecording && (
                <span className="ml-3 text-green-600 dark:text-green-400 font-medium">
                  Currently recording
                </span>
              )}
            </p>
          </div>
        )}

        {loading ? (
          <p className="text-slate-500">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <p className="text-slate-500">No sessions yet for this patient.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <div className="glass-card flex flex-wrap items-center gap-3 p-0 overflow-hidden">
                  <Link
                    href={`/doctor/patients/${patientId}/session/${s.id}`}
                    className="flex flex-wrap flex-1 min-w-0 items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {formatRange(s)}
                        </span>
                        {s.isActive && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {s.dataCount ?? s.data?.length ?? 0} samples • {durationSec(s)} s
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm text-red-500 font-medium">
                      View <ChevronRight className="w-4 h-4" />
                    </span>
                  </Link>
                  <div className="pr-3 py-2 shrink-0">
                    <FatigueAnalysisButton sessionId={s.id} doctorId={user.id} variant="list" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
