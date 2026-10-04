import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '../../../../../lib/auth/session';
import { getStudentProgress, parseTrackingDate, validateTrackingRole } from '../../../../../lib/student-tracking/repository';

export async function GET(request: NextRequest, context: RouteContext<'/api/estudiantes/[studentId]/progreso'>): Promise<NextResponse> {
  const session = await readSession(request);
  if (session.status === 'unauthorized') return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: session.message } }, { status: 401 });
  const roleCode = session.user.roles[0]?.code ?? '';
  if (!validateTrackingRole(roleCode)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Tu rol no puede consultar progreso.' } }, { status: 403 });
  const { studentId } = await context.params;
  try {
    const date = request.nextUrl.searchParams.get('date') ?? undefined;
    parseTrackingDate(date);
    const progress = await getStudentProgress(session.user.sub, roleCode, studentId, date);
    if (!progress) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'No tienes acceso al progreso de este estudiante.' } }, { status: 403 });
    return NextResponse.json({ data: progress });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_DATE') return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'La fecha debe usar el formato YYYY-MM-DD.' } }, { status: 422 });
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'No se pudo consultar el progreso.' } }, { status: 500 });
  }
}
