// ============================================
// API Route: /api/sensor-data
// High-throughput endpoint for ESP32 data
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types';
import {
  addLiveSensorSample,
  appendToActiveRecording,
  getLiveSensorHistory,
  getLatestLiveSensorData,
} from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Support batch mode: array of samples or single sample
    const samples = Array.isArray(data) ? data : [data];
    
    for (const sample of samples) {
      if (typeof sample.emg !== 'number') {
        continue; // Skip invalid samples
      }

      const emgValue = sample.emg;
      
      // Add to live display buffer and active recording (if any)
      await Promise.all([
        addLiveSensorSample(emgValue),
        appendToActiveRecording(emgValue),
      ]);
    }

    console.log(`📊 Received ${samples.length} sample(s), last EMG=${samples[samples.length - 1]?.emg}`);

    return NextResponse.json({
      success: true,
      message: `Received ${samples.length} sample(s)`,
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
    const [latest, history] = await Promise.all([
      getLatestLiveSensorData(),
      getLiveSensorHistory(300), // Get last 300 samples for smooth display
    ]);

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
      history,
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
