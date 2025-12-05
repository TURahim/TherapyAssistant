import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as clientService from '@/lib/services/clientService';
import { formatErrorResponse } from '@/lib/utils/errors';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/clients
 * Get all clients for the authenticated therapist
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only therapists can access client list
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const params = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      search: searchParams.get('search') || undefined,
      isActive: searchParams.get('isActive') === 'true' 
        ? true 
        : searchParams.get('isActive') === 'false' 
          ? false 
          : undefined,
      sortBy: searchParams.get('sortBy') || 'intakeDate',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };

    const result = await clientService.getTherapistClients(
      therapist.id,
      session.user.id,
      params
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/clients error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

/**
 * POST /api/clients
 * Create a new client
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only therapists can create clients
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

    const body = await request.json();

    // Validate input
    const validation = clientService.validateCreateClientInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 422 }
      );
    }

    // Create client with therapist's ID
    const result = await clientService.createClient(
      {
        ...body,
        therapistId: therapist.id,
      },
      session.user.id
    );

    return NextResponse.json(
      {
        id: result.client!.id,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/clients error:', error);
    const { body, status } = formatErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

