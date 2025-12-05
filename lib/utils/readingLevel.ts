/**
 * Reading Level Utilities
 * 
 * Functions for calculating and validating reading levels using
 * the Flesch-Kincaid readability formulas. Used to ensure client-facing
 * content is accessible (target: 6th-8th grade level).
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ReadingLevelResult {
  /** Flesch-Kincaid Grade Level (0-18+) */
  gradeLevel: number;
  
  /** Flesch Reading Ease score (0-100, higher = easier) */
  fleschEase: number;
  
  /** Total word count */
  wordCount: number;
  
  /** Total sentence count */
  sentenceCount: number;
  
  /** Total syllable count */
  syllableCount: number;
  
  /** Average words per sentence */
  avgWordsPerSentence: number;
  
  /** Average syllables per word */
  avgSyllablesPerWord: number;
}

export interface ReadingLevelValidation {
  /** Whether the text meets the target reading level */
  isValid: boolean;
  
  /** The calculated grade level */
  gradeLevel: number;
  
  /** Target grade level */
  targetGrade: number;
  
  /** Issues found in the text */
  issues: string[];
  
  /** Suggestions for improvement */
  suggestions: string[];
}

// =============================================================================
// READING LEVEL CALCULATION
// =============================================================================

/**
 * Calculate Flesch-Kincaid reading level metrics
 * 
 * @param text - The text to analyze
 * @returns Reading level metrics
 */
export function calculateReadingLevel(text: string): ReadingLevelResult {
  // Clean and tokenize text
  const cleanText = text.trim();
  
  if (!cleanText) {
    return {
      gradeLevel: 0,
      fleschEase: 100,
      wordCount: 0,
      sentenceCount: 0,
      syllableCount: 0,
      avgWordsPerSentence: 0,
      avgSyllablesPerWord: 0,
    };
  }

  // Count words
  const words = getWords(cleanText);
  const wordCount = words.length;

  if (wordCount === 0) {
    return {
      gradeLevel: 0,
      fleschEase: 100,
      wordCount: 0,
      sentenceCount: 0,
      syllableCount: 0,
      avgWordsPerSentence: 0,
      avgSyllablesPerWord: 0,
    };
  }

  // Count sentences
  const sentences = getSentences(cleanText);
  const sentenceCount = Math.max(sentences.length, 1);

  // Count syllables
  const syllableCount = words.reduce((acc, word) => acc + countSyllables(word), 0);

  // Calculate averages
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;

  // Flesch-Kincaid Grade Level formula:
  // 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
  const gradeLevel = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;

  // Flesch Reading Ease formula:
  // 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
  const fleschEase = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

  return {
    gradeLevel: Math.max(0, roundToDecimal(gradeLevel, 1)),
    fleschEase: Math.max(0, Math.min(100, roundToDecimal(fleschEase, 1))),
    wordCount,
    sentenceCount,
    syllableCount,
    avgWordsPerSentence: roundToDecimal(avgWordsPerSentence, 1),
    avgSyllablesPerWord: roundToDecimal(avgSyllablesPerWord, 2),
  };
}

/**
 * Validate text against target reading level
 * 
 * @param text - The text to validate
 * @param targetGrade - Target grade level (default: 6)
 * @param maxGrade - Maximum acceptable grade level (default: 8)
 * @returns Validation result with issues and suggestions
 */
export function validateReadingLevel(
  text: string,
  targetGrade: number = 6,
  maxGrade: number = 8
): ReadingLevelValidation {
  const result = calculateReadingLevel(text);
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Check grade level
  if (result.gradeLevel > maxGrade) {
    issues.push(`Text is at grade level ${result.gradeLevel}, above the maximum of ${maxGrade}`);
  }

  // Check average words per sentence
  if (result.avgWordsPerSentence > 15) {
    issues.push(`Sentences are too long (avg: ${result.avgWordsPerSentence} words)`);
    suggestions.push('Break long sentences into shorter ones (aim for 10-15 words)');
  }

  // Check for complex words (3+ syllables)
  const words = getWords(text);
  const complexWords = words.filter(w => countSyllables(w) >= 3);
  const complexWordPercentage = (complexWords.length / Math.max(words.length, 1)) * 100;
  
  if (complexWordPercentage > 15) {
    issues.push(`Too many complex words (${roundToDecimal(complexWordPercentage, 1)}%)`);
    suggestions.push('Replace words with 3+ syllables with simpler alternatives');
    
    // Suggest specific complex words to replace
    const topComplexWords = complexWords.slice(0, 5).map(w => `"${w}"`);
    if (topComplexWords.length > 0) {
      suggestions.push(`Consider simpler alternatives for: ${topComplexWords.join(', ')}`);
    }
  }

  // Check Flesch ease score
  if (result.fleschEase < 60) {
    issues.push(`Flesch ease score is low (${result.fleschEase}), aim for 60+`);
    suggestions.push('Use shorter words and simpler sentence structures');
  }

  // Add general suggestions if issues exist
  if (issues.length > 0) {
    suggestions.push('Use "you" and "your" to speak directly to the reader');
    suggestions.push('Avoid passive voice where possible');
    suggestions.push('Use bullet points or short paragraphs for clarity');
  }

  return {
    isValid: result.gradeLevel <= maxGrade && issues.length === 0,
    gradeLevel: result.gradeLevel,
    targetGrade,
    issues,
    suggestions: Array.from(new Set(suggestions)), // Remove duplicates
  };
}

