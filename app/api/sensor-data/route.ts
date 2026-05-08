// ============================================
// API Route: /api/sensor-data
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { SensorData, ApiResponse } from '@/lib/types';
import {
  addLiveSensorSample,
  appendToActiveRecording,
  getSensorHistory,
  getLatestData,
} from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (typeof data.emg !== 'number') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid data format. Required: emg (number)',
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Always use server wall-clock time for storage and graphs (ESP millis wraps / drifts).
    const serverNow = Date.now();
    const sensorData: SensorData = {
      emg: data.emg,
      timestamp: serverNow,
    };

    addLiveSensorSample(sensorData);
    appendToActiveRecording(sensorData);

    console.log(`📊 Received: EMG=${data.emg} @ ${new Date(serverNow).toISOString()}`);

    return NextResponse.json({
      success: true,
      message: 'Data received successfully',
      data: sensorData,
    } as ApiResponse);
  } catch (error) {
    console.error('Error processing sensor data:', error);
    return NextResponse.json({ success: false, message: 'Failed to process data' } as ApiResponse, {
      status: 500,
    });
  }
}

export async function GET() {
  try {
    const latest = getLatestData();
    const history = getSensorHistory();

    if (!latest) {
      return NextResponse.json({
        success: true,
        message: 'No data available yet. Waiting for ESP32...',
        latest: null,
        history: [],
      } as ApiResponse);
    }

    return NextResponse.json({
      success: true,
      latest,
      history: history.slice(-100),
    } as ApiResponse);
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch data' } as ApiResponse, {
      status: 500,
    });
  }
}

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
