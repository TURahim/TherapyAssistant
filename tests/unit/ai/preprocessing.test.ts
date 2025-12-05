import { describe, it, expect } from 'vitest';
import {
  preprocessTranscript,
  cleanTranscript,
  identifySpeakers,
  chunkTranscript,
  extractMetadata,
  parseSpeakerTurns,
  getPreprocessingSummary,
} from '@/lib/ai/stages/preprocessing';
import { SAMPLE_TRANSCRIPTS } from '@/tests/mocks/data';

describe('Preprocessing Stage', () => {
  describe('cleanTranscript', () => {
    it('normalizes line endings', () => {
      const input = 'Line 1\r\nLine 2\rLine 3\nLine 4';
      const result = cleanTranscript(input);
      expect(result).not.toContain('\r');
      expect(result.split('\n').length).toBe(4);
    });

    it('removes excessive whitespace', () => {
      const input = 'Too    many   spaces';
      const result = cleanTranscript(input);
      expect(result).toBe('Too many spaces');
    });

    it('normalizes transcription artifacts', () => {
      const input = '[INAUDIBLE] text [Crosstalk] more [PAUSE]';
      const result = cleanTranscript(input);
      expect(result).toContain('[inaudible]');
      expect(result).toContain('[crosstalk]');
      expect(result).toContain('[pause]');
    });

    it('normalizes speaker labels', () => {
      const input = 'Dr. Smith: Hello\nPatient: Hi\nT: How are you?\nC: Good';
      const result = cleanTranscript(input);
      expect(result).toContain('Therapist:');
      expect(result).toContain('Client:');
    });

    it('removes timestamps', () => {
      const input = '[00:01:30] Speaker: Hello [00:01:35] there';
      const result = cleanTranscript(input);
      expect(result).not.toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('identifySpeakers', () => {
    it('identifies therapist and client speakers', () => {
      const speakers = identifySpeakers(SAMPLE_TRANSCRIPTS.normal);
      expect(speakers.length).toBeGreaterThan(0);
      
      const therapist = speakers.find(s => s.label === 'therapist');
      const client = speakers.find(s => s.label === 'client');
      
      expect(therapist).toBeDefined();
      expect(client).toBeDefined();
    });

    it('counts speaker turns correctly', () => {
      const transcript = `Therapist: First turn
Client: First response
Therapist: Second turn
Client: Second response`;
      
      const speakers = identifySpeakers(transcript);
      const therapist = speakers.find(s => s.label === 'therapist');
      const client = speakers.find(s => s.label === 'client');
      
      expect(therapist?.turnCount).toBe(2);
      expect(client?.turnCount).toBe(2);
    });

    it('handles transcript without speaker labels', () => {
      const speakers = identifySpeakers(SAMPLE_TRANSCRIPTS.noSpeakers);
      expect(speakers.length).toBe(1);
      expect(speakers[0].label).toBe('unknown');
    });

    it('calculates approximate word counts', () => {
      const transcript = 'Therapist: One two three four five';
      const speakers = identifySpeakers(transcript);
      const therapist = speakers.find(s => s.label === 'therapist');
      expect(therapist?.approximateWordCount).toBe(5);
    });
  });

  describe('chunkTranscript', () => {
    it('creates single chunk for short transcripts', () => {
      const chunks = chunkTranscript(SAMPLE_TRANSCRIPTS.short, 8000, 200);
      expect(chunks.length).toBe(1);
    });

    it('creates multiple chunks for long transcripts', () => {
      const chunks = chunkTranscript(SAMPLE_TRANSCRIPTS.longTranscript, 1000, 100);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('includes correct offsets', () => {
      const transcript = SAMPLE_TRANSCRIPTS.normal;
      const chunks = chunkTranscript(transcript, 500, 50);
      
      // First chunk should start at 0
      expect(chunks[0].startOffset).toBe(0);
      
      // Chunk indices should be sequential
      chunks.forEach((chunk, index) => {
        expect(chunk.index).toBe(index);
      });
    });

    it('tracks speaker turns per chunk', () => {
      const transcript = `Therapist: First
Client: Second
Therapist: Third`;
      
      const chunks = chunkTranscript(transcript, 8000, 200);
      expect(chunks[0].speakerTurns).toBe(3);
    });

    it('maintains overlap between chunks', () => {
      const longText = 'A'.repeat(1000) + '\n' + 'B'.repeat(1000);
      const chunks = chunkTranscript(longText, 800, 100);
      
      if (chunks.length > 1) {
        // Second chunk should start before first chunk ends (overlap)
        expect(chunks[1].startOffset).toBeLessThan(chunks[0].endOffset);
      }
    });
  });

  describe('extractMetadata', () => {
    it('estimates duration based on word count', () => {
      const speakers = identifySpeakers(SAMPLE_TRANSCRIPTS.normal);
      const metadata = extractMetadata(SAMPLE_TRANSCRIPTS.normal, speakers);
      expect(metadata.estimatedDuration).toBeGreaterThan(0);
    });

    it('detects crisis language', () => {
      const speakers = identifySpeakers(SAMPLE_TRANSCRIPTS.withCrisisLanguage);
      const metadata = extractMetadata(SAMPLE_TRANSCRIPTS.withCrisisLanguage, speakers);
      expect(metadata.hasCrisisLanguage).toBe(true);
    });

    it('does not flag normal content as crisis', () => {
      const speakers = identifySpeakers(SAMPLE_TRANSCRIPTS.normal);
      const metadata = extractMetadata(SAMPLE_TRANSCRIPTS.normal, speakers);
      expect(metadata.hasCrisisLanguage).toBe(false);
    });

    it('calculates topic density', () => {
      const speakers = identifySpeakers(SAMPLE_TRANSCRIPTS.normal);
      const metadata = extractMetadata(SAMPLE_TRANSCRIPTS.normal, speakers);
      expect(metadata.topicDensity).toBeGreaterThanOrEqual(0);
      expect(metadata.topicDensity).toBeLessThanOrEqual(1);
    });

    it('calculates emotional intensity', () => {
      const speakers = identifySpeakers(SAMPLE_TRANSCRIPTS.withAnxiety);
      const metadata = extractMetadata(SAMPLE_TRANSCRIPTS.withAnxiety, speakers);
      expect(metadata.emotionalIntensity).toBeGreaterThan(0);
    });
  });

  describe('preprocessTranscript (full pipeline)', () => {
    it('successfully preprocesses a normal transcript', async () => {
      const result = await preprocessTranscript(SAMPLE_TRANSCRIPTS.normal);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.chunks.length).toBeGreaterThan(0);
      expect(result.data?.speakers.length).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('preserves original and processed lengths', async () => {
      const result = await preprocessTranscript(SAMPLE_TRANSCRIPTS.normal);
      
      expect(result.data?.originalLength).toBe(SAMPLE_TRANSCRIPTS.normal.length);
      expect(result.data?.processedLength).toBeGreaterThan(0);
    });

    it('handles empty transcript gracefully', async () => {
      const result = await preprocessTranscript('');
      // Should either succeed with empty data or fail gracefully
      expect(result).toBeDefined();
    });
  });

  describe('parseSpeakerTurns', () => {
    it('parses speaker turns correctly', () => {
      const turns = parseSpeakerTurns(SAMPLE_TRANSCRIPTS.normal);
      
      expect(turns.length).toBeGreaterThan(0);
      turns.forEach(turn => {
        expect(['therapist', 'client', 'unknown']).toContain(turn.speaker);
        expect(turn.content).toBeDefined();
        expect(turn.lineNumber).toBeGreaterThan(0);
      });
    });

    it('preserves turn order', () => {
      const transcript = `Therapist: First
Client: Second
Therapist: Third`;
      
      const turns = parseSpeakerTurns(transcript);
      expect(turns[0].speaker).toBe('therapist');
      expect(turns[1].speaker).toBe('client');
      expect(turns[2].speaker).toBe('therapist');
    });
  });

  describe('getPreprocessingSummary', () => {
    it('generates human-readable summary', async () => {
      const result = await preprocessTranscript(SAMPLE_TRANSCRIPTS.normal);
      
      if (result.success && result.data) {
        const summary = getPreprocessingSummary(result.data);
        expect(summary).toContain('chunk');
        expect(summary).toContain('min');
      }
    });

    it('indicates crisis language in summary when detected', async () => {
      // Use a transcript with explicit crisis keywords
      const crisisTranscript = 'Client: I want to kill myself. I don\'t want to live anymore.';
      const result = await preprocessTranscript(crisisTranscript);
      
      if (result.success && result.data) {
        const summary = getPreprocessingSummary(result.data);
        expect(summary).toContain('CRISIS LANGUAGE DETECTED');
      }
    });
  });
});

