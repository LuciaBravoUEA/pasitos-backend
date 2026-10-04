const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomBytes, createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const statePath = '/tmp/pasitos-auth-persistence-test.json';
const prisma = new PrismaClient();
const request = async (path, { token, body, method = 'GET' } = {}) => fetch('http://localhost:3000/api/auth/' + path, {
  method,
  headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
const status = async (response, expected, label) => {
  assert.equal(response.status, expected, label);
  console.log('PASS ' + label);
  return response;
};
const main = async () => {
  if (process.argv[2] === 'before') {
    assert.equal(fs.existsSync(statePath), false, 'No previous test left behind');
    const username = 'auth-check-' + randomBytes(8).toString('hex');
    const password = randomBytes(24).toString('hex');
    const registration = await status(await request('mobile/register', {
      method: 'POST', body: { name: 'Temporary authentication check', username, email: username + '@example.invalid', password },
    }), 201, 'register own temporary account');
    const { data } = await registration.json();
    const state = { username, password, token: data.sessionToken };
    fs.writeFileSync(statePath, JSON.stringify(state), { mode: 0o600 });
    await status(await request('session', { token: state.token }), 200, 'session before restart');
    await status(await request('mobile/login', { method: 'POST', body: { username, password: 'invalid' } }), 401, 'wrong password');
    await status(await request('mobile/login', { method: 'POST', body: { username: {}, password: [] } }), 400, 'invalid input types');
    const login = await status(await request('mobile/login', { method: 'POST', body: { username, password } }), 200, 'login own temporary account');
    state.token = (await login.json()).data.sessionToken;
    fs.writeFileSync(statePath, JSON.stringify(state), { mode: 0o600 });
    const stored = await prisma.userSession.findUnique({ where: { session_token: createHash('sha256').update(state.token).digest('hex') } });
    assert.ok(stored, 'Only token hash is persisted');
    console.log('PASS token hash persisted');
    return;
  }
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  try {
    await status(await request('session', { token: state.token }), 200, 'same session after backend restart');
    await status(await request('refresh', { method: 'POST', token: state.token }), 204, 'refresh');
    await status(await request('session', { token: state.token }), 200, 'same token after refresh');
    await status(await request('logout', { method: 'POST', token: state.token }), 204, 'logout');
    await status(await request('session', { token: state.token }), 401, 'revoked session');
    await status(await request('refresh', { method: 'POST', token: state.token }), 401, 'revoked session cannot refresh');
    const login = await status(await request('mobile/login', { method: 'POST', body: { username: state.username, password: state.password } }), 200, 'same account and password after restart');
    const token = (await login.json()).data.sessionToken;
    await prisma.userSession.update({ where: { session_token: createHash('sha256').update(token).digest('hex') }, data: { expires_at: new Date(0) } });
    await status(await request('session', { token }), 401, 'expired session');
    await status(await request('refresh', { method: 'POST', token }), 401, 'expired session cannot refresh');
    await status(await request('session', { token: randomBytes(32).toString('hex') }), 401, 'forged token');
  } finally {
    await prisma.user.delete({ where: { username: state.username } });
    fs.unlinkSync(statePath);
    console.log('Temporary account and sessions removed');
  }
};
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
