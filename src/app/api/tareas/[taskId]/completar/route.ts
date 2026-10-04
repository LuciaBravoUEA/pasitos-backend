import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '../../../../../lib/auth/session';
import { completeTask, parseTrackingDate } from '../../../../../lib/student-tracking/repository';

export async function POST(request: NextRequest, context: RouteContext<'/api/tareas/[taskId]/completar'>): Promise<NextResponse> {
  const session = await readSession(request);
  if (session.status === 'unauthorized') return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: session.message } }, { status: 401 });
  const roleCode = session.user.roles[0]?.code ?? '';
  let body: unknown = {};
  try { body = await request.json(); } catch { /* defaults to completed=true */ }
  const input = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const completed = typeof input.completed === 'boolean' ? input.completed : true;
  const date = typeof input.date === 'string' ? input.date : undefined;
  try {
    parseTrackingDate(date);
    const { taskId } = await context.params;
    const task = await completeTask(session.user.sub, roleCode, taskId, completed, date);
    if (!task) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'No puedes modificar esta tarea.' } }, { status: 403 });
    return NextResponse.json({ data: task });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_DATE') return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'La fecha debe usar el formato YYYY-MM-DD.' } }, { status: 422 });
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'No se pudo guardar el cumplimiento.' } }, { status: 500 });
  }
}
