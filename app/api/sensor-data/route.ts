// ============================================
// API Route: /api/sensor-data
// Handles ESP32 sensor data POST and client GET requests
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { SensorData, ApiResponse } from '@/lib/types';
import {
  addSensorData,
  getSensorHistory,
  getLatestData,
  getOrCreateSession,
  currentPatientId,
  patientProfiles,
  users,
} from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/sensor-data
 * Receives sensor data from ESP32
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (typeof data.emg !== 'number') {
      return NextResponse.json(
        { success: false, message: 'Invalid data format. Required: emg (number)' } as ApiResponse,
        { status: 400 }
      );
    }

    const sensorData: SensorData = {
      emg: data.emg,
      timestamp: data.timestamp || Date.now(),
    };

    addSensorData(sensorData);

    if (currentPatientId) {
      const user = Array.from(users.values()).find(u => u.id === currentPatientId);
      const profile = patientProfiles.get(currentPatientId);
      if (user) {
        const session = getOrCreateSession(currentPatientId, user.name, profile);
        session.data.push(sensorData);
      }
    }

    console.log(`📊 Received: EMG=${data.emg}`);

    return NextResponse.json({
      success: true,
      message: 'Data received successfully',
      data: sensorData,
    } as ApiResponse);
  } catch (error) {
    console.error('Error processing sensor data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process data' } as ApiResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/sensor-data
 * Returns latest data and history for the dashboard
 */
export async function GET() {
  try {
    const latestData = getLatestData();
    const history = getSensorHistory();

    if (!latestData) {
      return NextResponse.json({
        success: true,
        message: 'No data available yet. Waiting for ESP32...',
        latest: null,
        history: [],
      } as ApiResponse);
    }

    return NextResponse.json({
      success: true,
      latest: latestData,
      history: history.slice(-100),
    } as ApiResponse);
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch data' } as ApiResponse,
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
