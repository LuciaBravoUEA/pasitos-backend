import { NextRequest, NextResponse } from 'next/server';
import { isRegistrationRole } from '../../../../../lib/auth/registration-roles';
import { createUser, hasUser } from '../../../../../lib/auth/user-repository';
import { createSessionToken } from '../../../../../lib/auth/session';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Los datos de registro son inválidos.', details: [{ message: 'Envía un formulario de registro válido.' }] } }, { status: 422 });
    }

    const { name, username, email, password, role = 'estudiante' } = body as Record<string, unknown>;
    if (!isRegistrationRole(role)) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Elige un perfil válido.', details: [{ field: 'role', message: 'Elige Estudiante, Padre/madre de familia o Docente.' }] } }, { status: 422 });
    if (typeof name !== 'string' || typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string' || !name.trim() || !username.trim() || !email.trim() || password.length < 6) {
      const details = [
        ...(typeof name !== 'string' || !name.trim() ? [{ field: 'name', message: 'Escribe el nombre de la persona.' }] : []),
        ...(typeof username !== 'string' || !username.trim() ? [{ field: 'username', message: 'Escribe un nombre de usuario.' }] : []),
        ...(typeof email !== 'string' || !email.trim() ? [{ field: 'email', message: 'Escribe un correo electrónico válido.' }] : []),
        ...(typeof password !== 'string' || password.length < 6 ? [{ field: 'password', message: 'Usa una contraseña de al menos 6 caracteres.' }] : []),
      ];
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Completa todos los campos correctamente.', details } }, { status: 422 });
    }

    if (await hasUser(username, email)) {
      return NextResponse.json({ error: { code: 'CONFLICT', message: 'El usuario o correo ya está registrado.' } }, { status: 409 });
    }

    const user = await createUser({ name: name.trim(), username: username.trim(), email: email.trim(), password, role });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const sessionToken = await createSessionToken({
      sub: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      roles: user.roles,
      permissions: user.permissions,
    }, expiresAt);
    return NextResponse.json({ data: { sessionToken, expiresAt: expiresAt.toISOString() } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Los datos de registro son inválidos.' } }, { status: 422 });
  }
}
