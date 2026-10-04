import { NextRequest, NextResponse } from 'next/server';
import { hasPermission, readSession } from '../../../../../lib/auth/session';
import { addTask } from '../../../../../lib/routines/repository';
import { validTitle, validationError } from '../../../../../lib/routines/validation';

export const POST = async (request: NextRequest, context: { params: Promise<{ routineId: string }> }): Promise<NextResponse> => {
  const session = await readSession(request);
  if (session.status === 'unauthorized') return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: session.message } }, { status: 401 });
  if (!hasPermission(session.user, 'rutinas.manage')) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'No tienes permiso para añadir tareas.' } }, { status: 403 });
  const { routineId } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(routineId)) return validationError([{ field: 'routineId', message: 'Identificador inválido.', type: 'uuid' }]);
  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  const title = body && typeof body === 'object' && 'title' in body ? body.title : undefined;
  if (!validTitle(title)) return validationError([{ field: 'title', message: 'Tarea: escribe entre 2 y 80 caracteres.', type: 'length' }]);
  try {
    const task = await addTask(session.user.sub, routineId, title);
    return task ? NextResponse.json({ data: task }, { status: 201 }) : NextResponse.json({ error: { code: 'NOT_FOUND', message: 'No encontramos la rutina solicitada.' } }, { status: 404 });
  } catch { return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'No se pudo añadir la tarea.' } }, { status: 500 }); }
};
