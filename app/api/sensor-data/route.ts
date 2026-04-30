// ============================================
// API Route: /api/sensor-data
// Handles ESP32 sensor data POST and client GET requests
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { SensorData, ApiResponse } from '@/lib/types';

// ============================================
// In-Memory Data Storage
// Keeps the last 100 data points for charting
// Note: This resets when the server restarts
// For production, consider using a database
// ============================================
const MAX_HISTORY_SIZE = 100;
let sensorHistory: SensorData[] = [];
let latestData: SensorData | null = null;

/**
 * POST /api/sensor-data
 * Receives sensor data from ESP32
 * 
 * Expected JSON body:
 * {
 *   "emg": 2456,
 *   "ax": 0.45,
 *   "ay": -1.23,
 *   "az": 9.81,
 *   "timestamp": 123456789
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the incoming JSON data
    const data: SensorData = await request.json();
    
    // Validate required fields
    if (
      typeof data.emg !== 'number' ||
      typeof data.ax !== 'number' ||
      typeof data.ay !== 'number' ||
      typeof data.az !== 'number'
    ) {
      return NextResponse.json(
        { success: false, message: 'Invalid data format. Required: emg, ax, ay, az (numbers)' } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Add timestamp if not provided
    if (!data.timestamp) {
      data.timestamp = Date.now();
    }
    
    // Store the latest data
    latestData = data;
    
    // Add to history (keep last MAX_HISTORY_SIZE entries)
    sensorHistory.push(data);
    if (sensorHistory.length > MAX_HISTORY_SIZE) {
      sensorHistory.shift(); // Remove oldest entry
    }
    
    // Log for debugging (optional - remove in production)
    console.log(`📊 Received: EMG=${data.emg}, Ax=${data.ax.toFixed(2)}, Ay=${data.ay.toFixed(2)}, Az=${data.az.toFixed(2)}`);
    
    return NextResponse.json({
      success: true,
      message: 'Data received successfully',
      data: latestData,
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
 * 
 * Response:
 * {
 *   "success": true,
 *   "latest": { emg, ax, ay, az, timestamp },
 *   "history": [ ... last 100 data points ... ]
 * }
 */
export async function GET() {
  try {
    // If no data yet, return empty response
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
      history: sensorHistory,
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
 * Allows ESP32 to send data from different origin
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
