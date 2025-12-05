import fs from 'fs';
import OpenAI from 'openai';
import type { StageResult, TokenUsage } from '../types';

export interface TranscriptionInput {
  filePath: string;
  mimeType?: string;
  uploadId?: string;
}

export interface TranscriptionData {
  transcript: string;
  durationSeconds?: number;
}

/**
 * Transcribe an audio file using Whisper
 */
export async function transcribeAudio(
  input: TranscriptionInput,
  openaiClient: OpenAI
): Promise<StageResult<TranscriptionData>> {
  const start = Date.now();

  try {
    const fileStream = fs.createReadStream(input.filePath);

    const response = await openaiClient.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      response_format: 'text',
    });

    const transcript =
      typeof response === 'string'
        ? response
        : (response as { text?: string }).text || '';

    if (!transcript || transcript.trim().length === 0) {
      return {
        success: false,
        error: 'Transcription returned empty text',
        durationMs: Date.now() - start,
      };
    }

    return {
      success: true,
      data: {
        transcript: transcript.trim(),
      },
      durationMs: Date.now() - start,
      tokenUsage: buildTokenUsageEstimate(transcript),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown transcription error';
    return {
      success: false,
      error: message,
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Whisper responses do not include token counts; provide a minimal estimate so
 * downstream cost tracking stays consistent.
 */
function buildTokenUsageEstimate(transcript: string): TokenUsage {
  const estimatedTokens = Math.ceil(transcript.length / 4); // rough heuristic
  return {
    promptTokens: 0,
    completionTokens: estimatedTokens,
    totalTokens: estimatedTokens,
    estimatedCost: 0,
  };
}


