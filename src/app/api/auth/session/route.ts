import { logAuthError } from '../../../../lib/auth/log-error';
// src/app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readSession, revokeSession } from '../../../../lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const session = await readSession(request);
    if (session.status === 'unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: session.message } },
        { status: 401 }
      );
    }

    return NextResponse.json({
      data: { ...session.user, id: session.user.sub },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    logAuthError('session', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'No se pudo comprobar la sesión.' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  await revokeSession(request);
  const response = NextResponse.json({
    data: { message: 'Sesión cerrada' },
    meta: { timestamp: new Date().toISOString() },
  });

  return response;
}
