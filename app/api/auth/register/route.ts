import { NextRequest, NextResponse } from 'next/server';
import { users, patientProfiles } from '@/lib/store';
import { AuthResponse, User, PatientProfile } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role, age, gender, heightCm, weightKg } = await request.json();

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
      const h = Number(heightCm);
      const w = Number(weightKg);

      if (
        age === undefined ||
        age === '' ||
        !gender ||
        heightCm === undefined ||
        heightCm === '' ||
        weightKg === undefined ||
        weightKg === ''
      ) {
        return NextResponse.json(
          {
            success: false,
            message: 'Patients must provide age, gender, height (cm), and weight (kg)',
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

      if (!Number.isFinite(h) || h < 50 || h > 250) {
        return NextResponse.json(
          { success: false, message: 'Height (cm) must be between 50 and 250' } as AuthResponse,
          { status: 400 }
        );
      }

      if (!Number.isFinite(w) || w < 15 || w > 400) {
        return NextResponse.json(
          { success: false, message: 'Weight (kg) must be between 15 and 400' } as AuthResponse,
          { status: 400 }
        );
      }
    }

    const emailLower = email.toLowerCase();
    if (users.has(emailLower)) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' } as AuthResponse,
        { status: 400 }
      );
    }

    const userId = `${role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const user: User & { password: string } = {
      id: userId,
      email: emailLower,
      name,
      role,
      password,
      createdAt: Date.now(),
    };

    users.set(emailLower, user);

    if (role === 'patient') {
      const profile: PatientProfile = {
        userId,
        age: Number(age),
        gender,
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
      };
      patientProfiles.set(userId, profile);
    }

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      user: userWithoutPassword,
    } as AuthResponse);
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Registration failed' } as AuthResponse,
      { status: 500 }
    );
  }
}
