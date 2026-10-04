export const ROUTINE_CATEGORIES = ['ESCUELA', 'HOGAR', 'CALMA', 'AUTOCUIDADO'] as const;
export type RoutineCategory = (typeof ROUTINE_CATEGORIES)[number];

export interface Routine {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: RoutineCategory;
  points: number;
  completed: boolean;
  createdAt: string;
}

export interface CreateRoutineInput {
  tasks?: string[];
  title: string;
  description?: string;
  category: RoutineCategory;
  points: number;
}

const routines: Routine[] = [{ id: '11111111-1111-4111-8111-111111111111', userId: '1', title: 'Leer 10 minutos', description: 'Leer un cuento corto en un lugar tranquilo.', category: 'ESCUELA', points: 10, completed: false, createdAt: new Date('2026-08-30T12:00:00.000Z').toISOString() }];

export const listRoutines = (userId: string, page: number, pageSize: number): { data: Routine[]; total: number } => {
  const owned = routines.filter(routine => routine.userId === userId);
  const start = (page - 1) * pageSize;
  return { data: owned.slice(start, start + pageSize), total: owned.length };
};

export const findRoutine = (userId: string, routineId: string): Routine | undefined => routines.find(routine => routine.userId === userId && routine.id === routineId);

export const createRoutine = (userId: string, input: CreateRoutineInput): Routine => {
  const routine: Routine = { id: crypto.randomUUID(), userId, title: input.title.trim(), description: input.description?.trim() || null, category: input.category, points: input.points, completed: false, createdAt: new Date().toISOString() };
  routines.unshift(routine);
  return routine;
};
