import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, createUser } from '@/lib/db';
import { AuthResponse } from '@/lib/types';
import { computeBmiKgM2 } from '@/lib/patient-bmi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role, age, gender, heightM, weightKg } = await request.json();

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' } as AuthResponse,
        { status: 400 }
      );
    }

    if (role !== 'doctor' && role !== 'patient') {
      return NextResponse.json(
        { success: false, message: 'Invalid role' } as AuthResponse,
        { status: 400 }
      );
    }

    if (role === 'patient') {
      const ageNum = Number(age);
      const h = Number(heightM);
      const w = Number(weightKg);

      if (
        age === undefined ||
        age === '' ||
        !gender ||
        heightM === undefined ||
        heightM === '' ||
        weightKg === undefined ||
        weightKg === ''
      ) {
        return NextResponse.json(
          {
            success: false,
            message: 'Patients must provide age, gender, height (m), and weight (kg)',
          } as AuthResponse,
          { status: 400 }
        );
      }

      if (!['male', 'female', 'other'].includes(gender)) {
        return NextResponse.json(
          { success: false, message: 'Invalid gender' } as AuthResponse,
          { status: 400 }
        );
      }

      if (!Number.isFinite(ageNum) || ageNum < 1 || ageNum > 120) {
        return NextResponse.json(
          { success: false, message: 'Age must be between 1 and 120' } as AuthResponse,
          { status: 400 }
        );
      }

      if (!Number.isFinite(h) || h < 0.5 || h > 2.5) {
        return NextResponse.json(
          { success: false, message: 'Height (m) must be between 0.5 and 2.5' } as AuthResponse,
          { status: 400 }
        );
      }

      if (!Number.isFinite(w) || w < 15 || w > 400) {
        return NextResponse.json(
          { success: false, message: 'Weight (kg) must be between 15 and 400' } as AuthResponse,
          { status: 400 }
        );
      }

      const bmi = computeBmiKgM2(w, h);
      if (!Number.isFinite(bmi)) {
        return NextResponse.json(
          { success: false, message: 'Could not compute BMI from height and weight' } as AuthResponse,
          { status: 400 }
        );
      }
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' } as AuthResponse,
        { status: 400 }
      );
    }

    const user = await createUser({
      email,
      password,
      name,
      role,
      age: role === 'patient' ? Number(age) : undefined,
      gender: role === 'patient' ? gender : undefined,
      heightM: role === 'patient' ? Number(heightM) : undefined,
      weightKg: role === 'patient' ? Number(weightKg) : undefined,
    });

    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'doctor' | 'patient',
      createdAt: user.createdAt.getTime(),
    };

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      user: userResponse,
    } as AuthResponse);
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Registration failed' } as AuthResponse,
      { status: 500 }
    );
  }
}
