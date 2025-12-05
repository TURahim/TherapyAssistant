import type {
  PreprocessedTranscript,
  TranscriptChunk,
  SpeakerInfo,
  TranscriptMetadata,
  StageResult,
} from '../types';
import { LIMITS } from '../config';
import { containsCrisisLanguage } from '../schemas/crisis';

// =============================================================================
// PREPROCESSING STAGE
// =============================================================================

/**
 * Preprocess a therapy session transcript
 * - Clean and normalize text
 * - Split into manageable chunks
 * - Identify speakers
 * - Extract metadata
 */
export async function preprocessTranscript(
  transcript: string
): Promise<StageResult<PreprocessedTranscript>> {
  const startTime = Date.now();

  try {
    // Step 1: Clean the transcript
    const cleanedTranscript = cleanTranscript(transcript);

    // Step 2: Identify speakers
    const speakers = identifySpeakers(cleanedTranscript);

    // Step 3: Chunk the transcript
    const chunks = chunkTranscript(cleanedTranscript, LIMITS.maxChunkSize, LIMITS.chunkOverlap);

    // Step 4: Extract metadata
    const metadata = extractMetadata(cleanedTranscript, speakers);

    const result: PreprocessedTranscript = {
      originalLength: transcript.length,
      processedLength: cleanedTranscript.length,
      chunks,
      speakers,
      metadata,
    };

    return {
      success: true,
      data: result,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Preprocessing failed',
      durationMs: Date.now() - startTime,
    };
  }
}

// =============================================================================
// TEXT CLEANING
// =============================================================================

/**
 * Clean and normalize transcript text
 */
export function cleanTranscript(transcript: string): string {
  let cleaned = transcript;

  // Normalize line endings
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove excessive whitespace
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Normalize common transcription artifacts
  cleaned = cleaned.replace(/\[inaudible\]/gi, '[inaudible]');
  cleaned = cleaned.replace(/\[crosstalk\]/gi, '[crosstalk]');
  cleaned = cleaned.replace(/\[pause\]/gi, '[pause]');
  cleaned = cleaned.replace(/\.\.\./g, '…');

  // Normalize speaker labels (common formats)
  cleaned = normalizeSpeakerLabels(cleaned);

  // Remove timestamps if present (common format: [00:00:00] or (00:00))
  cleaned = cleaned.replace(/\[?\(?\d{1,2}:\d{2}(?::\d{2})?\)?\]?\s*/g, '');

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Normalize various speaker label formats
 */
function normalizeSpeakerLabels(text: string): string {
  // Common therapist labels
  const therapistPatterns = [
    /^(therapist|counselor|dr\.?\s*\w+|clinician|provider)\s*:/gim,
    /^(T|TH|DR)\s*:/gim,
  ];

  // Common client labels
  const clientPatterns = [
    /^(client|patient|c|pt|cl)\s*:/gim,
  ];

  let normalized = text;

  // Normalize therapist labels
  for (const pattern of therapistPatterns) {
    normalized = normalized.replace(pattern, 'Therapist:');
  }

  // Normalize client labels
  for (const pattern of clientPatterns) {
    normalized = normalized.replace(pattern, 'Client:');
  }

  return normalized;
}

// =============================================================================
// SPEAKER IDENTIFICATION
// =============================================================================

/**
 * Categorize a speaker based on label
 */
function categorizeSpeaker(rawLabel: string): 'therapist' | 'client' | 'unknown' {
  const label = rawLabel.toLowerCase();
  if (label.includes('therapist') || label.includes('counselor') || label.includes('clinician')) {
    return 'therapist';
  }
  if (label.includes('client') || label.includes('patient')) {
    return 'client';
  }
  return 'unknown';
}

/**
 * Identify and analyze speakers in the transcript
 */
export function identifySpeakers(transcript: string): SpeakerInfo[] {
  const speakers: Map<string, SpeakerInfo> = new Map();
  const lines = transcript.split('\n');

  // Pattern to match speaker labels at the start of lines
  const speakerPattern = /^(Therapist|Client|Speaker\s*\d*|Unknown):\s*/i;

  for (const line of lines) {
    const match = line.match(speakerPattern);
    if (match) {
      const rawLabel = match[1].toLowerCase();
      const label = categorizeSpeaker(rawLabel);
      const content = line.substring(match[0].length);
      const wordCount = countWords(content);

      const existing = speakers.get(label);
      if (existing) {
        existing.turnCount++;
        existing.approximateWordCount += wordCount;
      } else {
        speakers.set(label, {
          label,
          turnCount: 1,
          approximateWordCount: wordCount,
        });
      }
    }
  }

  // If no speakers identified, create unknown speaker
  if (speakers.size === 0) {
    speakers.set('unknown', {
      label: 'unknown',
      turnCount: 1,
      approximateWordCount: countWords(transcript),
    });
  }

  return Array.from(speakers.values());
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

// =============================================================================
// TRANSCRIPT CHUNKING
// =============================================================================

/**
 * Split transcript into manageable chunks for AI processing
 * Preserves speaker turns and maintains context overlap
 */
export function chunkTranscript(
  transcript: string,
  maxChunkSize: number = LIMITS.maxChunkSize,
  overlap: number = LIMITS.chunkOverlap
): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = [];
  const lines = transcript.split('\n');
  
  let currentChunk = '';
  let chunkStart = 0;
  let chunkIndex = 0;
  let currentOffset = 0;
  let speakerTurnsInChunk = 0;

  const speakerPattern = /^(Therapist|Client|Speaker\s*\d*|Unknown):\s*/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineWithNewline = line + '\n';

    // Check if adding this line would exceed chunk size
    if (currentChunk.length + lineWithNewline.length > maxChunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        index: chunkIndex,
        text: currentChunk.trim(),
        startOffset: chunkStart,
        endOffset: currentOffset,
        speakerTurns: speakerTurnsInChunk,
      });

      // Start new chunk with overlap
      const overlapText = getOverlapText(currentChunk, overlap);
      chunkStart = currentOffset - overlapText.length;
      currentChunk = overlapText;
      chunkIndex++;
      speakerTurnsInChunk = 0;
    }

    // Add line to current chunk
    currentChunk += lineWithNewline;
    currentOffset += lineWithNewline.length;

    // Count speaker turns
    if (speakerPattern.test(line)) {
      speakerTurnsInChunk++;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      index: chunkIndex,
      text: currentChunk.trim(),
      startOffset: chunkStart,
      endOffset: currentOffset,
      speakerTurns: speakerTurnsInChunk,
    });
  }

  return chunks;
}

