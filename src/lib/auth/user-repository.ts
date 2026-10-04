import type { User } from '@prisma/client';
import { REGISTRATION_ROLES, type RegistrationRole } from './registration-roles';
import { prisma } from '../prisma';
import { hashPassword, verifyPassword } from './password';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  roles: Array<{ id: string; code: string; name: string }>;
  permissions: Array<{ id: string; code: string }>;
}

const permissions = [
  { id: 'permission-routines-read', code: 'rutinas.read' },
  { id: 'permission-routines-manage', code: 'rutinas.manage' },
];

const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  username: user.username,
  name: user.full_name,
  email: user.email,
  roles: [{ id: 'role-user', code: user.role_code, name: user.role_name }],
  permissions,
});
const normalize = (value: string): string => value.trim().toLocaleLowerCase();

export const findUserByCredentials = async (username: string, password: string): Promise<AuthUser | undefined> => {
  const user = await prisma.user.findUnique({ where: { username: normalize(username) } });
  if (!user) return undefined;

  if (user.passwordHash) {
    if (!(await verifyPassword(password, user.passwordHash))) return undefined;
  } else {
    if (user.password !== password) return undefined;
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password), password: '!migrated!' },
    });
  }
  return toAuthUser(user);
};

export const hasUser = async (username: string, email: string): Promise<boolean> => {
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: normalize(username) }, { email: normalize(email) }] },
    select: { id: true },
  });
  return Boolean(user);
};

export const createUser = async (input: { name: string; username: string; email: string; password: string; role?: RegistrationRole }): Promise<AuthUser> => {
  const user = await prisma.user.create({
    data: {
      full_name: input.name.trim(),
      role_code: input.role ?? 'estudiante',
      role_name: REGISTRATION_ROLES[input.role ?? 'estudiante'],
      username: normalize(input.username),
      email: normalize(input.email),
      password: '!migrated!',
      passwordHash: await hashPassword(input.password),
    },
  });
  return toAuthUser(user);
};
