import fs from 'fs';
import path from 'path';
import { canonicalPlanSchema } from '../lib/ai/schemas';
import { validateReadingLevel } from '../lib/utils/readingLevel';
import type { EvaluationSample } from './evaluationDataset';
import { evaluationDataset } from './evaluationDataset';
import type { CrisisCheckResult } from '../lib/ai/schemas';
import type { CanonicalPlanInput } from '../lib/ai/schemas';
import type { CrisisIndicatorType } from '../lib/ai/schemas';
import { CrisisSeverity } from '@prisma/client';

type ModelName = string;

interface FieldCompletenessResult {
  score: number;
  missing: string[];
}

interface CrisisMetrics {
  precision: number;
  recall: number;
  severityMatch: boolean;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
}

interface SampleModelResult {
  sampleId: string;
  model: ModelName;
  schemaValid: boolean;
  schemaError?: string;
  fieldCompleteness: FieldCompletenessResult;
  readingGrade: number;
  meetsReadingTarget: boolean;
  crisis: CrisisMetrics;
  cost?: number;
  latencyMs?: number;
}

interface ModelAggregate {
  samples: number;
  schemaPass: number;
  completenessScores: number[];
  readingGrades: number[];
  readingPass: number;
  crisis: {
    tp: number;
    fp: number;
    fn: number;
    severityMatches: number;
  };
  costs: number[];
  latencies: number[];
}

interface ModelSummary {
  schemaValidationRate: number;
  avgCompleteness: number;
  avgReadingGrade: number;
  readingPassRate: number;
  crisisPrecision: number;
  crisisRecall: number;
  crisisSeverityAgreement: number;
  avgCost: number;
  avgLatencyMs: number;
}

function calculateFieldCompleteness(plan: CanonicalPlanInput): FieldCompletenessResult {
  const checks: Record<string, boolean> = {
    presentingConcerns: plan.presentingConcerns.length > 0,
    clinicalImpressions: plan.clinicalImpressions.length > 0,
    diagnoses: plan.diagnoses.length > 0,
    goals: plan.goals.length > 0,
    interventions: plan.interventions.length > 0,
    strengths: plan.strengths.length > 0,
    riskFactors: plan.riskFactors.length > 0,
    homework: plan.homework.length > 0,
    sessionReferences: plan.sessionReferences.length > 0,
    crisisAssessment: !!plan.crisisAssessment?.severity,
  };

  const total = Object.keys(checks).length;
  const present = Object.values(checks).filter(Boolean).length;
  const missing = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => key);

  return {
    score: present / total,
    missing,
  };
}

function evaluateCrisisMetrics(
  groundTruth: { severity: CrisisSeverity; indicators: CrisisIndicatorType[] },
  predicted: CrisisCheckResult
): CrisisMetrics {
  const truthSet = new Set<CrisisIndicatorType>(groundTruth.indicators);
  const predictedIndicators = predicted.assessment?.indicators?.map(i => i.type as CrisisIndicatorType) ?? [];
  const predictedSet = new Set<CrisisIndicatorType>(predictedIndicators);

  const truePositives = Array.from(predictedSet).filter(type => truthSet.has(type)).length;
  const falsePositives = Array.from(predictedSet).filter(type => !truthSet.has(type)).length;
  const falseNegatives = Array.from(truthSet).filter(type => !predictedSet.has(type)).length;

  const precision = predictedSet.size === 0 ? 1 : truePositives / (truePositives + falsePositives || 1);
  const recall = truthSet.size === 0 ? 1 : truePositives / (truePositives + falseNegatives || 1);

  return {
    precision,
    recall,
    severityMatch: predicted.severity === groundTruth.severity,
    truePositives,
    falsePositives,
    falseNegatives,
  };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, val) => acc + val, 0) / values.length;
}

function evaluateSample(sample: EvaluationSample, model: ModelName): SampleModelResult {
  const output = sample.models[model];

  const schemaResult = canonicalPlanSchema.safeParse(output.canonicalPlan);
  const fieldCompleteness = calculateFieldCompleteness(output.canonicalPlan);
  const reading = validateReadingLevel(output.clientViewText, 8, 8);
  const crisis = evaluateCrisisMetrics(sample.groundTruth, output.crisisResult);

  return {
    sampleId: sample.id,
    model,
    schemaValid: schemaResult.success,
    schemaError: schemaResult.success ? undefined : schemaResult.error.issues[0]?.message,
    fieldCompleteness,
    readingGrade: reading.gradeLevel,
    meetsReadingTarget: reading.isValid,
    crisis,
    cost: output.tokenUsage?.estimatedCost,
    latencyMs: output.latencyMs,
  };
}

