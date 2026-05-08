// ============================================
// API Route: /api/patients
// Handles patient listing and connection
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { users, patientProfiles, setCurrentPatient, currentPatientId, activeSessions } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/patients
 * Get all patients (doctors only)
 */
export async function GET() {
  try {
    const patients = Array.from(users.values())
      .filter(u => u.role === 'patient')
      .map(u => {
        const profile = patientProfiles.get(u.id);
        const isConnected = currentPatientId === u.id;
        const isActive = activeSessions.has(u.id);
        
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          age: profile?.age,
          gender: profile?.gender,
          isConnected,
          isActive,
          createdAt: u.createdAt,
        };
      })
      .sort((a, b) => {
        if (a.isConnected && !b.isConnected) return -1;
        if (!a.isConnected && b.isConnected) return 1;
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return b.createdAt - a.createdAt;
      });

    return NextResponse.json({
      success: true,
      patients,
      currentPatientId,
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch patients' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/patients/connect
 * Set current connected patient
 */
export async function POST(request: NextRequest) {
  try {
    const { patientId } = await request.json();

    if (!patientId) {
      setCurrentPatient(null);
      return NextResponse.json({
        success: true,
        message: 'Disconnected from patient',
        currentPatientId: null,
      });
    }

    const user = Array.from(users.values()).find(u => u.id === patientId);
    if (!user || user.role !== 'patient') {
      return NextResponse.json(
        { success: false, message: 'Patient not found' },
        { status: 404 }
      );
    }

    setCurrentPatient(patientId);

    return NextResponse.json({
      success: true,
      message: `Connected to ${user.name}`,
      currentPatientId: patientId,
    });
  } catch (error) {
    console.error('Error connecting to patient:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to connect to patient' },
      { status: 500 }
    );
  }
}
