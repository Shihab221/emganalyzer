// ============================================
// API Route: /api/patients — list patients with recording indicators
// ============================================

import { NextResponse } from 'next/server';
import { getAllPatients } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const patients = await getAllPatients();

    // Sort: recording patients first, then by createdAt desc
    patients.sort((a, b) => {
      if (a.isRecording && !b.isRecording) return -1;
      if (!a.isRecording && b.isRecording) return 1;
      return b.createdAt - a.createdAt;
    });

    return NextResponse.json({
      success: true,
      patients,
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch patients' }, { status: 500 });
  }
}
