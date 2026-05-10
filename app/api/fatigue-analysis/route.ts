// ============================================
// POST /api/fatigue-analysis — run fatigue_model.pkl on a session (doctors only)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { execFileSync } from 'child_process';
import path from 'path';

import { getSessionById } from '@/lib/db';
import { computeFatigueFeatures } from '@/lib/fatigue-features';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function pythonExecutable(): string {
  if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;
  return process.platform === 'win32' ? 'python' : 'python3';
}

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

    const scriptPath = path.join(process.cwd(), 'model', 'predict_fatigue.py');
    const payload = JSON.stringify({
      features: [features.rmsMv, features.dominantFreqHz, features.stdMv],
    });

    let stdout: string;
    try {
      stdout = execFileSync(pythonExecutable(), [scriptPath], {
        input: payload,
        encoding: 'utf-8',
        maxBuffer: 4 * 1024 * 1024,
        windowsHide: true,
      });
    } catch (e) {
      const err = e as { stderr?: string; message?: string };
      console.error('fatigue-analysis python error:', err.stderr ?? err.message);
      return NextResponse.json(
        {
          success: false,
          message:
            'Could not run the fatigue model. Install Python 3 and dependencies: pip install -r model/requirements.txt',
        },
        { status: 503 }
      );
    }

    let parsed: {
      ok?: boolean;
      prediction?: number;
      classes?: number[];
      probabilities?: Record<string, number>;
      error?: string;
    };
    try {
      parsed = JSON.parse(stdout.trim());
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid output from fatigue model script' },
        { status: 500 }
      );
    }

    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, message: parsed.error ?? 'Model inference failed' },
        { status: 500 }
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
      prediction: parsed.prediction,
      classes: parsed.classes,
      probabilities: parsed.probabilities,
    });
  } catch (error) {
    console.error('fatigue-analysis route error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
