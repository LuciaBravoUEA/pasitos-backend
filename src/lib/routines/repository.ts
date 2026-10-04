import type { Routine as PrismaRoutine } from '@prisma/client';
import { prisma } from '../prisma';
import type { CreateRoutineInput, Routine, RoutineCategory } from './store';

const toRoutine = (routine: PrismaRoutine): Routine => ({
  ...routine,
  category: routine.category as RoutineCategory,
  createdAt: routine.createdAt.toISOString(),
});

export const listRoutines = async (userId: string, page: number, pageSize: number): Promise<{ data: Routine[]; total: number }> => {
  const where = { userId };
  const [data, total] = await prisma.$transaction([
    prisma.routine.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.routine.count({ where }),
  ]);
  return { data: data.map(toRoutine), total };
};

export const findRoutine = async (userId: string, routineId: string): Promise<Routine | undefined> => {
  const routine = await prisma.routine.findFirst({ where: { id: routineId, userId }, include: { tasks: { orderBy: { position: 'asc' } } } });
  return routine ? toRoutine(routine) : undefined;
};

export const createRoutine = async (userId: string, input: CreateRoutineInput): Promise<Routine> => {
  const routine = await prisma.routine.create({
    data: {
      userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category,
      points: input.points,
      tasks: { create: (input.tasks ?? [input.title]).map((title, position) => ({ title: title.trim(), position })) },
    },
  });
  return toRoutine(routine);
};

export const updateRoutine = async (userId: string, routineId: string, input: CreateRoutineInput): Promise<Routine | undefined> => prisma.$transaction(async tx => {
  const result = await tx.routine.updateMany({ where: { id: routineId, userId }, data: { title: input.title, description: input.description || null, category: input.category, points: input.points } });
  if (!result.count) return undefined;
  const routine = await tx.routine.findUniqueOrThrow({ where: { id: routineId }, include: { tasks: { orderBy: { position: 'asc' } } } });
  return toRoutine(routine);
});

export const deleteRoutine = async (userId: string, routineId: string): Promise<boolean> => {
  const result = await prisma.routine.deleteMany({ where: { id: routineId, userId } });
  return result.count > 0;
};

export const addTask = async (userId: string, routineId: string, title: string) => prisma.$transaction(async tx => {
  // Serializar altas sobre la misma rutina evita posiciones duplicadas entre solicitudes concurrentes.
  const owned = await tx.routine.updateMany({ where: { id: routineId, userId }, data: { completed: false } });
  if (!owned.count) return null;
  const last = await tx.task.aggregate({ where: { routineId }, _max: { position: true } });
  return tx.task.create({ data: { routineId, title: title.trim(), position: (last._max.position ?? -1) + 1 } });
});
