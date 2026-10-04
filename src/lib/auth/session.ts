import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { prisma } from '../prisma';

interface SessionPayload {
  sub: string;
  username: string;
  email: string;
  name: string;
  roles: Array<{ id: string; code: string; name: string }>;
  permissions: Array<{ id: string; code: string }>;
  exp: number;
}

export type SessionResult =
  | { status: 'authenticated'; user: SessionPayload }
  | { status: 'unauthorized'; message: string };

const tokenHash = (token: string): string => createHash('sha256').update(token).digest('hex');
const readToken = (request: NextRequest): string | undefined => {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return undefined;
  const token = authorization.slice(7);
  return /^[a-f0-9]{64}$/.test(token) ? token : undefined;
};

export const createSessionToken = async (payload: Omit<SessionPayload, 'iat' | 'exp'>, expiresAt: Date): Promise<string> => {
  const token = randomBytes(32).toString('hex');
  await prisma.userSession.create({
    data: {
      id: randomUUID(),
      user_id: payload.sub,
      session_token: tokenHash(token),
      cookie_name: 'mobile-bearer',
      expires_at: expiresAt,
    },
  });
  return token;
};

export const readSession = async (request: NextRequest): Promise<SessionResult> => {
  const token = readToken(request);
  const unauthorized: SessionResult = { status: 'unauthorized', message: 'Inicia sesión para continuar.' };
  if (!token) return unauthorized;
  const session = await prisma.userSession.findUnique({
    where: { session_token: tokenHash(token) },
    include: { user: true },
  });
  if (!session || session.expires_at.getTime() <= Date.now()) return unauthorized;
  const user = session.user;
  return {
    status: 'authenticated',
    user: {
      sub: user.id,
      username: user.username,
      email: user.email,
      name: user.full_name,
      roles: [{ id: 'role-user', code: user.role_code, name: user.role_name }],
      permissions: [
        { id: 'permission-routines-read', code: 'rutinas.read' },
        { id: 'permission-routines-manage', code: 'rutinas.manage' },
      ],
      exp: Math.floor(session.expires_at.getTime() / 1000),
    },
  };
};

export const revokeSession = async (request: NextRequest): Promise<void> => {
  const token = readToken(request);
  if (!token) return;
  await prisma.userSession.deleteMany({ where: { session_token: tokenHash(token) } });
};

// El contrato 204 exige conservar el Bearer: no entrega otro token al cliente.
export const refreshSession = async (request: NextRequest): Promise<boolean> => {
  const token = readToken(request);
  if (!token) return false;
  const result = await prisma.userSession.updateMany({
    where: { session_token: tokenHash(token), expires_at: { gt: new Date() } },
    data: { expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });
  return result.count === 1;
};

export const hasPermission = (session: SessionPayload, permission: string): boolean =>
  session.permissions.some(item => item.code === permission);
