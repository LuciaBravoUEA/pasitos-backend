import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const prisma = new PrismaClient();
if (!process.env.DEMO_ACCOUNT_PASSWORD) throw new Error('Configura DEMO_ACCOUNT_PASSWORD antes de crear cuentas de demostración.');
const passwordHash = password => {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
};

const upsertUser = async ({ username, email, name, roleCode, roleName, password }) => prisma.user.upsert({
  where: { username },
  update: { email, full_name: name, role_code: roleCode, role_name: roleName },
  create: { username, email, full_name: name, role_code: roleCode, role_name: roleName, password: '!migrated!', passwordHash: passwordHash(password) },
});

try {
  const student = await prisma.user.findUnique({ where: { username: 'estudiante.ejemplo' } });
  if (!student) throw new Error('No se encontró estudiante.ejemplo; no se crean datos de prueba para evitar reemplazar usuarios.');
  const guardian = await upsertUser({ username: 'familia.demo', email: 'familia.demo@pasitosmagicos.local', name: 'María López', roleCode: 'padre_familia', roleName: 'Padre de familia', password: process.env.DEMO_ACCOUNT_PASSWORD ?? '' });
  const teacher = await upsertUser({ username: 'docente.demo', email: 'docente.demo@pasitosmagicos.local', name: 'Carlos Pérez', roleCode: 'docente', roleName: 'Docente', password: process.env.DEMO_ACCOUNT_PASSWORD ?? '' });

  await prisma.studentGuardian.upsert({ where: { studentId_guardianId: { studentId: student.id, guardianId: guardian.id } }, update: {}, create: { studentId: student.id, guardianId: guardian.id } });
  await prisma.studentTeacher.upsert({ where: { studentId_teacherId: { studentId: student.id, teacherId: teacher.id } }, update: {}, create: { studentId: student.id, teacherId: teacher.id } });

  const routine = await prisma.routine.findFirst({ where: { userId: student.id }, orderBy: { createdAt: 'asc' } }) ?? await prisma.routine.create({ data: { userId: student.id, title: 'Rutina de mañana', description: 'Pequeños pasos para empezar el día.', category: 'AUTOCUIDADO', points: 20 } });
  const taskTitles = ['Levantarse', 'Cepillarse los dientes', 'Desayunar', 'Preparar mochila'];
  for (const [position, title] of taskTitles.entries()) {
    await prisma.task.upsert({ where: { id: `${position + 1}${'0'.repeat(7)}-0000-4000-8000-000000000000` }, update: { routineId: routine.id, title, position }, create: { id: `${position + 1}${'0'.repeat(7)}-0000-4000-8000-000000000000`, routineId: routine.id, title, position } });
  }
  const tasks = await prisma.task.findMany({ where: { routineId: routine.id }, orderBy: { position: 'asc' }, take: 4 });
  const date = new Date(new Date().toISOString().slice(0, 10));
  for (const task of tasks.slice(0, 3)) {
    await prisma.taskCompletion.upsert({ where: { studentId_taskId_activityDate: { studentId: student.id, taskId: task.id, activityDate: date } }, update: { completed: true, completedAt: new Date() }, create: { studentId: student.id, taskId: task.id, activityDate: date, completed: true, completedAt: new Date() } });
  }
  console.log(JSON.stringify({ student: student.username, guardian: guardian.username, teacher: teacher.username, routine: routine.title, tasks: tasks.length }));
} finally {
  await prisma.$disconnect();
}
