import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '../../../../../lib/auth/session';
import { listTaskActivityHistory, parseTrackingDate, validateTrackingRole } from '../../../../../lib/student-tracking/repository';

const positiveInteger = (value: string | null, fallback: number): number | null => {
  if (value === null) return fallback;
  if (!/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, context: RouteContext<'/api/estudiantes/[studentId]/historial'>): Promise<NextResponse> {
  const session = await readSession(request);
  if (session.status === 'unauthorized') return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: session.message } }, { status: 401 });
  const roleCode = session.user.roles[0]?.code ?? '';
  if (!validateTrackingRole(roleCode)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Tu rol no puede consultar el historial.' } }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const page = positiveInteger(params.get('page'), 1);
  const pageSize = positiveInteger(params.get('pageSize'), 20);
  if (page === null || pageSize === null || pageSize > 100 || page > Math.floor(Number.MAX_SAFE_INTEGER / pageSize)) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'La paginación no es válida.' } }, { status: 422 });
  }

  const dateFrom = params.get('dateFrom') ?? undefined;
  const dateTo = params.get('dateTo') ?? undefined;
  const { studentId } = await context.params;
  if (!UUID_PATTERN.test(studentId)) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'El identificador de estudiante no es válido.' } }, { status: 422 });
  }
  try {
    if (dateFrom) parseTrackingDate(dateFrom);
    if (dateTo) parseTrackingDate(dateTo);
    if (dateFrom && dateTo && dateFrom > dateTo) throw new Error('INVALID_DATE_RANGE');

    const result = await listTaskActivityHistory(session.user.sub, roleCode, studentId, page, pageSize, dateFrom, dateTo);
    if (!result) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'No tienes acceso al historial de este estudiante.' } }, { status: 403 });
    return NextResponse.json({
      data: result.data,
      meta: { page, pageSize, total: result.total, totalPages: Math.ceil(result.total / pageSize) },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_DATE') {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Las fechas deben usar el formato YYYY-MM-DD.' } }, { status: 422 });
    }
    if (error instanceof Error && error.message === 'INVALID_DATE_RANGE') {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'La fecha inicial no puede ser posterior a la fecha final.' } }, { status: 422 });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'No se pudo consultar el historial.' } }, { status: 500 });
  }
}
