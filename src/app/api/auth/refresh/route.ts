import { NextRequest, NextResponse } from 'next/server';
import { refreshSession } from '../../../../lib/auth/session';
import { logAuthError } from '../../../../lib/auth/log-error';

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    if (!(await refreshSession(request))) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Inicia sesión para continuar.' } }, { status: 401 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logAuthError('refresh', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'No se pudo completar la operación.' } }, { status: 500 });
  }
};
