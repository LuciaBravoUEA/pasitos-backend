import { NextRequest, NextResponse } from 'next/server';
import { hasPermission, readSession } from '../../../../lib/auth/session';
import { findRoutine, updateRoutine, deleteRoutine } from '../../../../lib/routines/repository';

import { validateRoutine, validationError } from '../../../../lib/routines/validation';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, context: RouteContext<'/api/rutinas/[routineId]'>): Promise<NextResponse> {
  const session = await readSession(request);
  if (session.status === 'unauthorized') return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: session.message } }, { status: 401 });
  if (!hasPermission(session.user, 'rutinas.read')) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'No tienes permiso para consultar rutinas.' } }, { status: 403 });
  const { routineId } = await context.params;
  if (!UUID_PATTERN.test(routineId)) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'El identificador de rutina no es válido.' } }, { status: 422 });
  const routine = await findRoutine(session.user.sub, routineId);
  if (!routine) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'No encontramos la rutina solicitada.' } }, { status: 404 });
  return NextResponse.json({ data: routine });
}

const authorizeMutation = async (request: NextRequest, routineId: string) => {
  const session = await readSession(request);
  if (session.status === 'unauthorized') return { response: NextResponse.json({ error: { code: 'UNAUTHORIZED', message: session.message } }, { status: 401 }) };
  if (!hasPermission(session.user, 'rutinas.manage')) return { response: NextResponse.json({ error: { code: 'FORBIDDEN', message: 'No tienes permiso para modificar rutinas.' } }, { status: 403 }) };
  if (!UUID_PATTERN.test(routineId)) return { response: validationError([{ field: 'routineId', message: 'Identificador inválido.', type: 'uuid' }]) };
  return { userId: session.user.sub };
};
const notFound = () => NextResponse.json({ error: { code: 'NOT_FOUND', message: 'No encontramos la rutina solicitada.' } }, { status: 404 });
const serverError = () => NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'No se pudo guardar el cambio.' } }, { status: 500 });

export const PUT = async (request: NextRequest, context: RouteContext<'/api/rutinas/[routineId]'>): Promise<NextResponse> => {
  const { routineId } = await context.params;
  const auth = await authorizeMutation(request, routineId);
  if (auth.response) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return validationError([{ field: 'title', message: 'Completa los datos de la rutina.', type: 'required' }]); }
  const validated = validateRoutine(body);
  if (!validated.success) return validationError(validated.details);
  try {
    const routine = await updateRoutine(auth.userId, routineId, validated.data);
    return routine ? NextResponse.json({ data: routine }) : notFound();
  } catch { return serverError(); }
};

export const DELETE = async (request: NextRequest, context: RouteContext<'/api/rutinas/[routineId]'>): Promise<NextResponse> => {
  const { routineId } = await context.params;
  const auth = await authorizeMutation(request, routineId);
  if (auth.response) return auth.response;
  try {
    return await deleteRoutine(auth.userId, routineId) ? new NextResponse(null, { status: 204 }) : notFound();
  } catch { return serverError(); }
};
