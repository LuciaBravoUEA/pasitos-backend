export const REGISTRATION_ROLES = {
  estudiante: 'Estudiante',
  padre_familia: 'Padre/madre de familia',
  docente: 'Docente',
} as const;
export type RegistrationRole = keyof typeof REGISTRATION_ROLES;
export const isRegistrationRole = (value: unknown): value is RegistrationRole =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(REGISTRATION_ROLES, value);
