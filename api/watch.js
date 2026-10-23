const { io } = require('socket.io-client');
const base = 'http://localhost:3000';

async function post(path, body, token) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
}

async function tokenFor(n) {
  const email = `race${n}@gmail.com`;
  const password = 'Test12345';
  let r = await post('/auth/login', { email, password });
  if (r.status !== 201) {
    r = await post('/auth/signup', { email, password, name: `Racer ${n}` });
  }
  return r.body.accessToken;
}

function watcher(name, token) {
  return new Promise((resolve) => {
    const heard = { created: false, taken: false };
    const socket = io(base, { auth: { token } });
    socket.on('connect', () => {
      console.log(`${name} connected`);
      resolve({ socket, heard });
    });
    socket.on('request:created', (r) => {
      heard.created = true;
      console.log(`${name} heard: new request "${r.title}"`);
    });
    socket.on('request:taken', (r) => {
      heard.taken = true;
      console.log(`${name} heard: request taken by ${r.helper?.name}`);
    });
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const owner = await tokenFor(0);
  const helper = await tokenFor(3);
  const a = await watcher('Watcher A', await tokenFor(1));
  const b = await watcher('Watcher B', await tokenFor(2));

  console.log('\nCreating a request...');
  const created = await post(
    '/requests',
    { title: 'Realtime test', pickup: 'Library', dropoff: 'Hostel B', reward: 10 },
    owner,
  );
  await wait(1000);

  console.log('\nHelper accepts it...');
  await post(`/requests/${created.body.id}/accept`, {}, helper);
  await wait(1000);

  const ok =
    a.heard.created && a.heard.taken && b.heard.created && b.heard.taken;
  console.log(ok ? '\nPASS: both watchers got both updates' : '\nFAIL: some updates were missed');

  a.socket.close();
  b.socket.close();
  process.exit(0);
}

main();