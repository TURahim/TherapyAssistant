import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as clientService from '@/lib/services/clientService';
import { formatErrorResponse } from '@/lib/utils/errors';
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{ clientId: string }>;
}

/**
 * GET /api/clients/[clientId]
 * Get a single client by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { clientId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only therapists can access client details
    if (session.user.role !== 'THERAPIST' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get therapist ID
    const therapist = await prisma.therapist.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!therapist) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }

    const client = await clientService.getClient(
      clientId,
      therapist.id,
      session.user.id
    );

    // Transform response
    return NextResponse.json({
      id: client.id,
      userId: client.userId,
      firstName: client.user.firstName,
      lastName: client.user.lastName,
      email: client.user.email,
      image: client.user.image,
      preferredName: client.preferredName,
      pronouns: client.pronouns,
      dateOfBirth: client.dateOfBirth,
      emergencyContact: client.emergencyContact,
      emergencyPhone: client.emergencyPhone,
      intakeDate: client.intakeDate,
      isActive: client.isActive,
      notes: client.notes,
      therapist: {
        id: client.therapist.id,
        name: `${client.therapist.user.firstName} ${client.therapist.user.lastName}`,
      },
      sessions: client.sessions.map((s) => ({
        id: s.id,
        sessionNumber: s.sessionNumber,
        scheduledAt: s.scheduledAt,
        status: s.status,
        crisisSeverity: s.crisisSeverity,
        hasSummary: !!s.summary,
      })),
      activePlan: client.treatmentPlans[0] || null,
      stats: {
        totalSessions: client._count.sessions,
        totalPlans: client._count.treatmentPlans,
      },
      createdAt: client.user.createdAt,
    });
  } catch (error) {
    console.error('GET /api/clients/[clientId] error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

/**
 * PUT /api/clients/[clientId]
 * Update a client
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { clientId } = await params;

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

    // Only allow updating specific fields
    const allowedFields = [
      'preferredName',
      'pronouns',
      'dateOfBirth',
      'emergencyContact',
      'emergencyPhone',
      'notes',
      'isActive',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Parse dateOfBirth if provided
    if (updateData.dateOfBirth && typeof updateData.dateOfBirth === 'string') {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }

    const updated = await clientService.updateClient(
      clientId,
      therapist.id,
      session.user.id,
      updateData
    );

    return NextResponse.json({
      id: updated.id,
      firstName: updated.user.firstName,
      lastName: updated.user.lastName,
      preferredName: updated.preferredName,
      isActive: updated.isActive,
    });
  } catch (error) {
    console.error('PUT /api/clients/[clientId] error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

/**
 * DELETE /api/clients/[clientId]
 * Deactivate a client (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { clientId } = await params;

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

    // Check if hard delete is requested
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('permanent') === 'true';

    if (hardDelete) {
      await clientService.deleteClientPermanently(
        clientId,
        therapist.id,
        session.user.id
      );
      return NextResponse.json({ deleted: true, permanent: true });
    } else {
      await clientService.deactivateClient(
        clientId,
        therapist.id,
        session.user.id
      );
      return NextResponse.json({ deleted: true, permanent: false });
    }
  } catch (error) {
    console.error('DELETE /api/clients/[clientId] error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

