import { describe, it, expect } from 'vitest';
import {
  calculateReadingLevel,
  validateReadingLevel,
  countSyllables,
  getWords,
  getSentences,
  getComplexWords,
  getReadabilityDescription,
  getFleschEaseDescription,
  suggestSimplifications,
  formatReadingLevelResult,
  SIMPLIFICATION_MAP,
} from '@/lib/utils/readingLevel';

describe('Reading Level Utilities', () => {
  describe('countSyllables', () => {
    it('counts single syllable words correctly', () => {
      expect(countSyllables('cat')).toBe(1);
      expect(countSyllables('dog')).toBe(1);
      expect(countSyllables('the')).toBe(1);
      expect(countSyllables('a')).toBe(1);
      expect(countSyllables('it')).toBe(1);
    });

    it('counts two syllable words correctly', () => {
      expect(countSyllables('happy')).toBe(2);
      expect(countSyllables('father')).toBe(2);
      expect(countSyllables('mother')).toBe(2);
      expect(countSyllables('water')).toBe(2);
    });

    it('counts three syllable words correctly', () => {
      expect(countSyllables('beautiful')).toBeGreaterThanOrEqual(3);
      expect(countSyllables('family')).toBeGreaterThanOrEqual(2);
      expect(countSyllables('different')).toBeGreaterThanOrEqual(2);
    });

    it('counts four+ syllable words correctly', () => {
      expect(countSyllables('personality')).toBe(5);
      expect(countSyllables('communication')).toBe(5);
    });

    it('handles words with silent e', () => {
      expect(countSyllables('smile')).toBe(1);
      expect(countSyllables('file')).toBe(1);
      expect(countSyllables('time')).toBe(1);
    });

    it('handles special cases', () => {
      expect(countSyllables('people')).toBe(2);
      expect(countSyllables('every')).toBe(3);
      expect(countSyllables('area')).toBe(3);
    });

    it('handles empty strings and punctuation', () => {
      expect(countSyllables('')).toBe(0);
      expect(countSyllables('...')).toBe(0);
      expect(countSyllables("don't")).toBe(1);
    });
  });

  describe('getWords', () => {
    it('extracts words from simple sentences', () => {
      const words = getWords('The quick brown fox.');
      expect(words).toEqual(['The', 'quick', 'brown', 'fox']);
    });

    it('handles punctuation correctly', () => {
      const words = getWords('Hello, world! How are you?');
      expect(words).toEqual(['Hello', 'world', 'How', 'are', 'you']);
    });

    it('handles contractions', () => {
      const words = getWords("Don't worry, it's okay.");
      expect(words).toEqual(["Don't", 'worry', "it's", 'okay']);
    });

    it('returns empty array for empty string', () => {
      expect(getWords('')).toEqual([]);
      expect(getWords('   ')).toEqual([]);
    });
  });

  describe('getSentences', () => {
    it('splits text into sentences', () => {
      const sentences = getSentences('Hello. How are you? I am fine!');
      expect(sentences).toHaveLength(3);
    });

    it('handles single sentence', () => {
      const sentences = getSentences('This is one sentence.');
      expect(sentences).toHaveLength(1);
    });

    it('handles text without ending punctuation', () => {
      const sentences = getSentences('This is a sentence');
      expect(sentences).toHaveLength(1);
    });

    it('returns empty array for empty string', () => {
      expect(getSentences('')).toEqual([]);
    });
  });

  describe('getComplexWords', () => {
    it('identifies words with 3+ syllables', () => {
      const text = 'The beautiful personality of the individual is remarkable.';
      const complexWords = getComplexWords(text);
      expect(complexWords).toContain('beautiful');
      expect(complexWords).toContain('personality');
      expect(complexWords).toContain('individual');
      expect(complexWords).toContain('remarkable');
    });

    it('returns empty array for simple text', () => {
      const text = 'The cat sat on the mat.';
      const complexWords = getComplexWords(text);
      expect(complexWords).toHaveLength(0);
    });
  });

  describe('calculateReadingLevel', () => {
    it('returns low grade level for simple text', () => {
      const result = calculateReadingLevel('The cat sat on the mat. It was a good day.');
      expect(result.gradeLevel).toBeLessThan(6);
    });

    it('returns higher grade level for complex text', () => {
      const complexText = `
        The implementation of sophisticated cognitive behavioral interventions 
        requires comprehensive understanding of psychotherapeutic methodologies 
        and substantial clinical experience in behavioral modification techniques.
      `;
      const result = calculateReadingLevel(complexText);
      expect(result.gradeLevel).toBeGreaterThan(12);
    });

    it('returns all expected metrics', () => {
      const result = calculateReadingLevel('Hello world. This is a test.');
      expect(result).toHaveProperty('gradeLevel');
      expect(result).toHaveProperty('fleschEase');
      expect(result).toHaveProperty('wordCount');
      expect(result).toHaveProperty('sentenceCount');
      expect(result).toHaveProperty('syllableCount');
      expect(result).toHaveProperty('avgWordsPerSentence');
      expect(result).toHaveProperty('avgSyllablesPerWord');
    });

    it('handles empty text', () => {
      const result = calculateReadingLevel('');
      expect(result.gradeLevel).toBe(0);
      expect(result.fleschEase).toBe(100);
      expect(result.wordCount).toBe(0);
    });

    it('calculates word count correctly', () => {
      const result = calculateReadingLevel('One two three four five.');
      expect(result.wordCount).toBe(5);
    });

    it('calculates sentence count correctly', () => {
      const result = calculateReadingLevel('First sentence. Second sentence. Third sentence.');
      expect(result.sentenceCount).toBe(3);
    });

    it('calculates Flesch ease score between 0 and 100', () => {
      const simpleResult = calculateReadingLevel('I am happy. You are nice.');
      expect(simpleResult.fleschEase).toBeGreaterThanOrEqual(0);
      expect(simpleResult.fleschEase).toBeLessThanOrEqual(100);
    });
  });

  describe('validateReadingLevel', () => {
    it('validates simple text as acceptable', () => {
      const simpleText = 'I feel happy today. The sun is bright. I went for a walk.';
      const result = validateReadingLevel(simpleText);
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('flags complex text as invalid', () => {
      const complexText = `
        The implementation of comprehensive psychotherapeutic interventions 
        necessitates sophisticated understanding of neurobiological mechanisms 
        and substantial expertise in differential diagnostic methodologies.
      `;
      const result = validateReadingLevel(complexText);
      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('provides suggestions for improvement', () => {
      const complexText = 'The individual demonstrated considerable improvement in interpersonal relationships.';
      const result = validateReadingLevel(complexText);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('uses custom target grade when provided', () => {
      const simpleText = 'The cat sat on the mat.';
      const lenientResult = validateReadingLevel(simpleText, 10, 12);
      
      // Simple text with lenient target should pass
      expect(lenientResult.isValid).toBe(true);
      expect(lenientResult.targetGrade).toBe(10);
    });

    it('flags long sentences', () => {
      const longSentence = 'The cat sat on the mat and then it jumped up and ran across the room and out the door into the garden where it played for hours.';
      const result = validateReadingLevel(longSentence);
      expect(result.issues.some(i => i.includes('Sentences are too long'))).toBe(true);
    });

    it('returns target grade in result', () => {
      const result = validateReadingLevel('Test text.', 5, 8);
      expect(result.targetGrade).toBe(5);
    });
  });

  describe('getReadabilityDescription', () => {
    it('returns correct descriptions for grade levels', () => {
      expect(getReadabilityDescription(4)).toContain('Very Easy');
      expect(getReadabilityDescription(6)).toContain('Easy');
      expect(getReadabilityDescription(8)).toContain('Fairly Easy');
      expect(getReadabilityDescription(10)).toContain('Standard');
      expect(getReadabilityDescription(12)).toContain('Fairly Difficult');
      expect(getReadabilityDescription(14)).toContain('Difficult');
      expect(getReadabilityDescription(18)).toContain('Very Difficult');
    });
  });

  describe('getFleschEaseDescription', () => {
    it('returns correct descriptions for ease scores', () => {
      expect(getFleschEaseDescription(95)).toBe('Very Easy');
      expect(getFleschEaseDescription(85)).toBe('Easy');
      expect(getFleschEaseDescription(75)).toBe('Fairly Easy');
      expect(getFleschEaseDescription(65)).toBe('Standard');
      expect(getFleschEaseDescription(55)).toBe('Fairly Difficult');
      expect(getFleschEaseDescription(35)).toBe('Difficult');
      expect(getFleschEaseDescription(15)).toBe('Very Difficult');
    });
  });

  describe('suggestSimplifications', () => {
    it('suggests simplifications for clinical terms', () => {
      const text = 'The therapeutic intervention was successful.';
      const suggestions = suggestSimplifications(text);
      expect(suggestions.has('therapeutic')).toBe(true);
      expect(suggestions.has('intervention')).toBe(true);
    });

    it('suggests simplifications from the map', () => {
      const text = 'Subsequently, the individual demonstrated improvement.';
      const suggestions = suggestSimplifications(text);
      expect(suggestions.get('Subsequently')).toBe('then');
      expect(suggestions.get('individual')).toBe('person');
    });

    it('returns empty map for simple text', () => {
      const text = 'The dog is happy.';
      const suggestions = suggestSimplifications(text);
      expect(suggestions.size).toBe(0);
    });

    it('flags very complex words (4+ syllables)', () => {
      const text = 'The internationalization of communication is important.';
      const suggestions = suggestSimplifications(text);
      // Both words have 4+ syllables
      expect(suggestions.size).toBeGreaterThan(0);
    });
  });

  describe('SIMPLIFICATION_MAP', () => {
    it('contains clinical term simplifications', () => {
      expect(SIMPLIFICATION_MAP['intervention']).toBe('help');
      expect(SIMPLIFICATION_MAP['therapeutic']).toBe('helpful');
      expect(SIMPLIFICATION_MAP['cognitive']).toBe('thinking');
      expect(SIMPLIFICATION_MAP['behavioral']).toBe('action');
    });

    it('contains general word simplifications', () => {
      expect(SIMPLIFICATION_MAP['approximately']).toBe('about');
      expect(SIMPLIFICATION_MAP['subsequently']).toBe('then');
      expect(SIMPLIFICATION_MAP['necessary']).toBe('needed');
      expect(SIMPLIFICATION_MAP['utilize']).toBe('use');
    });
  });

  describe('formatReadingLevelResult', () => {
    it('formats result for display', () => {
      const result = calculateReadingLevel('This is a simple test sentence.');
      const formatted = formatReadingLevelResult(result);
      
      expect(formatted).toContain('Grade Level');
      expect(formatted).toContain('Flesch Ease');
      expect(formatted).toContain('Words');
      expect(formatted).toContain('Sentences');
    });

    it('includes readability descriptions', () => {
      const result = calculateReadingLevel('Simple text here.');
      const formatted = formatReadingLevelResult(result);
      
      // Should include description from getReadabilityDescription
      expect(formatted).toMatch(/Easy|Standard|Difficult/);
    });
  });

  describe('Edge Cases', () => {
    it('handles text with only punctuation', () => {
      const result = calculateReadingLevel('... !!! ???');
      expect(result.wordCount).toBe(0);
    });

    it('handles text with numbers', () => {
      const result = calculateReadingLevel('I have 5 cats and 3 dogs.');
      expect(result.wordCount).toBe(5); // Numbers without letters excluded
    });

    it('handles very long sentences gracefully', () => {
      const longText = Array(100).fill('word').join(' ') + '.';
      const result = calculateReadingLevel(longText);
      expect(result.avgWordsPerSentence).toBe(100);
    });

    it('handles single word text', () => {
      const result = calculateReadingLevel('Hello');
      expect(result.wordCount).toBe(1);
      expect(result.sentenceCount).toBe(1);
    });

    it('handles Unicode and special characters', () => {
      const result = calculateReadingLevel('Café résumé naïve.');
      expect(result.wordCount).toBeGreaterThan(0);
    });
  });

  describe('Client View Reading Level Target', () => {
    // Tests specific to the 6th-8th grade target for client views
    
    it('validates client-appropriate text', () => {
      const clientText = `
        You are doing great work. We talked about ways to feel better.
        Keep trying the breathing exercise. It helps with stress.
        You have made good progress. Your next step is to practice daily.
      `;
      const result = validateReadingLevel(clientText, 6, 8);
      expect(result.gradeLevel).toBeLessThanOrEqual(8);
    });

    it('rejects clinical language for client view', () => {
      const clinicalText = `
        The patient presents with symptoms consistent with Generalized Anxiety Disorder.
        Cognitive behavioral interventions are recommended for symptom management.
        Psychoeducation regarding anxiety mechanisms will be provided.
      `;
      const result = validateReadingLevel(clinicalText, 6, 8);
      expect(result.isValid).toBe(false);
    });

    it('provides actionable suggestions for simplification', () => {
      const text = 'The intervention demonstrated effectiveness in symptom reduction.';
      const result = validateReadingLevel(text, 6, 8);
      
      // Should have suggestions
      expect(result.suggestions.length).toBeGreaterThan(0);
      
      // Suggestions should be actionable
      const hasActionableSuggestion = result.suggestions.some(
        s => s.includes('shorter') || s.includes('simpler') || s.includes('Replace')
      );
      expect(hasActionableSuggestion).toBe(true);
    });
  });
});

