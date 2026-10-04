import { logAuthError } from '../../../../../lib/auth/log-error';
// src/app/api/auth/mobile/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { findUserByCredentials } from '../../../../../lib/auth/user-repository';
import { createSessionToken } from '../../../../../lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const { username, password } = body && typeof body === 'object' ? body as Record<string, unknown> : {};

    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Usuario y contraseña son requeridos.' } },
        { status: 400 }
      );
    }

    const user = await findUserByCredentials(username, password);

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Usuario o contraseña incorrectos.' } },
        { status: 401 }
      );
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const token = await createSessionToken({
      sub: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      roles: user.roles,
      permissions: user.permissions,
    }, expiresAt);

    const response = NextResponse.json(
      {
        data: {
          sessionToken: token,
          expiresAt: expiresAt.toISOString(),
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );

    response.headers.set('Authorization', `Bearer ${token}`);

    return response;
  } catch (error) {
    logAuthError('login', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'No se pudo iniciar sesión.' } },
      { status: 500 }
    );
  }
}