/**
 * Get overlap text from the end of a chunk
 * Tries to break at sentence boundaries
 */
function getOverlapText(chunk: string, overlapSize: number): string {
  if (chunk.length <= overlapSize) {
    return chunk;
  }

  const endSection = chunk.slice(-overlapSize * 2); // Get more than needed
  
  // Try to find a sentence boundary
  const sentenceEnd = endSection.lastIndexOf('. ');
  if (sentenceEnd !== -1 && sentenceEnd > overlapSize / 2) {
    return endSection.slice(sentenceEnd + 2);
  }

  // Try to find a speaker turn boundary
  const speakerMatch = endSection.match(/\n(Therapist|Client):/i);
  if (speakerMatch && speakerMatch.index !== undefined) {
    return endSection.slice(speakerMatch.index + 1);
  }

  // Fall back to simple truncation at word boundary
  const words = endSection.split(/\s+/);
  let result = '';
  for (let i = words.length - 1; i >= 0; i--) {
    const candidate = words.slice(i).join(' ');
    if (candidate.length <= overlapSize) {
      result = candidate;
    } else {
      break;
    }
  }

  return result || endSection.slice(-overlapSize);
}

// =============================================================================
// METADATA EXTRACTION
// =============================================================================

/**
 * Extract metadata from the transcript
 */
export function extractMetadata(
  transcript: string,
  _speakers: SpeakerInfo[]
): TranscriptMetadata {
  const wordCount = countWords(transcript);
  
  // Estimate duration (assuming ~150 words per minute for spoken content)
  const estimatedDuration = Math.round(wordCount / 150);

  // Calculate topic density (ratio of meaningful sentences)
  const topicDensity = calculateTopicDensity(transcript);

  // Calculate emotional intensity
  const emotionalIntensity = calculateEmotionalIntensity(transcript);

  // Check for crisis language
  const hasCrisisLanguage = containsCrisisLanguage(transcript);

  return {
    estimatedDuration,
    topicDensity,
    emotionalIntensity,
    hasCrisisLanguage,
  };
}

/**
 * Calculate topic density (heuristic measure of substantive content)
 */
