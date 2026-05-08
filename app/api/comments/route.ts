// ============================================
// API Route: /api/comments
// Handles doctor comments on sessions
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { addComment, getSessionComments } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/comments?sessionId=xxx
 * Get comments for a session
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Session ID is required' },
        { status: 400 }
      );
    }

    const comments = getSessionComments(sessionId);

    return NextResponse.json({
      success: true,
      comments,
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/comments
 * Add a comment to a session
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, doctorId, doctorName, content } = await request.json();

    if (!sessionId || !doctorId || !doctorName || !content) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    const comment = addComment(sessionId, doctorId, doctorName, content);

    return NextResponse.json({
      success: true,
      comment,
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to add comment' },
      { status: 500 }
    );
  }
}
