// ============================================
// API Route: /api/patients — list patients with recording indicators
// ============================================

import { NextResponse } from 'next/server';
import { users, patientProfiles, activeSessions } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const patients = Array.from(users.values())
      .filter((u) => u.role === 'patient')
      .map((u) => {
        const profile = patientProfiles.get(u.id);
        const isRecording = activeSessions.has(u.id);

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          age: profile?.age,
          gender: profile?.gender,
          heightCm: profile?.heightCm,
          weightKg: profile?.weightKg,
          isRecording,
          activeSessionId: isRecording ? activeSessions.get(u.id) : null,
          createdAt: u.createdAt,
        };
      })
      .sort((a, b) => {
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