// =============================================================================
// SYLLABLE COUNTING
// =============================================================================

/**
 * Count syllables in a word
 * Uses a rule-based approximation that handles most English words
 * 
 * @param word - The word to count syllables for
 * @returns Estimated syllable count
 */
export function countSyllables(word: string): number {
  // Clean the word
  let cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
  
  // Handle empty or very short words
  if (cleanWord.length === 0) return 0;
  if (cleanWord.length <= 2) return 1;

  // Special cases for common words with silent letters
  const specialCases: Record<string, number> = {
    'area': 3,
    'idea': 3,
    'real': 2,
    'file': 1,
    'smile': 1,
    'every': 3,
    'family': 3,
    'different': 3,
    'people': 2,
    'beautiful': 4,
    'favorite': 3,
    'interesting': 4,
    'comfortable': 4,
    'business': 3,
    'chocolate': 3,
    'orange': 2,
    'vegetable': 4,
    'separate': 3,
    'temperature': 4,
    'evening': 3,
    'camera': 3,
    'average': 3,
    'easily': 3,
    'definitely': 4,
    'usually': 4,
    'probably': 3,
    'actually': 4,
    'generally': 4,
  };

  if (specialCases[cleanWord]) {
    return specialCases[cleanWord];
  }

  // Handle suffixes that affect syllable count
  const suffixAdjustments: Array<[RegExp, number]> = [
    [/(?:ed)$/, -1], // '-ed' at end usually silent
    [/(?:es)$/, 0],  // '-es' sometimes adds syllable
    [/(?:le)$/, 0],  // '-le' at end counts
    [/(?:tion)$/, 1], // '-tion' is 1 syllable
    [/(?:sion)$/, 1], // '-sion' is 1 syllable
    [/(?:ious)$/, 2], // '-ious' is 2 syllables
    [/(?:eous)$/, 2], // '-eous' is 2 syllables
  ];

  // Remove silent 'e' at end (but not '-le')
  if (cleanWord.endsWith('e') && !cleanWord.endsWith('le') && cleanWord.length > 2) {
    cleanWord = cleanWord.slice(0, -1);
  }

  // Remove '-ed' if preceded by consonant other than 'd' or 't'
  if (cleanWord.endsWith('ed') && cleanWord.length > 2) {
    const beforeEd = cleanWord[cleanWord.length - 3];
    if (!/[dt]/.test(beforeEd)) {
      cleanWord = cleanWord.slice(0, -2);
    }
  }

  // Count vowel groups (sequences of vowels)
  const vowelGroups = cleanWord.match(/[aeiouy]+/g) || [];
  let count = vowelGroups.length;

  // Handle special vowel combinations that are single sounds
  const dipthongs = (cleanWord.match(/(?:ai|au|ay|ea|ee|ei|eu|ey|ie|oa|oo|ou|oy|ue|ui)/g) || []).length;
  count -= dipthongs * 0.5; // Each diphthong over-counts by about 0.5

  // Ensure minimum of 1 syllable
  return Math.max(1, Math.round(count));
}

// =============================================================================
// TEXT ANALYSIS HELPERS
// =============================================================================

/**
 * Extract words from text
 */
