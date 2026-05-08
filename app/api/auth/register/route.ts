import { NextRequest, NextResponse } from 'next/server';
import { users, patientProfiles } from '@/lib/store';
import { AuthResponse, User, PatientProfile } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role, age, gender } = await request.json();

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

    if (role === 'patient' && age && gender) {
      const profile: PatientProfile = {
        userId,
        age: Number(age),
        gender,
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
