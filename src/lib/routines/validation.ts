import { NextResponse } from 'next/server';
import { ROUTINE_CATEGORIES, type CreateRoutineInput } from './store';

interface ValidationDetail { field: string; message: string; type: string }
export const validationError = (details: ValidationDetail[]): NextResponse => NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Corrige los campos indicados.', details } }, { status: 422 });
export const validTitle = (value: unknown): value is string => typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 80;

export const validateRoutine = (body: unknown): { success: true; data: CreateRoutineInput } | { success: false; details: ValidationDetail[] } => {
  const input = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const details: ValidationDetail[] = [];
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const description = typeof input.description === 'string' ? input.description.trim() : undefined;
  if (!validTitle(title)) details.push({ field: 'title', message: 'Título: escribe entre 2 y 80 caracteres.', type: 'length' });
  if (input.description !== undefined && typeof input.description !== 'string' || description && description.length > 240) details.push({ field: 'description', message: 'Descripción: usa texto de hasta 240 caracteres.', type: 'length' });
  if (typeof input.category !== 'string' || !ROUTINE_CATEGORIES.includes(input.category as CreateRoutineInput['category'])) details.push({ field: 'category', message: 'Categoría: selecciona una opción disponible.', type: 'enum' });
  if (typeof input.points !== 'number' || !Number.isInteger(input.points) || input.points < 1 || input.points > 100) details.push({ field: 'points', message: 'Puntos: escribe un entero entre 1 y 100.', type: 'range' });
  if (input.tasks !== undefined && (!Array.isArray(input.tasks) || input.tasks.length < 1 || input.tasks.length > 20 || !input.tasks.every(validTitle))) details.push({ field: 'tasks', message: 'Tareas: escribe entre 1 y 20 pasos de 2 a 80 caracteres.', type: 'length' });
  if (details.length) return { success: false, details };
  return { success: true, data: { title, description, category: input.category as CreateRoutineInput['category'], points: input.points as number, ...(Array.isArray(input.tasks) ? { tasks: input.tasks.map(value => String(value).trim()) } : {}) } };
};