function updateAggregate(aggregate: ModelAggregate, result: SampleModelResult) {
  aggregate.samples += 1;
  if (result.schemaValid) aggregate.schemaPass += 1;
  aggregate.completenessScores.push(result.fieldCompleteness.score);
  aggregate.readingGrades.push(result.readingGrade);
  if (result.meetsReadingTarget) aggregate.readingPass += 1;
  aggregate.crisis.tp += result.crisis.truePositives;
  aggregate.crisis.fp += result.crisis.falsePositives;
  aggregate.crisis.fn += result.crisis.falseNegatives;
  if (result.crisis.severityMatch) aggregate.crisis.severityMatches += 1;
  if (typeof result.cost === 'number') aggregate.costs.push(result.cost);
  if (typeof result.latencyMs === 'number') aggregate.latencies.push(result.latencyMs);
}

function summarize(aggregate: ModelAggregate): ModelSummary {
  const precision = aggregate.crisis.tp + aggregate.crisis.fp === 0 ? 1 : aggregate.crisis.tp / (aggregate.crisis.tp + aggregate.crisis.fp);
  const recall = aggregate.crisis.tp + aggregate.crisis.fn === 0 ? 1 : aggregate.crisis.tp / (aggregate.crisis.tp + aggregate.crisis.fn);

  return {
    schemaValidationRate: aggregate.schemaPass / Math.max(aggregate.samples, 1),
    avgCompleteness: mean(aggregate.completenessScores),
    avgReadingGrade: mean(aggregate.readingGrades),
    readingPassRate: aggregate.readingPass / Math.max(aggregate.samples, 1),
    crisisPrecision: precision,
    crisisRecall: recall,
    crisisSeverityAgreement: aggregate.crisis.severityMatches / Math.max(aggregate.samples, 1),
    avgCost: mean(aggregate.costs),
    avgLatencyMs: mean(aggregate.latencies),
  };
}

function main() {
  const perSampleResults: SampleModelResult[] = [];
  const aggregates = new Map<ModelName, ModelAggregate>();

  for (const sample of evaluationDataset) {
    for (const modelName of Object.keys(sample.models)) {
      const result = evaluateSample(sample, modelName);
      perSampleResults.push(result);

      if (!aggregates.has(modelName)) {
        aggregates.set(modelName, {
          samples: 0,
          schemaPass: 0,
          completenessScores: [],
          readingGrades: [],
          readingPass: 0,
          crisis: { tp: 0, fp: 0, fn: 0, severityMatches: 0 },
          costs: [],
          latencies: [],
        });
      }

      updateAggregate(aggregates.get(modelName)!, result);
    }
  }

  const summaries: Record<ModelName, ModelSummary> = {};
  aggregates.forEach((aggregate, modelName) => {
    summaries[modelName] = summarize(aggregate);
  });

  const output = {
    generatedAt: new Date().toISOString(),
    sampleCount: evaluationDataset.length,
    modelSummaries: summaries,
    samples: perSampleResults,
  };

  const outputPath = path.resolve(__dirname, 'evaluation-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  // Console output
  console.log('Evaluation complete');
  console.log(`Samples: ${evaluationDataset.length}`);
  console.log('Model summaries:');
  console.table(
    Object.entries(summaries).map(([model, summary]) => ({
      model,
      schema: `${(summary.schemaValidationRate * 100).toFixed(1)}%`,
      completeness: summary.avgCompleteness.toFixed(2),
      readingPass: `${(summary.readingPassRate * 100).toFixed(1)}%`,
      crisisPrecision: summary.crisisPrecision.toFixed(2),
      crisisRecall: summary.crisisRecall.toFixed(2),
      severityAgree: `${(summary.crisisSeverityAgreement * 100).toFixed(1)}%`,
      avgLatencyMs: summary.avgLatencyMs.toFixed(0),
      avgCost: `$${summary.avgCost.toFixed(4)}`,
    }))
  );

  console.log(`Results written to ${outputPath}`);
}

main();

