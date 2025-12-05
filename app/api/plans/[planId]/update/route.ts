import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { formatErrorResponse, ValidationError, ForbiddenError, NotFoundError, ConflictError } from '@/lib/utils/errors';
import { prisma } from '@/lib/db/prisma';
import * as planQueries from '@/lib/db/queries/plans';
import * as auditService from '@/lib/services/auditService';
import type { Prisma } from '@prisma/client';

interface RouteParams {
  params: Promise<{ planId: string }>;
}

/**
 * PUT /api/plans/[planId]/update
 * Update a treatment plan with manual edits
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { planId } = await params;
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

    // Verify plan ownership
    const isOwner = await planQueries.isPlanOfTherapist(planId, therapist.id);
    if (!isOwner) {
      throw new ForbiddenError('You do not have access to this plan');
    }

    // Get current plan
    const plan = await planQueries.getPlanById(planId);
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    // Check if locked
    if (plan.isLocked) {
      throw new ConflictError('Plan is currently locked. Please wait until processing completes.');
    }

    const body = await request.json();

    // Validate required fields
    if (!body.clinicalSummary || !body.goals || !body.interventions) {
      throw new ValidationError('Missing required fields');
    }

    // Get next version number
    const nextVersion = await planQueries.getLatestVersionNumber(planId) + 1;

    // Transform edited data back to therapist view format
    const updatedTherapistView = {
      header: {
        clientName: plan.client.preferredName || 
          `${plan.client.user.firstName} ${plan.client.user.lastName}`,
        planStatus: plan.status,
        lastUpdated: new Date().toISOString(),
        version: nextVersion,
      },
      clinicalSummary: body.clinicalSummary,
      diagnoses: {
        primary: body.diagnoses[0] ? {
          code: body.diagnoses[0].icdCode,
          name: body.diagnoses[0].name,
          status: body.diagnoses[0].status,
        } : undefined,
        secondary: body.diagnoses.slice(1).map((d: { icdCode?: string; name: string; status: string }) => ({
          code: d.icdCode,
          name: d.name,
          status: d.status,
        })),
      },
      treatmentGoals: {
        shortTerm: body.goals
          .filter((g: { type: string }) => g.type === 'short_term')
          .map((g: { id: string; description: string; measurableOutcome: string; progress: number; status: string; interventionIds: string[] }) => ({
            id: g.id,
            goal: g.description,
            objective: g.measurableOutcome,
            progress: g.progress,
            status: g.status,
            interventions: g.interventionIds,
          })),
        longTerm: body.goals
          .filter((g: { type: string }) => g.type === 'long_term')
          .map((g: { id: string; description: string; measurableOutcome: string; progress: number; status: string; interventionIds: string[] }) => ({
            id: g.id,
            goal: g.description,
            objective: g.measurableOutcome,
            progress: g.progress,
            status: g.status,
            interventions: g.interventionIds,
          })),
      },
      interventionPlan: body.interventions.map((i: { modality: string; name: string; description: string; frequency: string; rationale: string }) => ({
        modality: i.modality,
        technique: i.name,
        description: i.description,
        frequency: i.frequency,
        rationale: i.rationale,
      })),
      riskAssessment: {
        currentLevel: body.currentRiskLevel,
        factors: body.riskFactors.map((r: { description: string; mitigatingFactors: string[] }) => ({
          type: 'other',
          description: r.description,
          mitigation: r.mitigatingFactors.join(', '),
        })),
      },
      progressNotes: (plan.therapistView as { progressNotes?: { summary: string; recentChanges: string[]; nextSteps: string[] } })?.progressNotes || {
        summary: '',
        recentChanges: [],
        nextSteps: [],
      },
      homework: body.homework.map((h: { id: string; title: string; description: string; status: string }) => ({
        id: h.id,
        task: h.title,
        purpose: h.description,
        status: h.status,
      })),
      sessionHistory: (plan.therapistView as { sessionHistory?: Array<{ sessionNumber: number; date: string; keyPoints: string[] }> })?.sessionHistory || [],
    };

    // Update canonical plan with edits
    const currentCanonical = plan.canonicalPlan as Record<string, unknown> || {};
    const updatedCanonicalPlan = {
      ...currentCanonical,
      updatedAt: new Date().toISOString(),
      version: nextVersion,
      diagnoses: body.diagnoses.map((d: { id: string; icdCode?: string; name: string; status: string; notes?: string }) => ({
        id: d.id,
        icdCode: d.icdCode,
        name: d.name,
        status: d.status,
        notes: d.notes,
      })),
      goals: body.goals,
      interventions: body.interventions,
      homework: body.homework,
      riskFactors: body.riskFactors,
      crisisAssessment: {
        ...(currentCanonical.crisisAssessment as Record<string, unknown> || {}),
        severity: body.currentRiskLevel,
        lastAssessed: new Date().toISOString(),
      },
    };

    // Update plan
    await planQueries.updatePlan(planId, {
      canonicalPlan: updatedCanonicalPlan as Prisma.InputJsonValue,
      therapistView: updatedTherapistView as Prisma.InputJsonValue,
      currentVersion: nextVersion,
    });

    // Create version snapshot
    await planQueries.createPlanVersion({
      planId,
      versionNumber: nextVersion,
      canonicalPlan: updatedCanonicalPlan as Prisma.InputJsonValue,
      therapistView: updatedTherapistView as Prisma.InputJsonValue,
      clientView: plan.clientView as Prisma.InputJsonValue,
      changeType: 'manual_edit',
      changeSummary: 'Manual edits by therapist',
      createdBy: session.user.id,
    });

    // Log audit
    await auditService.logAudit({
      userId: session.user.id,
      action: 'UPDATE',
      entityType: 'TreatmentPlan',
      entityId: planId,
      metadata: {
        action: 'manual_edit',
        versionNumber: nextVersion,
      } as Prisma.InputJsonValue,
    });

    return NextResponse.json({
      success: true,
      versionNumber: nextVersion,
    });
  } catch (error) {
    console.error('PUT /api/plans/[planId]/update error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

