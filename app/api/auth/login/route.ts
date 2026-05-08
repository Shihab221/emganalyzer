import { NextRequest, NextResponse } from 'next/server';
import { users } from '@/lib/store';
import { AuthResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' } as AuthResponse,
        { status: 400 }
      );
    }

    const user = users.get(email.toLowerCase());

    if (!user || user.password !== password) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' } as AuthResponse,
        { status: 401 }
      );
    }

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: userWithoutPassword,
    } as AuthResponse);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Login failed' } as AuthResponse,
      { status: 500 }
    );
  }
}