export function getWords(text: string): string[] {
  return text
    .replace(/[^\w\s'-]/g, ' ') // Remove punctuation except apostrophes and hyphens
    .split(/\s+/)
    .filter(word => word.length > 0 && /[a-zA-Z]/.test(word)); // Only include words with letters
}

/**
 * Extract sentences from text
 */
export function getSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space or end of string
  return text
    .split(/[.!?]+(?:\s+|$)/)
    .filter(sentence => sentence.trim().length > 0);
}

/**
 * Get complex words (3+ syllables)
 */
export function getComplexWords(text: string): string[] {
  return getWords(text).filter(word => countSyllables(word) >= 3);
}

/**
 * Get a readability description based on grade level
 */
export function getReadabilityDescription(gradeLevel: number): string {
  if (gradeLevel <= 5) {
    return 'Very Easy (5th grade or below)';
  } else if (gradeLevel <= 6) {
    return 'Easy (6th grade)';
  } else if (gradeLevel <= 8) {
    return 'Fairly Easy (7th-8th grade)';
  } else if (gradeLevel <= 10) {
    return 'Standard (9th-10th grade)';
  } else if (gradeLevel <= 12) {
    return 'Fairly Difficult (11th-12th grade)';
  } else if (gradeLevel <= 16) {
    return 'Difficult (College level)';
  } else {
    return 'Very Difficult (Graduate level)';
  }
}

/**
 * Get a readability description based on Flesch ease score
 */
export function getFleschEaseDescription(score: number): string {
  if (score >= 90) {
    return 'Very Easy';
  } else if (score >= 80) {
    return 'Easy';
  } else if (score >= 70) {
    return 'Fairly Easy';
  } else if (score >= 60) {
    return 'Standard';
  } else if (score >= 50) {
    return 'Fairly Difficult';
  } else if (score >= 30) {
    return 'Difficult';
  } else {
    return 'Very Difficult';
  }
}

// =============================================================================
// SIMPLIFICATION SUGGESTIONS
// =============================================================================

/** Common complex words and their simpler alternatives */
export const SIMPLIFICATION_MAP: Record<string, string> = {
  // Clinical terms
  'intervention': 'help',
  'therapeutic': 'helpful',
  'cognitive': 'thinking',
  'behavioral': 'action',
  'assessment': 'check',
  'evaluation': 'review',
  'diagnosis': 'condition',
  'prognosis': 'outlook',
  'symptom': 'sign',
  'treatment': 'care',
  'medication': 'medicine',
  'prescription': 'medicine',
  'consultation': 'meeting',
  'recommendation': 'suggestion',
  
  // General complex words
  'approximately': 'about',
  'subsequently': 'then',
  'previously': 'before',
  'currently': 'now',
  'additionally': 'also',
  'however': 'but',
  'therefore': 'so',
  'consequently': 'so',
  'nevertheless': 'but',
  'furthermore': 'also',
  'regarding': 'about',
  'concerning': 'about',
  'necessary': 'needed',
  'sufficient': 'enough',
  'significant': 'big',
  'substantial': 'large',
  'individual': 'person',
  'immediately': 'right away',
  'opportunity': 'chance',
  'possibility': 'chance',
  'difficulty': 'trouble',
  'experience': 'feel',
  'demonstrate': 'show',
  'communicate': 'talk',
  'participate': 'join in',
  'understand': 'get',
  'accomplish': 'do',
  'establish': 'set up',
  'determine': 'find out',
  'implement': 'do',
  'utilize': 'use',
  'obtain': 'get',
  'provide': 'give',
  'require': 'need',
  'indicate': 'show',
  'facilitate': 'help',
};

/**
 * Suggest simplifications for complex words in text
 */
export function suggestSimplifications(text: string): Map<string, string> {
  const suggestions = new Map<string, string>();
  const words = getWords(text);

  for (const word of words) {
    const lower = word.toLowerCase();
    
    // Check our simplification map
    if (SIMPLIFICATION_MAP[lower]) {
      suggestions.set(word, SIMPLIFICATION_MAP[lower]);
    }
    // Suggest simplification for other complex words
    else if (countSyllables(word) >= 4) {
      suggestions.set(word, `(consider simpler word for "${word}")`);
    }
  }

  return suggestions;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Round a number to specified decimal places
 */
function roundToDecimal(num: number, places: number): number {
  const multiplier = Math.pow(10, places);
  return Math.round(num * multiplier) / multiplier;
}

/**
 * Format reading level result for display
 */
export function formatReadingLevelResult(result: ReadingLevelResult): string {
  return `Reading Level Analysis:
  Grade Level: ${result.gradeLevel} (${getReadabilityDescription(result.gradeLevel)})
  Flesch Ease: ${result.fleschEase} (${getFleschEaseDescription(result.fleschEase)})
  Words: ${result.wordCount}
  Sentences: ${result.sentenceCount}
  Avg Words/Sentence: ${result.avgWordsPerSentence}
  Avg Syllables/Word: ${result.avgSyllablesPerWord}`;
}

