'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/Header';
import { EMGSession, DoctorComment } from '@/lib/types';
import {
  History,
  User,
  Calendar,
  Clock,
  MessageSquare,
  ArrowLeft,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  email: string;
  age?: number;
  gender?: string;
  isConnected: boolean;
  isActive: boolean;
}

export default function HistoryPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isDoctor } = useAuth();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<EMGSession[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, DoctorComment[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [patientsRes, sessionsRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/sessions'),
      ]);

      const patientsData = await patientsRes.json();
      const sessionsData = await sessionsRes.json();

      if (patientsData.success) {
        setPatients(patientsData.patients);
      }
      if (sessionsData.success) {
        setSessions(sessionsData.sessions);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchComments = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/comments?sessionId=${sessionId}`);
      const data = await response.json();
      if (data.success) {
        setComments(prev => ({ ...prev, [sessionId]: data.comments }));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (!authLoading && !isDoctor) {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, [fetchData, authLoading, user, router, isDoctor]);

  const toggleSession = (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
      if (!comments[sessionId]) {
        fetchComments(sessionId);
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (start: number, end?: number) => {
    const duration = (end || Date.now()) - start;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!user || !isDoctor) {
    return null;
  }

  const connectedPatients = patients.filter(p => p.isActive || p.isConnected);
  const otherPatients = patients.filter(p => !p.isActive && !p.isConnected);

  return (
    <div className="min-h-screen pb-8">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-icon flex items-center gap-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-red-500" />
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
              Patient History
            </h1>
          </div>
        </div>

        {connectedPatients.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Currently Active Patients
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connectedPatients.map(patient => (
                <div
                  key={patient.id}
                  className="glass-card border-2 border-green-500/30 bg-green-50/50 dark:bg-green-900/10"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-green-500 shadow-lg">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white">
                        {patient.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {patient.email}
                      </p>
                    </div>
                    <span className="ml-auto px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                      Active
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-slate-600 dark:text-slate-400">
                    {patient.age && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {patient.age} years
                      </span>
                    )}
                    {patient.gender && (
                      <span className="capitalize">{patient.gender}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
            All Patients
          </h2>
          {otherPatients.length === 0 && connectedPatients.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No patients registered yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherPatients.map(patient => (
                <div key={patient.id} className="glass-card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700">
                      <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white">
                        {patient.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {patient.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm text-slate-600 dark:text-slate-400">
                    {patient.age && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {patient.age} years
                      </span>
                    )}
                    {patient.gender && (
                      <span className="capitalize">{patient.gender}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
            Session History
          </h2>
          {sessions.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No sessions recorded yet</p>
          ) : (
            <div className="space-y-4">
              {sessions.map(session => (
                <div key={session.id} className="glass-card">
                  <button
                    onClick={() => toggleSession(session.id)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl shadow-lg ${
                        session.isActive
                          ? 'bg-green-500'
                          : 'bg-gradient-to-br from-red-500 to-orange-500'
                      }`}>
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-800 dark:text-white">
                            {session.patientName}
                          </h3>
                          {session.isActive && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                              Live
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(session.startTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatTime(session.startTime)}
                          </span>
                          <span>
                            Duration: {formatDuration(session.startTime, session.endTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {session.data.length} samples
                      </span>
                      {expandedSession === session.id ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {expandedSession === session.id && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Patient Age</p>
                          <p className="font-semibold text-slate-700 dark:text-slate-300">
                            {session.patientAge ? `${session.patientAge} years` : 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Gender</p>
                          <p className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                            {session.patientGender || 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Data Points</p>
                          <p className="font-semibold text-slate-700 dark:text-slate-300">
                            {session.data.length}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                          <p className={`font-semibold ${session.isActive ? 'text-green-500' : 'text-slate-500'}`}>
                            {session.isActive ? 'Active' : 'Completed'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Doctor Notes
                        </h4>
                        {comments[session.id]?.length > 0 ? (
                          <div className="space-y-2">
                            {comments[session.id].map(comment => (
                              <div
                                key={comment.id}
                                className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                    {comment.doctorName}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {new Date(comment.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {comment.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400">No notes for this session</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            EMG Analyzer • Patient History
          </p>
        </div>
      </div>
    </div>
  );
}
