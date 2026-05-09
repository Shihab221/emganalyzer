import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, seedDemoData } from '@/lib/db';
import { AuthResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Ensure demo data exists
    await seedDemoData();

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' } as AuthResponse,
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);

    if (!user || user.password !== password) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' } as AuthResponse,
        { status: 401 }
      );
    }

    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'doctor' | 'patient',
      createdAt: user.createdAt.getTime(),
    };

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: userResponse,
    } as AuthResponse);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Login failed' } as AuthResponse,
      { status: 500 }
    );
  }
}
