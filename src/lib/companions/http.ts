import { NextResponse, type NextRequest } from 'next/server';
import { readSession } from '../auth/session';
import { isAdultRole } from './repository';

export const companionError = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status });
export const authorizeCompanionRequest = async (request: NextRequest, studentOnly = true) => {
  const session = await readSession(request);
  if (session.status === 'unauthorized') return companionError(401, 'UNAUTHORIZED', session.message);
  const role = session.user.roles[0]?.code ?? '';
  if (role !== 'estudiante' && (studentOnly || !isAdultRole(role))) return companionError(403, 'FORBIDDEN', 'Solo el estudiante puede autorizar a sus acompañantes.');
  return { user: session.user, role };
};
export const readCompanionBody = async (request: NextRequest): Promise<Record<string, unknown> | null> => {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch { return null; }
};
export const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
