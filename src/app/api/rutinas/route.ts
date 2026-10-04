import { NextRequest, NextResponse } from 'next/server';
import { hasPermission, readSession } from '../../../lib/auth/session';
import { validateRoutine, validationError } from '../../../lib/routines/validation';
import { createRoutine, listRoutines } from '../../../lib/routines/repository';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await readSession(request);
  if (session.status === 'unauthorized') return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: session.message } }, { status: 401 });
  if (!hasPermission(session.user, 'rutinas.read')) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'No tienes permiso para consultar rutinas.' } }, { status: 403 });
  const page = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('pageSize') ?? '10', 10) || 10));
  const result = await listRoutines(session.user.sub, page, pageSize);
  return NextResponse.json({ data: result.data, meta: { page, pageSize, total: result.total, totalPages: Math.ceil(result.total / pageSize) } });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await readSession(request);
  if (session.status === 'unauthorized') return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: session.message } }, { status: 401 });
  if (!hasPermission(session.user, 'rutinas.manage')) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'No tienes permiso para crear rutinas.' } }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return validationError([{ field: 'title', message: 'Título: escribe un nombre para la rutina.', type: 'required' }]); }
  const validated = validateRoutine(body);
  if (!validated.success) return validationError(validated.details);
  return NextResponse.json({ data: await createRoutine(session.user.sub, validated.data) }, { status: 201 });
}
