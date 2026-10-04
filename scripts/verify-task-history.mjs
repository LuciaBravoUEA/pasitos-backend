import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const base = 'http://localhost:3001/api';
const prefix = 'verify017_' + randomUUID().slice(0, 8);
const accounts = [];
let testRoutineId;
const request = async (path, token, method = 'GET', body, status = 200) => {
  const response = await fetch(base + path, {
    method,
    headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(60000),
  });
  assert.equal(response.status, status, method + ' ' + path);
  return response.status === 204 ? null : response.json();
};
const db = code => JSON.parse(execFileSync('docker', [
  'exec',
  'pasitos-backend',
  'node',
  '-e',
  'const {PrismaClient}=require("@prisma/client");const p=new PrismaClient();(async()=>{try{const result=await (async()=>{' + code + '})();console.log(JSON.stringify(result));}finally{await p.$disconnect();}})().catch(()=>process.exit(1));',
], { encoding: 'utf8' }).trim());

try {
  for (let index = 0; index < 3; index += 1) {
    const username = prefix + '_' + index;
    const password = randomUUID() + '!aA1';
    const registered = await request('/auth/mobile/register', null, 'POST', { name: 'Verificación temporal', username, email: username + '@example.test', password }, 201);
    const token = registered.data.sessionToken;
    const session = await request('/auth/session', token);
    accounts.push({ id: session.data.id, token });
  }

  const [student, adult, unrelated] = accounts;
  db('await p.user.update({where:{id:' + JSON.stringify(adult.id) + '},data:{role_code:"docente",role_name:"Docente"}}); await p.studentTeacher.create({data:{studentId:' + JSON.stringify(student.id) + ',teacherId:' + JSON.stringify(adult.id) + '}}); return true;');

  const date = new Date().toISOString().slice(0, 10);
  const routine = (await request('/rutinas', student.token, 'POST', { title: 'Rutina de verificación histórica', category: 'HOGAR', points: 1, tasks: ['Actividad de prueba'] }, 201)).data;
  testRoutineId = routine.id;
  const task = (await request('/rutinas/' + routine.id, student.token)).data.tasks[0];

  await request('/tareas/' + task.id + '/completar', student.token, 'POST', { completed: true, date });
  await Promise.all([
    request('/tareas/' + task.id + '/completar', student.token, 'POST', { completed: true, date }),
    request('/tareas/' + task.id + '/completar', student.token, 'POST', { completed: true, date }),
  ]);
  await request('/tareas/' + task.id + '/completar', student.token, 'POST', { completed: false, date });
  await request('/tareas/' + task.id + '/completar', student.token, 'POST', { completed: true, date });

  await request('/estudiantes/' + student.id + '/historial', null, 'GET', undefined, 401);
  await request('/estudiantes/' + student.id + '/historial', unrelated.token, 'GET', undefined, 403);
  await request('/estudiantes/' + student.id + '/historial?page=0', student.token, 'GET', undefined, 422);
  await request('/estudiantes/' + student.id + '/historial?pageSize=101', student.token, 'GET', undefined, 422);
  await request('/estudiantes/' + student.id + '/historial?dateFrom=2026-02-31', student.token, 'GET', undefined, 422);
  await request('/estudiantes/no-es-un-uuid/historial', student.token, 'GET', undefined, 422);
  const laterDate = new Date(date + 'T00:00:00.000Z');
  laterDate.setUTCDate(laterDate.getUTCDate() + 1);
  await request('/estudiantes/' + student.id + '/historial?dateFrom=' + laterDate.toISOString().slice(0, 10) + '&dateTo=' + date, student.token, 'GET', undefined, 422);

  const firstPage = await request('/estudiantes/' + student.id + '/historial?page=1&pageSize=2', student.token);
  assert.equal(firstPage.meta.total, 3);
  assert.equal(firstPage.meta.totalPages, 2);
  assert.equal(firstPage.data.length, 2);
  assert.equal(firstPage.data[0].completed, true);
  assert.equal(firstPage.data[0].taskTitle, 'Actividad de prueba');
  const secondPage = await request('/estudiantes/' + student.id + '/historial?page=2&pageSize=2', adult.token);
  assert.equal(secondPage.data.length, 1);
  assert.equal(firstPage.data[0].studentId, student.id);
  const progress = await request('/estudiantes/' + student.id + '/progreso?date=' + date, student.token);
  assert.equal(progress.data.totals.completed, 1);
  const filtered = await request('/estudiantes/' + student.id + '/historial?dateFrom=' + date + '&dateTo=' + date, student.token);
  assert.equal(filtered.meta.total, 3);
  await request('/acompanantes/' + adult.id, student.token, 'DELETE', undefined, 204);
  await request('/estudiantes/' + student.id + '/historial', adult.token, 'GET', undefined, 403);

  await request('/rutinas/' + routine.id, student.token, 'PUT', { title: 'Rutina editada después del evento', category: 'HOGAR', points: 1 });
  await request('/rutinas/' + routine.id, student.token, 'DELETE', undefined, 204);
  const retained = await request('/estudiantes/' + student.id + '/historial', student.token);
  assert.equal(retained.meta.total, 3);
  assert.equal(retained.data[0].routineTitle, 'Rutina de verificación histórica');
  const saved = db('return {events:await p.taskActivityEvent.count({where:{studentId:' + JSON.stringify(student.id) + '}}), completions:await p.taskCompletion.count({where:{studentId:' + JSON.stringify(student.id) + '}})};');
  assert.equal(saved.events, 3);
  assert.equal(saved.completions, 0);
  console.log('OK: persistencia, idempotencia concurrente, paginación, filtros, permisos/desvinculación y snapshots tras editar/eliminar rutina.');
} finally {
  try {
    if (testRoutineId) db('return await p.routine.deleteMany({where:{id:' + JSON.stringify(testRoutineId) + '}});');
  } finally {
    db('return await p.user.deleteMany({where:{username:{startsWith:' + JSON.stringify(prefix + '_') + '}}});');
    console.log('Rutina y cuentas temporales eliminadas; registros existentes conservados.');
  }
}
