// ============================================
// API Route: /api/comments
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { addComment, getSessionComments } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/comments?sessionId=xxx
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ success: false, message: 'sessionId required' }, { status: 400 });
    }

    const comments = await getSessionComments(sessionId);
    return NextResponse.json({ success: true, comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST /api/comments { sessionId, doctorId, doctorName, content }
export async function POST(request: NextRequest) {
  try {
    const { sessionId, doctorId, doctorName, content } = await request.json();

    if (!sessionId || !doctorId || !doctorName || !content) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const comment = await addComment(sessionId, doctorId, doctorName, content);

    return NextResponse.json({
      success: true,
      comment,
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ success: false, message: 'Failed to add comment' }, { status: 500 });
  }
}
