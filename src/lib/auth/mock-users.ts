export interface MockUser {
  id: string;
  username: string;
  password: string;
  name: string;
  email: string;
  roles: Array<{ id: string; code: string; name: string }>;
  permissions: Array<{ id: string; code: string }>;
}

const users = new Map<string, MockUser>([
  [
    'estudiante.ejemplo',
    {
      id: '1',
      username: 'estudiante.ejemplo',
      password: process.env.DEMO_ACCOUNT_PASSWORD ?? '',
      name: 'Estudiante de ejemplo',
      email: 'estudiante.ejemplo@pasitosmagicos.local',
      roles: [{ id: 'role-estudiante', code: 'estudiante', name: 'Estudiante' }],
      permissions: [
        { id: 'permission-routines-read', code: 'rutinas.read' },
        { id: 'permission-routines-manage', code: 'rutinas.manage' },
      ],
    },
  ],
]);

export const findUserByCredentials = (username: string, password: string): MockUser | undefined => {
  const user = users.get(username.trim().toLocaleLowerCase());
  return user?.password === password ? user : undefined;
};

export const hasUser = (username: string, email: string): boolean =>
  users.has(username.trim().toLocaleLowerCase()) || Array.from(users.values()).some(user => user.email === email);

export const createUser = (input: Omit<MockUser, 'id' | 'roles' | 'permissions'>): MockUser => {
  const user: MockUser = {
    ...input,
    id: crypto.randomUUID(),
    roles: [{ id: 'role-user', code: 'user', name: 'Usuario' }],
    permissions: [
      { id: 'permission-routines-read', code: 'rutinas.read' },
      { id: 'permission-routines-manage', code: 'rutinas.manage' },
    ],
  };

  users.set(user.username.trim().toLocaleLowerCase(), user);
  return user;
};
