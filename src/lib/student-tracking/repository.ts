import { prisma } from '../prisma';

export type TrackingRole = 'estudiante' | 'padre' | 'padre_familia' | 'tutor' | 'docente';

interface StudentSummary {
  id: string;
  name: string;
  email: string;
  roleCode: string;
  routinesToday: number;
  tasksToday: number;
  completedToday: number;
  progressPercent: number;
}

interface TaskProgress {
  id: string;
  routineId: string;
  routineTitle: string;
  title: string;
  description: string | null;
  position: number;
  completed: boolean;
  completedAt: string | null;
}

export interface TaskActivityEvent {
  id: string;
  studentId: string;
  taskId: string;
  routineId: string;
  taskTitle: string;
  routineTitle: string;
  completed: boolean;
  activityDate: string;
  recordedAt: string;
}

export interface StudentProgress {
  student: { id: string; name: string; email: string };
  date: string;
  routines: Array<{
    id: string;
    title: string;
    description: string | null;
    category: string;
    tasks: TaskProgress[];
  }>;
  totals: { tasks: number; completed: number; pending: number; progressPercent: number; stars: number };
}

const normalizeRole = (roleCode: string): TrackingRole | null => {
  const normalized = roleCode.trim().toLocaleLowerCase();
  return ['estudiante', 'padre', 'padre_familia', 'tutor', 'docente'].includes(normalized)
    ? normalized as TrackingRole
    : null;
};

const parseDate = (value: string | null | undefined): Date => {
  if (!value) return new Date(new Date().toISOString().slice(0, 10));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('INVALID_DATE');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('INVALID_DATE');
  return date;
};

const formatDate = (date: Date): string => date.toISOString().slice(0, 10);

const canAccessStudent = async (viewerId: string, roleCode: string, studentId: string): Promise<boolean> => {
  const role = normalizeRole(roleCode);
  if (role === 'estudiante') return viewerId === studentId;
  if (role === 'padre' || role === 'padre_familia' || role === 'tutor') {
    return Boolean(await prisma.studentGuardian.findUnique({ where: { studentId_guardianId: { studentId, guardianId: viewerId } }, select: { id: true } }));
  }
  if (role === 'docente') {
    return Boolean(await prisma.studentTeacher.findUnique({ where: { studentId_teacherId: { studentId, teacherId: viewerId } }, select: { id: true } }));
  }
  return false;
};

const toPercent = (completed: number, total: number): number => total === 0 ? 0 : Math.round((completed / total) * 100);

const buildProgress = async (studentId: string, date: Date): Promise<StudentProgress | null> => {
  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { id: true, full_name: true, email: true, role_code: true } });
  if (!student || student.role_code !== 'estudiante') return null;

  const routines = await prisma.routine.findMany({
    where: { userId: studentId },
    orderBy: { createdAt: 'asc' },
    include: {
      tasks: {
        orderBy: { position: 'asc' },
        include: {
          completions: { where: { studentId, activityDate: date }, select: { completed: true, completedAt: true } },
        },
      },
    },
  });

  const mappedRoutines = routines.map(routine => ({
    id: routine.id,
    title: routine.title,
    description: routine.description,
    category: routine.category,
    tasks: routine.tasks.map(task => ({
      id: task.id,
      routineId: routine.id,
      routineTitle: routine.title,
      title: task.title,
      description: task.description,
      position: task.position,
      completed: task.completions[0]?.completed ?? false,
      completedAt: task.completions[0]?.completedAt?.toISOString() ?? null,
    })),
  }));

  const tasks = mappedRoutines.flatMap(routine => routine.tasks);
  const completed = tasks.filter(task => task.completed).length;
  const stars = routines.reduce((sum, routine) => sum + (routine.tasks.length > 0 && routine.tasks.every(task => task.completions[0]?.completed) ? routine.points : 0), 0);
  return {
    student: { id: student.id, name: student.full_name, email: student.email },
    date: formatDate(date),
    routines: mappedRoutines,
    totals: { tasks: tasks.length, completed, pending: tasks.length - completed, progressPercent: toPercent(completed, tasks.length), stars },
  };
};

