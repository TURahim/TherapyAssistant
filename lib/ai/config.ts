import type { AIModel, ModelConfig } from './types';

// =============================================================================
// MODEL CONFIGURATIONS
// =============================================================================

export const MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
  'gpt-4o': {
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 4096,
    costPer1kPromptTokens: 0.005,
    costPer1kCompletionTokens: 0.015,
  },
  'gpt-4o-mini': {
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 4096,
    costPer1kPromptTokens: 0.00015,
    costPer1kCompletionTokens: 0.0006,
  },
  'gpt-4-turbo': {
    model: 'gpt-4-turbo',
    temperature: 0.3,
    maxTokens: 4096,
    costPer1kPromptTokens: 0.01,
    costPer1kCompletionTokens: 0.03,
  },
  'gpt-3.5-turbo': {
    model: 'gpt-3.5-turbo',
    temperature: 0.3,
    maxTokens: 4096,
    costPer1kPromptTokens: 0.0005,
    costPer1kCompletionTokens: 0.0015,
  },
};

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

/**
 * Default model for each pipeline stage
 */
export const STAGE_MODELS = {
  preprocessing: 'gpt-4o-mini' as AIModel,
  crisis_check: 'gpt-4o' as AIModel, // Use best model for safety
  extraction: 'gpt-4o' as AIModel,
  therapist_view: 'gpt-4o-mini' as AIModel,
  client_view: 'gpt-4o-mini' as AIModel,
  summary: 'gpt-4o-mini' as AIModel,
};

/**
 * Temperature settings by stage
 */
export const STAGE_TEMPERATURES = {
  preprocessing: 0.1, // Very deterministic
  crisis_check: 0.0, // Maximum consistency for safety
  extraction: 0.3, // Some creativity for clinical insight
  therapist_view: 0.4, // More natural language
  client_view: 0.5, // Warm, friendly tone
  summary: 0.4,
};

/**
 * Max tokens by stage
 */
export const STAGE_MAX_TOKENS = {
  preprocessing: 2048,
  crisis_check: 1024,
  extraction: 4096,
  therapist_view: 3072,
  client_view: 2048,
  summary: 1536,
};

// =============================================================================
// LIMITS & THRESHOLDS
// =============================================================================

export const LIMITS = {
  /** Maximum transcript length in characters */
  maxTranscriptLength: 100000,
  
  /** Minimum transcript length for processing */
  minTranscriptLength: 100,
  
  /** Maximum chunk size for processing */
  maxChunkSize: 8000,
  
  /** Target chunk overlap */
  chunkOverlap: 200,
  
  /** Maximum retries for API calls */
  maxRetries: 3,
  
  /** Base delay for retry backoff (ms) */
  retryBaseDelay: 1000,
  
  /** Request timeout (ms) */
  requestTimeout: 60000,
  
  /** Maximum concurrent API calls */
  maxConcurrency: 2,
};

export const THRESHOLDS = {
  /** Confidence threshold for crisis detection */
  crisisConfidence: 0.7,
  
  /** Minimum reading level grade for client view */
  minReadingLevel: 5,
  
  /** Maximum reading level grade for client view */
  maxReadingLevel: 8,
  
  /** Progress change threshold to trigger update */
  progressChangeThreshold: 10,
  
  /** Similarity threshold for deduplication */
  similarityThreshold: 0.85,
};

// =============================================================================
// READING LEVEL TARGETS
// =============================================================================

export const READING_LEVEL = {
  /** Target Flesch-Kincaid grade level for client view */
  targetGrade: 6,
  
  /** Maximum acceptable grade level */
  maxGrade: 8,
  
  /** Minimum Flesch reading ease score */
  minFleschEase: 60,
};

// =============================================================================
// PROMPT TEMPLATES
// =============================================================================

export const SYSTEM_PROMPTS = {
  base: `You are an AI assistant helping mental health professionals with treatment planning. 
Your responses must be:
- Clinically accurate and evidence-based
- Sensitive to the therapeutic relationship
- Respectful of patient privacy and confidentiality
- Clear and well-structured

IMPORTANT: You are assisting, not replacing, licensed mental health professionals. 
All outputs require clinical review before use.`,

  crisis: `You are a crisis assessment specialist. Your primary responsibility is to identify 
any indicators of risk in therapy transcripts. You must:
- Never miss potential crisis indicators
- Err on the side of caution
- Provide clear justification for risk assessments
- Flag any suicidal ideation, self-harm, or safety concerns`,

  extraction: `You are a clinical documentation specialist. Extract structured information 
from therapy session transcripts. You must:
- Use clinical language appropriate for documentation
- Include ICD-10 codes when relevant
- Cite specific quotes from the transcript
- Distinguish between client statements and therapist observations`,

  clientFacing: `You are creating content for therapy clients. Your language must be:
- Warm, supportive, and encouraging
- Written at a 6th-8th grade reading level
- Free of clinical jargon
- Focused on strengths and progress
- Empowering and hope-oriented`,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get model configuration for a stage
 */
export function getModelConfig(stage: keyof typeof STAGE_MODELS): ModelConfig {
  const modelName = STAGE_MODELS[stage];
  return {
    ...MODEL_CONFIGS[modelName],
    temperature: STAGE_TEMPERATURES[stage],
    maxTokens: STAGE_MAX_TOKENS[stage],
  };
}

/**
 * Calculate estimated cost for token usage
 */
export function calculateCost(
  model: AIModel,
  promptTokens: number,
  completionTokens: number
): number {
  const config = MODEL_CONFIGS[model];
  const promptCost = (promptTokens / 1000) * config.costPer1kPromptTokens;
  const completionCost = (completionTokens / 1000) * config.costPer1kCompletionTokens;
  return promptCost + completionCost;
}

/**
 * Get environment-based model override
 */
export function getModelOverride(): AIModel | null {
  const override = process.env.AI_MODEL_OVERRIDE;
  if (override && override in MODEL_CONFIGS) {
    return override as AIModel;
  }
  return null;
}

/**
 * Check if AI features are enabled
 */
export function isAIEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