function calculateTopicDensity(transcript: string): number {
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return 0;

  // Count sentences with meaningful content (more than just filler)
  const meaningfulSentences = sentences.filter(s => {
    const words = s.split(/\s+/).filter(w => w.length > 0);
    // Consider meaningful if more than 5 words and not common filler
    return words.length > 5 && !isFillerSentence(s);
  });

  return Math.min(1, meaningfulSentences.length / sentences.length);
}

/**
 * Check if a sentence is likely filler/small talk
 */
function isFillerSentence(sentence: string): boolean {
  const lowerSentence = sentence.toLowerCase().trim();
  const fillerPhrases = [
    'how are you',
    'i\'m good',
    'i\'m fine',
    'nice to see you',
    'thanks for coming',
    'have a seat',
    'let me just',
    'okay',
    'alright',
    'uh huh',
    'mm hmm',
    'yeah',
    'yes',
    'no',
    'right',
  ];

  return fillerPhrases.some(phrase => lowerSentence.includes(phrase));
}

/**
 * Calculate emotional intensity (heuristic measure)
 */
function calculateEmotionalIntensity(transcript: string): number {
  const lowerTranscript = transcript.toLowerCase();
  
  // Emotional words and their weights
  const emotionalIndicators: Array<{ patterns: string[]; weight: number }> = [
    {
      patterns: ['angry', 'furious', 'rage', 'hate', 'devastated', 'terrified', 'panic'],
      weight: 1.0,
    },
    {
      patterns: ['sad', 'depressed', 'anxious', 'worried', 'scared', 'frustrated', 'overwhelmed'],
      weight: 0.7,
    },
    {
      patterns: ['upset', 'stressed', 'nervous', 'uncomfortable', 'disappointed', 'hurt'],
      weight: 0.5,
    },
    {
      patterns: ['concerned', 'bothered', 'unhappy', 'difficult', 'hard', 'struggle'],
      weight: 0.3,
    },
  ];

  let totalWeight = 0;

  for (const { patterns, weight } of emotionalIndicators) {
    for (const pattern of patterns) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
      const matches = lowerTranscript.match(regex);
      if (matches) {
        totalWeight += matches.length * weight;
      }
    }
  }

  // Normalize to 0-1 range
  const wordCount = countWords(transcript);
  if (wordCount === 0) return 0;

  // Use logarithmic scaling for better distribution
  const rawScore = (totalWeight / Math.sqrt(wordCount)) * 2;
  return Math.min(1, rawScore);
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/**
 * Parse speaker turns from transcript
 */
export function parseSpeakerTurns(transcript: string): Array<{
  speaker: 'therapist' | 'client' | 'unknown';
  content: string;
  lineNumber: number;
}> {
  const turns: Array<{
    speaker: 'therapist' | 'client' | 'unknown';
    content: string;
    lineNumber: number;
  }> = [];

  const lines = transcript.split('\n');
  const speakerPattern = /^(Therapist|Client|Speaker\s*\d*|Unknown):\s*/i;

  let currentSpeaker: 'therapist' | 'client' | 'unknown' | null = null;
  let currentContent = '';
  let currentLineNumber = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(speakerPattern);

    if (match) {
      // Save previous turn if exists
      if (currentSpeaker && currentContent.trim()) {
        turns.push({
          speaker: currentSpeaker,
          content: currentContent.trim(),
          lineNumber: currentLineNumber,
        });
      }

      // Start new turn
      currentSpeaker = categorizeSpeaker(match[1]);
      currentContent = line.substring(match[0].length);
      currentLineNumber = i + 1;
    } else if (currentSpeaker) {
      // Continue current turn
      currentContent += '\n' + line;
    }
  }

  // Don't forget the last turn
  if (currentSpeaker && currentContent.trim()) {
    turns.push({
      speaker: currentSpeaker,
      content: currentContent.trim(),
      lineNumber: currentLineNumber,
    });
  }

  return turns;
}

/**
 * Get a summary of the preprocessing result
 */
export function getPreprocessingSummary(result: PreprocessedTranscript): string {
  const therapist = result.speakers.find(s => s.label === 'therapist');
  const client = result.speakers.find(s => s.label === 'client');

  return `Preprocessed transcript: ${result.chunks.length} chunk(s), ` +
    `${result.metadata.estimatedDuration} min estimated, ` +
    `${therapist?.turnCount ?? 0} therapist turns, ` +
    `${client?.turnCount ?? 0} client turns` +
    (result.metadata.hasCrisisLanguage ? ' [CRISIS LANGUAGE DETECTED]' : '');
}