export const listAssignedStudents = async (viewerId: string, roleCode: string, dateValue?: string): Promise<StudentSummary[]> => {
  const role = normalizeRole(roleCode);
  if (!role || role === 'estudiante') return [];
  const date = parseDate(dateValue);
  const relations = role === 'docente'
    ? await prisma.studentTeacher.findMany({ where: { teacherId: viewerId }, select: { studentId: true } })
    : await prisma.studentGuardian.findMany({ where: { guardianId: viewerId }, select: { studentId: true } });
  const summaries = await Promise.all(relations.map(async relation => {
    const progress = await buildProgress(relation.studentId, date);
    if (!progress) return null;
    const routinesToday = progress.routines.length;
    return {
      id: progress.student.id,
      name: progress.student.name,
      email: progress.student.email,
      roleCode: 'estudiante',
      routinesToday,
      tasksToday: progress.totals.tasks,
      completedToday: progress.totals.completed,
      progressPercent: progress.totals.progressPercent,
    };
  }));
  return summaries.filter((summary): summary is StudentSummary => summary !== null);
};

export const getStudentProgress = async (viewerId: string, roleCode: string, studentId: string, dateValue?: string): Promise<StudentProgress | null> => {
  if (!(await canAccessStudent(viewerId, roleCode, studentId))) return null;
  return buildProgress(studentId, parseDate(dateValue));
};

export const completeTask = async (viewerId: string, roleCode: string, taskId: string, completed: boolean, dateValue?: string): Promise<TaskProgress | null> => {
  if (normalizeRole(roleCode) !== 'estudiante') return null;
  const date = parseDate(dateValue);
  const update = () => prisma.$transaction(async transaction => {
    const task = await transaction.task.findUnique({
      where: { id: taskId },
      include: { routine: { select: { id: true, userId: true, title: true } } },
    });
    if (!task || task.routine.userId !== viewerId) return null;

    const where = { studentId_taskId_activityDate: { studentId: viewerId, taskId, activityDate: date } };
    const existing = await transaction.taskCompletion.findUnique({ where });
    const completion = existing?.completed === completed
      ? existing
      : await transaction.taskCompletion.upsert({
        where,
        create: { studentId: viewerId, taskId, activityDate: date, completed, completedAt: completed ? new Date() : null },
        update: { completed, completedAt: completed ? new Date() : null },
      });

    if (existing?.completed !== completed) {
      await transaction.taskActivityEvent.create({
        data: {
          studentId: viewerId,
          taskId: task.id,
          routineId: task.routine.id,
          taskTitle: task.title,
          routineTitle: task.routine.title,
          completed,
          activityDate: date,
        },
      });
    }

    return { task, completion };
  }, { isolationLevel: 'Serializable' });

  let result: Awaited<ReturnType<typeof update>> = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      result = await update();
      break;
    } catch (error) {
      const isSerializationConflict = typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034';
      if (!isSerializationConflict || attempt === 2) throw error;
    }
  }
  if (!result) return null;
  const { task, completion } = result;
  return {
    id: task.id,
    routineId: task.routine.id,
    routineTitle: task.routine.title,
    title: task.title,
    description: task.description,
    position: task.position,
    completed: completion.completed,
    completedAt: completion.completedAt?.toISOString() ?? null,
  };
};

export const listTaskActivityHistory = async (
  viewerId: string,
  roleCode: string,
  studentId: string,
  page: number,
  pageSize: number,
  dateFrom?: string,
  dateTo?: string,
): Promise<{ data: TaskActivityEvent[]; total: number } | null> => {
  if (!(await canAccessStudent(viewerId, roleCode, studentId))) return null;

  const from = dateFrom ? parseDate(dateFrom) : undefined;
  const to = dateTo ? parseDate(dateTo) : undefined;
  if (from && to && from > to) throw new Error('INVALID_DATE_RANGE');

  const where = {
    studentId,
    ...(from || to ? { activityDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };
  const [events, total] = await prisma.$transaction([
    prisma.taskActivityEvent.findMany({
      where,
      orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.taskActivityEvent.count({ where }),
  ]);
  return {
    data: events.map(event => ({
      id: event.id,
      studentId: event.studentId,
      taskId: event.taskId,
      routineId: event.routineId,
      taskTitle: event.taskTitle,
      routineTitle: event.routineTitle,
      completed: event.completed,
      activityDate: formatDate(event.activityDate),
      recordedAt: event.recordedAt.toISOString(),
    })),
    total,
  };
};

export const validateTrackingRole = (roleCode: string): TrackingRole | null => normalizeRole(roleCode);
export const parseTrackingDate = parseDate;
