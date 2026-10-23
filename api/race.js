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

async function main() {
  console.log('Preparing users (this takes a few seconds)...');
  const owner = await tokenFor(0);
  const racers = [];
  for (let i = 1; i <= 8; i++) racers.push(await tokenFor(i));

  const created = await post(
    '/requests',
    { title: 'Race test', pickup: 'Library', dropoff: 'Hostel B', reward: 10 },
    owner,
  );
  const id = created.body.id;
  console.log('Request created:', id);

  console.log('Firing 8 accepts at the same moment...');
  const results = await Promise.all(
    racers.map((t) => post(`/requests/${id}/accept`, {}, t)),
  );

  results.forEach((r, i) =>
    console.log(`Racer ${i + 1}: ${r.status} ${r.body?.message ?? r.body?.status ?? ''}`),
  );
  const wins = results.filter((r) => r.status === 201).length;
  const losses = results.filter((r) => r.status === 409).length;
  console.log(`\nWinners: ${wins}   Rejected: ${losses}`);
  console.log(wins === 1 ? 'PASS: exactly one winner' : 'FAIL: expected exactly one winner');
}

main();