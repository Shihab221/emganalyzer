// ============================================
// API Route: /api/csv — export session CSV with RMS + FFT columns (real timestamps)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getSessionById } from '@/lib/store';
import { buildEmgCsvWithAnalysis } from '@/lib/emg-csv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Provide sessionId to export recorded data.' },
        { status: 400 }
      );
    }

    const session = getSessionById(sessionId);
    const data = session?.data;
    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, message: 'Session not found or empty' }, { status: 404 });
    }

    const csv = buildEmgCsvWithAnalysis(data, {
      patientName: session.patientName,
      patientAge: session.patientAge,
      patientGender: session.patientGender,
      patientHeightCm: session.patientHeightCm,
      patientWeightKg: session.patientWeightKg,
    });
    const safeId = sessionId.replace(/[^\w.-]+/g, '_').slice(0, 120);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `emg_session_${safeId}_${stamp}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return NextResponse.json({ success: false, message: 'Failed to export CSV' }, { status: 500 });
  }
}
