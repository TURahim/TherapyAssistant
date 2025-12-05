import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { prismaMock } from '../../mocks/prisma';

import { GET as getClients } from '@/app/api/clients/route';
import { GET as getSessions } from '@/app/api/sessions/route';
import { GET as getPlans } from '@/app/api/plans/route';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/services/clientService', () => ({
  getTherapistClients: vi.fn().mockResolvedValue({ items: [], pagination: {} }),
  validateCreateClientInput: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/sessionService', () => ({
  getTherapistSessions: vi.fn().mockResolvedValue({ items: [], pagination: {} }),
  validateCreateSessionInput: vi.fn(),
  createSession: vi.fn(),
}));

vi.mock('@/lib/services/planService', () => ({
  getTherapistPlans: vi.fn().mockResolvedValue({ items: [], pagination: {} }),
}));

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;

function makeRequest(url: string, method: string = 'GET', body?: unknown) {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new NextRequest(new Request(url, init));
}

describe('API handlers auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.therapist.findUnique.mockReset();
  });

  describe('/api/clients', () => {
    it('returns 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);
      const res = await getClients(makeRequest('http://localhost/api/clients'));
      expect(res.status).toBe(401);
    });

    it('returns 200 and payload for therapist', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1', role: 'THERAPIST' } });
      prismaMock.therapist.findUnique.mockResolvedValueOnce({ id: 'therapist-1' });

      const res = await getClients(makeRequest('http://localhost/api/clients?page=1&limit=10'));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty('items');
    });
  });

  describe('/api/sessions', () => {
    it('returns 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);
      const res = await getSessions(makeRequest('http://localhost/api/sessions'));
      expect(res.status).toBe(401);
    });

    it('returns 200 for therapist sessions', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1', role: 'THERAPIST' } });
      prismaMock.therapist.findUnique.mockResolvedValueOnce({ id: 'therapist-1' });

      const res = await getSessions(makeRequest('http://localhost/api/sessions'));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty('items');
    });
  });

  describe('/api/plans', () => {
    it('returns 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);
      const res = await getPlans(makeRequest('http://localhost/api/plans'));
      expect(res.status).toBe(401);
    });

    it('returns 200 for therapist plans', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1', role: 'THERAPIST' } });
      prismaMock.therapist.findUnique.mockResolvedValueOnce({ id: 'therapist-1' });

      const res = await getPlans(makeRequest('http://localhost/api/plans'));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty('items');
    });
  });
});


