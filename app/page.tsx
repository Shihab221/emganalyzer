'use client';

// ============================================
// Main Dashboard Page - EMG Analyzer
// Real-time sensor data visualization with beautiful UI
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { EMGChart, EMGChartSkeleton } from '@/components/EMGChart';
import { MPUChart, MPUChartSkeleton } from '@/components/MPUChart';
import { SensorCard, SensorCardSkeleton } from '@/components/SensorCard';
import { SensorData, ChartDataPoint, ApiResponse } from '@/lib/types';
import { 
  Activity, 
  Move3d, 
  ArrowRight, 
  ArrowUp, 
  ArrowUpRight,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';

// ============================================
// Dashboard Component
// ============================================
export default function Dashboard() {
  // State for sensor data
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [currentData, setCurrentData] = useState<SensorData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Format timestamp for chart display
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Fetch sensor data from API
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/sensor-data');
      const result: ApiResponse = await response.json();

      if (result.success && result.latest) {
        // Update current data
        setCurrentData(result.latest);
        setLastUpdate(new Date());
        setIsConnected(true);
        setError(null);

        // Transform history data for charts
        if (result.history && result.history.length > 0) {
          const formattedData: ChartDataPoint[] = result.history.map((item) => ({
            ...item,
            time: formatTime(item.timestamp),
          }));
          setChartData(formattedData);
        }
      } else {
        // No data yet - show waiting state
        setIsConnected(false);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to connect to server');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Poll API every 400ms for real-time updates
  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up polling interval
    const interval = setInterval(fetchData, 400);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [fetchData]);

  // Calculate connection status display
  const getConnectionStatus = () => {
    if (isLoading) return { text: 'Connecting...', color: 'text-yellow-500' };
    if (error) return { text: 'Error', color: 'text-red-500' };
    if (!isConnected) return { text: 'Waiting for ESP32', color: 'text-yellow-500' };
    return { text: 'Connected', color: 'text-green-500' };
  };

  const status = getConnectionStatus();

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Connection Status Bar */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
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
          
          {/* Manual Refresh Button */}
          <button
            onClick={fetchData}
            className="btn-icon flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Sensor Value Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {isLoading ? (
            // Loading skeletons
            <>
              <SensorCardSkeleton />
              <SensorCardSkeleton />
              <SensorCardSkeleton />
              <SensorCardSkeleton />
            </>
          ) : (
            <>
              {/* EMG Card */}
              <SensorCard
                title="EMG Signal"
                value={currentData?.emg ?? '---'}
                unit="raw"
                icon={Activity}
                color="red"
                subtitle="Muscle activity"
              />

              {/* Ax Card */}
              <SensorCard
                title="Accel X"
                value={currentData?.ax ?? 0}
                unit="g"
                icon={ArrowRight}
                color="blue"
                subtitle="Left/Right"
              />

              {/* Ay Card */}
              <SensorCard
                title="Accel Y"
                value={currentData?.ay ?? 0}
                unit="g"
                icon={ArrowUp}
                color="green"
                subtitle="Forward/Back"
              />

              {/* Az Card */}
              <SensorCard
                title="Accel Z"
                value={currentData?.az ?? 0}
                unit="g"
                icon={ArrowUpRight}
                color="amber"
                subtitle="Up/Down"
              />
            </>
          )}
        </div>

        {/* Charts Section */}
        <div className="space-y-6">
          {/* EMG Chart - Full Width */}
          {isLoading ? (
            <EMGChartSkeleton />
          ) : (
            <EMGChart
              data={chartData}
              currentValue={currentData?.emg ?? 0}
            />
          )}

          {/* MPU6050 Chart - Full Width */}
          {isLoading ? (
            <MPUChartSkeleton />
          ) : (
            <MPUChart
              data={chartData}
              currentAx={currentData?.ax ?? 0}
              currentAy={currentData?.ay ?? 0}
              currentAz={currentData?.az ?? 0}
            />
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            EMG Analyzer • Real-time Biosignal Monitoring
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Polling interval: 400ms • History: Last 100 samples
          </p>
        </div>
      </div>
    </div>
  );
}
