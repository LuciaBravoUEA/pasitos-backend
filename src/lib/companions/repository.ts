import { prisma } from '../prisma';

const adultSelect = { id: true, full_name: true, username: true, role_code: true } as const;
interface AdultRow { id: string; full_name: string; username: string; role_code: string }
export interface Companion { id: string; name: string; username: string; role: 'padre_familia' | 'docente' }
export const isAdultRole = (role: string): boolean => ['padre', 'padre_familia', 'tutor', 'docente'].includes(role);
const toCompanion = (row: AdultRow): Companion | null => isAdultRole(row.role_code)
  ? { id: row.id, name: row.full_name, username: row.username, role: row.role_code === 'docente' ? 'docente' : 'padre_familia' }
  : null;

export const findCompanion = async (username: string): Promise<Companion | null> => {
  const adult = await prisma.user.findUnique({ where: { username: username.trim().toLocaleLowerCase() }, select: adultSelect });
  return adult ? toCompanion(adult) : null;
};

export const listCompanions = async (studentId: string): Promise<Companion[]> => {
  const [guardians, teachers] = await Promise.all([
    prisma.studentGuardian.findMany({ where: { studentId }, select: { guardian: { select: adultSelect } } }),
    prisma.studentTeacher.findMany({ where: { studentId }, select: { teacher: { select: adultSelect } } }),
  ]);
  const companions = [...guardians.map(row => toCompanion(row.guardian)), ...teachers.map(row => toCompanion(row.teacher))]
    .filter((row): row is Companion => row !== null);
  return [...new Map(companions.map(row => [row.id, row])).values()].sort((a, b) => a.name.localeCompare(b.name));
};

export const authorizeCompanion = async (studentId: string, adultId: string): Promise<Companion | null> => {
  const adult = await prisma.user.findUnique({ where: { id: adultId }, select: adultSelect });
  const companion = adult ? toCompanion(adult) : null;
  if (!companion || adultId === studentId) return null;
  if (companion.role === 'docente') {
    await prisma.studentTeacher.createMany({ data: [{ studentId, teacherId: adultId }], skipDuplicates: true });
  } else {
    await prisma.studentGuardian.createMany({ data: [{ studentId, guardianId: adultId }], skipDuplicates: true });
  }
  return companion;
};

export const revokeCompanion = async (studentId: string, adultId: string): Promise<void> => {
  await prisma.$transaction([
    prisma.studentGuardian.deleteMany({ where: { studentId, guardianId: adultId } }),
    prisma.studentTeacher.deleteMany({ where: { studentId, teacherId: adultId } }),
  ]);
};
