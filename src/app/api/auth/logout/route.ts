import { NextRequest, NextResponse } from 'next/server';
import { revokeSession } from '../../../../lib/auth/session';
import { logAuthError } from '../../../../lib/auth/log-error';

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    await revokeSession(request);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logAuthError('logout', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'No se pudo completar la operación.' } }, { status: 500 });
  }
};
