// ============================================
// GET /api/patient-profile?patientId= — demographics for dashboard
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getPatientProfile } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const patientId = request.nextUrl.searchParams.get('patientId');
    if (!patientId) {
      return NextResponse.json({ success: false, message: 'patientId required' }, { status: 400 });
    }

    const profile = await getPatientProfile(patientId);
    if (!profile) {
      return NextResponse.json({ success: false, message: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (e) {
    console.error('patient-profile error:', e);
    return NextResponse.json({ success: false, message: 'Failed to load profile' }, { status: 500 });
  }
}
