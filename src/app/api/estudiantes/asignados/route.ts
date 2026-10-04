import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '../../../../lib/auth/session';
import { listAssignedStudents, parseTrackingDate, validateTrackingRole } from '../../../../lib/student-tracking/repository';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await readSession(request);
  if (session.status === 'unauthorized') return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: session.message } }, { status: 401 });
  const roleCode = session.user.roles[0]?.code ?? '';
  if (!validateTrackingRole(roleCode) || roleCode === 'estudiante') return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Solo padres, tutores y docentes pueden consultar estudiantes asignados.' } }, { status: 403 });
  try {
    const date = request.nextUrl.searchParams.get('date') ?? undefined;
    parseTrackingDate(date);
    const students = await listAssignedStudents(session.user.sub, roleCode, date);
    return NextResponse.json({ data: students, meta: { date: date ?? new Date().toISOString().slice(0, 10), total: students.length } });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_DATE') return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'La fecha debe usar el formato YYYY-MM-DD.' } }, { status: 422 });
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'No se pudo consultar estudiantes.' } }, { status: 500 });
  }
}
