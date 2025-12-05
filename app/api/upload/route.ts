import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as storageService from '@/lib/services/storageService';
import * as sessionQueries from '@/lib/db/queries/sessions';
import { formatErrorResponse } from '@/lib/utils/errors';
import { prisma } from '@/lib/db/prisma';

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = [
  'text/plain',
  'text/markdown',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/m4a',
  'video/mp4',
  'video/webm',
  'application/pdf',
];

/**
 * POST /api/upload
 * Upload a file for a session
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'THERAPIST' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const therapist = await prisma.therapist.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!therapist) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sessionId = formData.get('sessionId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Verify session belongs to therapist
    const isOwner = await sessionQueries.isSessionOfTherapist(sessionId, therapist.id);
    if (!isOwner) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed types: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload file
    const upload = await storageService.uploadFile(sessionId, {
      name: file.name,
      type: file.type,
      size: file.size,
      buffer,
    });

    return NextResponse.json(
      {
        id: upload.id,
        fileName: upload.fileName,
        mediaType: upload.mediaType,
        message: 'File uploaded successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/upload error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

