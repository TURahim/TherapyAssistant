import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { formatErrorResponse, ValidationError } from '@/lib/utils/errors';
import * as storageService from '@/lib/services/storageService';
import * as sessionQueries from '@/lib/db/queries/sessions';
import { transcribeAudio } from '@/lib/ai/stages/transcription';
import { getOpenAIClient } from '@/lib/ai/pipeline';
import { prisma } from '@/lib/db/prisma';

/**
 * POST /api/transcribe
 * Transcribe an uploaded audio/video file (Whisper)
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

    const body = await request.json();
    const { uploadId } = body as { uploadId?: string };

    if (!uploadId) {
      throw new ValidationError('uploadId is required');
    }

    const upload = await storageService.getUpload(uploadId);
    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    const isOwner = await sessionQueries.isSessionOfTherapist(upload.sessionId, therapist.id);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (upload.mediaType !== 'AUDIO' && upload.mediaType !== 'VIDEO') {
      throw new ValidationError('Only audio/video uploads can be transcribed');
    }

    if (upload.expiresAt && upload.expiresAt < new Date()) {
      throw new ValidationError('This upload has expired. Please upload the audio again.');
    }

    const openai = getOpenAIClient();
    const transcription = await transcribeAudio(
      {
        filePath: upload.storagePath,
        mimeType: upload.mimeType,
        uploadId: upload.id,
      },
      openai
    );

    if (!transcription.success || !transcription.data) {
      return NextResponse.json(
        { error: transcription.error || 'Transcription failed' },
        { status: 500 }
      );
    }

    await storageService.updateTranscription(upload.id, transcription.data.transcript);

    return NextResponse.json({
      uploadId: upload.id,
      transcript: transcription.data.transcript,
      durationMs: transcription.durationMs,
    });
  } catch (error) {
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}


