// ============================================
// API Route: /api/sensor-data
// High-throughput endpoint for ESP32 data
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types';
import {
  pushLiveSample,
  getLiveHistory,
  getLatestLive,
  enqueueBatchRecordingSamples,
} from '@/lib/stream-ingest';
import { getLatestLiveSensorData, getLiveSensorHistory } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Support batch mode: array of samples or single sample
    const samples = Array.isArray(data) ? data : [data];
    const serverNow = Date.now();

    // Collect valid samples for live display and recording
    const validSamples: { emg: number; timestampMs: number }[] = [];

    for (const sample of samples) {
      if (typeof sample.emg !== 'number') {
        continue;
      }
      const emgValue = sample.emg;

      // Push to live ring buffer (synchronous, instant)
      pushLiveSample({ emg: emgValue, timestamp: serverNow });

      // Collect for batch recording
      validSamples.push({ emg: emgValue, timestampMs: serverNow });
    }

    // Single batch enqueue for recording (efficient)
    if (validSamples.length > 0) {
      await enqueueBatchRecordingSamples(validSamples);
    }

    return NextResponse.json({
      success: true,
      message: `Received ${validSamples.length} sample(s)`,
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
    let latest = getLatestLive();
    let history = getLiveHistory(300);

    // Cold instance or empty ring: fall back to DB-backed buffer (legacy / multi-instance)
    if (!latest) {
      latest = await getLatestLiveSensorData();
      history = await getLiveSensorHistory(300);
    }

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
