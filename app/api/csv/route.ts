// ============================================
// API Route: /api/csv
// Handles CSV export of EMG data
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getSensorHistory } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/csv
 * Download current EMG data as CSV
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    
    const history = getSensorHistory();
    
    if (history.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No data available to export' },
        { status: 400 }
      );
    }

    const csvHeader = 'timestamp,emg,time\n';
    const csvData = history.map(d => {
      const date = new Date(d.timestamp);
      const timeStr = date.toISOString();
      return `${d.timestamp},${d.emg},${timeStr}`;
    }).join('\n');

    const csv = csvHeader + csvData;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `emg_data_${timestamp}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to export CSV' },
      { status: 500 }
    );
  }
}
