'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/Header';
import { EMGChart, EMGChartSkeleton } from '@/components/EMGChart';
import { SensorCard, SensorCardSkeleton } from '@/components/SensorCard';
import { RMSDisplay } from '@/components/RMSDisplay';
import { FFTDisplay } from '@/components/FFTDisplay';
import { CommentSection } from '@/components/CommentSection';
import { PatientInfo } from '@/components/PatientInfo';
import { SensorData, ChartDataPoint, ApiResponse } from '@/lib/types';
import {
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  Download,
  Clock,
  LogOut,
  History,
  Users,
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

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout, isDoctor } = useAuth();

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [currentData, setCurrentData] = useState<SensorData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/sensor-data');
      const result: ApiResponse = await response.json();

      if (result.success && result.latest) {
        setCurrentData(result.latest);
        setLastUpdate(new Date());
        setIsConnected(true);
        setError(null);

        if (result.history && result.history.length > 0) {
          setSensorData(result.history);
          const formattedData: ChartDataPoint[] = result.history.map((item) => ({
            ...item,
            time: formatTime(item.timestamp),
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
      setIsLoading(false);
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    if (!isDoctor) return;
    try {
      const response = await fetch('/api/patients');
      const result = await response.json();
      if (result.success) {
        setPatients(result.patients);
        const connected = result.patients.find((p: Patient) => p.isConnected);
        if (connected) {
          setSelectedPatient(connected);
        }
      }
    } catch {
      console.error('Failed to fetch patients');
    }
  }, [isDoctor]);

  const connectToPatient = async (patientId: string | null) => {
    try {
      await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId }),
      });
      await fetchPatients();
    } catch {
      console.error('Failed to connect to patient');
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    fetchData();
    if (isDoctor) {
      fetchPatients();
    }

    const interval = setInterval(fetchData, 400);
    const patientsInterval = isDoctor ? setInterval(fetchPatients, 5000) : null;

    return () => {
      clearInterval(interval);
      if (patientsInterval) clearInterval(patientsInterval);
    };
  }, [fetchData, fetchPatients, authLoading, user, router, isDoctor]);

  useEffect(() => {
    if (sensorData.length > 0 && selectedPatient) {
      setCurrentSessionId(`session-${selectedPatient.id}-${Date.now()}`);
    }
  }, [selectedPatient, sensorData.length]);

  const handleDownloadCSV = async () => {
    try {
      const response = await fetch('/api/csv');
      if (!response.ok) throw new Error('Failed to download');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emg_data_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      console.error('Failed to download CSV');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getConnectionStatus = () => {
    if (isLoading) return { text: 'Connecting...', color: 'text-yellow-500' };
    if (error) return { text: 'Error', color: 'text-red-500' };
    if (!isConnected) return { text: 'Waiting for ESP32', color: 'text-yellow-500' };
    return { text: 'Connected', color: 'text-green-500' };
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const status = getConnectionStatus();

  return (
    <div className="min-h-screen pb-8">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-slate-400" />
              )}
              <span className={`text-sm font-medium ${status.color}`}>
                {status.text}
              </span>
              {lastUpdate && isConnected && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {user.name} ({user.role})
            </span>

            {isDoctor && (
              <button
                onClick={() => router.push('/history')}
                className="btn-icon flex items-center gap-2 text-sm"
              >
                <History className="w-4 h-4" />
                History
              </button>
            )}

            <button
              onClick={fetchData}
              className="btn-icon flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            {isConnected && sensorData.length > 0 && (
              <button
                onClick={handleDownloadCSV}
                className="btn-icon flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
            )}

            <button
              onClick={handleLogout}
              className="btn-icon flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {isDoctor && (
          <div className="mb-6 glass-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                  Select Patient
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Choose a patient to monitor their EMG data
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {patients.length === 0 ? (
                <p className="text-sm text-slate-400">No patients registered yet</p>
              ) : (
                patients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => connectToPatient(patient.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedPatient?.id === patient.id
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {patient.name}
                    {patient.age && <span className="ml-1 opacity-70">({patient.age}y)</span>}
                    {patient.isActive && (
                      <span className="ml-2 w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse"></span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          {isLoading ? (
            <>
              <SensorCardSkeleton />
              <SensorCardSkeleton />
              <SensorCardSkeleton />
              <SensorCardSkeleton />
            </>
          ) : (
            <>
              <SensorCard
                title="EMG Signal"
                value={currentData?.emg ?? '---'}
                unit="raw"
                icon={Activity}
                color="red"
                subtitle="Muscle activity"
              />
              <SensorCard
                title="Samples"
                value={sensorData.length}
                unit="pts"
                icon={Activity}
                color="blue"
                subtitle="Data points"
              />
              <SensorCard
                title="Session Time"
                value={sensorData.length > 0 ? Math.round((Date.now() - sensorData[0].timestamp) / 1000) : 0}
                unit="sec"
                icon={Clock}
                color="green"
                subtitle="Duration"
              />
              <SensorCard
                title="Sample Rate"
                value={2}
                unit="Hz"
                icon={Activity}
                color="amber"
                subtitle="Frequency"
              />
            </>
          )}
        </div>

        <div className="space-y-6">
          {isLoading ? (
            <EMGChartSkeleton />
          ) : (
            <EMGChart data={chartData} currentValue={currentData?.emg ?? 0} />
          )}

          {isDoctor && (
            <>
              {selectedPatient && (
                <PatientInfo
                  name={selectedPatient.name}
                  age={selectedPatient.age}
                  gender={selectedPatient.gender}
                  isConnected={selectedPatient.isConnected}
                />
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RMSDisplay data={sensorData} />
                <FFTDisplay data={sensorData} />
              </div>

              {currentSessionId && selectedPatient && (
                <CommentSection
                  sessionId={currentSessionId}
                  doctorId={user.id}
                  doctorName={user.name}
                />
              )}
            </>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            EMG Analyzer • Real-time Biosignal Monitoring
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Polling interval: 400ms • {isDoctor ? 'Doctor View' : 'Patient View'}
          </p>
        </div>
      </div>
    </div>
  );
}
