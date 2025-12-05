import { prisma } from '@/lib/db/prisma';
import type { MediaType } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';

// For demo purposes, we'll use local file storage
// In production, this would integrate with S3, GCS, or similar
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MEDIA_EXPIRY_HOURS = 24; // Auto-delete after 24 hours

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(): Promise<void> {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Generate a unique filename
 */
function generateFileName(originalName: string, sessionId: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${sessionId}-${timestamp}-${random}${ext}`;
}

/**
 * Get media type from mime type
 */
function getMediaType(mimeType: string): MediaType {
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  return 'TRANSCRIPT';
}

/**
 * Upload a file
 */
export async function uploadFile(
  sessionId: string,
  file: {
    name: string;
    type: string;
    size: number;
    buffer: Buffer;
  }
): Promise<{
  id: string;
  fileName: string;
  storagePath: string;
  mediaType: MediaType;
}> {
  await ensureUploadDir();

  const fileName = generateFileName(file.name, sessionId);
  const storagePath = path.join(UPLOAD_DIR, fileName);
  const mediaType = getMediaType(file.type);

  // Write file to disk
  await fs.writeFile(storagePath, file.buffer);

  // Calculate expiry time
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + MEDIA_EXPIRY_HOURS);

  // Create database record
  const upload = await prisma.mediaUpload.create({
    data: {
      sessionId,
      mediaType,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      storagePath,
      expiresAt,
    },
  });

  return {
    id: upload.id,
    fileName: upload.fileName,
    storagePath: upload.storagePath,
    mediaType: upload.mediaType,
  };
}

/**
 * Get a file's contents
 */
export async function getFile(uploadId: string): Promise<{
  buffer: Buffer;
  mimeType: string;
  fileName: string;
} | null> {
  const upload = await prisma.mediaUpload.findUnique({
    where: { id: uploadId },
  });

  if (!upload) return null;

  try {
    const buffer = await fs.readFile(upload.storagePath);
    return {
      buffer,
      mimeType: upload.mimeType,
      fileName: upload.fileName,
    };
  } catch {
    return null;
  }
}

/**
 * Delete a file
 */
export async function deleteFile(uploadId: string): Promise<boolean> {
  const upload = await prisma.mediaUpload.findUnique({
    where: { id: uploadId },
  });

  if (!upload) return false;

  try {
    // Delete from disk
    await fs.unlink(upload.storagePath);
  } catch {
    // File might already be deleted
  }

  // Delete from database
  await prisma.mediaUpload.delete({
    where: { id: uploadId },
  });

  return true;
}

/**
 * Clean up expired files
 */
export async function cleanupExpiredFiles(): Promise<number> {
  const expiredUploads = await prisma.mediaUpload.findMany({
    where: {
      expiresAt: {
        lte: new Date(),
      },
    },
  });

  let deletedCount = 0;

  for (const upload of expiredUploads) {
    try {
      await fs.unlink(upload.storagePath);
    } catch {
      // File might already be deleted
    }

    await prisma.mediaUpload.delete({
      where: { id: upload.id },
    });

    deletedCount++;
  }

  return deletedCount;
}

/**
 * Get upload by ID
 */
export async function getUpload(uploadId: string) {
  return prisma.mediaUpload.findUnique({
    where: { id: uploadId },
  });
}

/**
 * Update upload with transcription result
 */
export async function updateTranscription(
  uploadId: string,
  transcriptText: string
): Promise<void> {
  await prisma.mediaUpload.update({
    where: { id: uploadId },
    data: {
      transcriptText,
      transcribedAt: new Date(),
    },
  });
}

/**
 * Get uploads for a session
 */
export async function getSessionUploads(sessionId: string) {
  return prisma.mediaUpload.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
  });
}

