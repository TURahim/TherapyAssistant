import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const signupSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['THERAPIST', 'CLIENT']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = signupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, password, role } = result.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hash(password, 12);

    // Create user with role-specific profile
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role: role as UserRole,
        // Create role-specific profile
        ...(role === 'THERAPIST' && {
          therapist: {
            create: {
              // Default preferences will be created separately or on first settings access
            },
          },
        }),
        ...(role === 'CLIENT' && {
          client: {
            create: {
              // For demo purposes, assign to the first therapist
              // In production, clients would be invited by therapists
              therapistId: await getDefaultTherapistId(),
            },
          },
        }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}

// Helper to get a default therapist for demo client accounts
async function getDefaultTherapistId(): Promise<string> {
  const therapist = await prisma.therapist.findFirst({
    select: { id: true },
  });

  if (!therapist) {
    throw new Error('No therapist available. Please create a therapist account first.');
  }

  return therapist.id;
}

