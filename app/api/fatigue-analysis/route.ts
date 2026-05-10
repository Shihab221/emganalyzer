// ============================================
// POST /api/fatigue-analysis — fatigue_rf.json (pure JS RF, Vercel-friendly)
// ============================================

import { NextRequest, NextResponse } from 'next/server';

import { getSessionById } from '@/lib/db';
import { computeFatigueFeatures } from '@/lib/fatigue-features';
import { runFatigueOnnx } from '@/lib/fatigue-inference';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = body.sessionId as string | undefined;
    const doctorId = body.doctorId as string | undefined;

    if (!sessionId || !doctorId) {
      return NextResponse.json(
        { success: false, message: 'sessionId and doctorId are required' },
        { status: 400 }
      );
    }

    const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
    if (!doctor || doctor.role !== 'doctor') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const session = await getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Session not found' }, { status: 404 });
    }

    const features = computeFatigueFeatures(session.data);
    if (!features) {
      return NextResponse.json(
        {
          success: false,
          message: 'Not enough samples in this session for analysis (minimum 4).',
        },
        { status: 400 }
      );
    }

    let out: Awaited<ReturnType<typeof runFatigueOnnx>>;
    try {
      out = await runFatigueOnnx([
        features.rmsMv,
        features.dominantFreqHz,
        features.stdMv,
      ]);
    } catch (e) {
      console.error('fatigue-analysis model error:', e);
      return NextResponse.json(
        {
          success: false,
          message:
            'Could not run the fatigue model. Ensure model/fatigue_rf.json exists (run: python model/export_rf_json.py after updating the .pkl).',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      patientName: session.patientName,
      features: {
        rmsMv: Math.round(features.rmsMv * 1000) / 1000,
        dominantFreqHz: Math.round(features.dominantFreqHz * 1000) / 1000,
        stdMv: Math.round(features.stdMv * 1000) / 1000,
      },
      prediction: out.prediction,
      classes: out.classes,
      probabilities: out.probabilities,
    });
  } catch (error) {
    console.error('fatigue-analysis route error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
