'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { io } from 'socket.io-client';

const API = 'http://localhost:3000';

type Person = { id: string; name: string };
type OpenRequest = {
  id: string;
  title: string;
  pickup: string;
  dropoff: string;
  reward: number;
  requester: Person;
};
type MyTask = OpenRequest & {
  status: string;
  role: 'requester' | 'helper';
  helper: Person | null;
};

function errorText(data: any, fallback: string) {
  if (Array.isArray(data?.message)) return data.message.join(', ');
  return data?.message ?? fallback;
}

// Reads the user id out of the login token (no secrets involved).
function userIdFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part)).sub ?? null;
  } catch {
    return null;
  }
}

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Waiting for a helper',
  ACCEPTED: 'Accepted',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function Home() {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState<OpenRequest[]>([]);
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [entered, setEntered] = useState<Record<string, string>>({});

  // Fields of the "new request" form
  const [title, setTitle] = useState('');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [reward, setReward] = useState('');

  const me = userIdFromToken(token);

  // On first load, check whether we are already logged in.
  useEffect(() => {
    try {
      setToken(localStorage.getItem('token'));
    } catch {}
    setReady(true);
  }, []);

  // Whenever we have a token, load both lists.
  useEffect(() => {
    if (token) {
      loadRequests(token);
      loadMine(token);
    }
  }, [token]);

  // Live updates: listen for news from the server while logged in.
  useEffect(() => {
    if (!token) return;
    const socket = io(API, { auth: { token } });

    socket.on('request:created', (r: OpenRequest) => {
      setRequests((list) =>
        list.some((x) => x.id === r.id) ? list : [r, ...list],
      );
      loadMine(token);
    });
    socket.on('request:taken', (data: { id: string }) => {
      setRequests((list) => list.filter((x) => x.id !== data.id));
      loadMine(token);
    });
    socket.on('request:cancelled', (data: { id: string }) => {
      setRequests((list) => list.filter((x) => x.id !== data.id));
      loadMine(token);
    });

    return () => {
      socket.close();
    };
  }, [token]);

  async function loadRequests(t: string) {
    try {
      const res = await fetch(`${API}/requests`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.status === 401) {
        logout();
        return;
      }
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        setMessage('Could not load requests. Please refresh the page.');
        return;
      }
      setRequests(data);
    } catch {
      setMessage('Cannot reach the server. Is the backend running?');
    }
  }

  async function loadMine(t: string) {
    try {
      const res = await fetch(`${API}/requests/mine`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setTasks(data);
    } catch {}
  }

  async function login(e: FormEvent) {
    e.preventDefault();
    setMessage('Logging in...');
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(errorText(data, 'Login failed'));
        return;
      }
      try {
        localStorage.setItem('token', data.accessToken);
      } catch {}
      setToken(data.accessToken);
      setMessage('');
    } catch {
      setMessage('Cannot reach the server. Is the backend running?');
    }
  }

  async function createRequest(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setMessage('');
    try {
      const res = await fetch(`${API}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          pickup,
          dropoff,
          reward: Number(reward),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(errorText(data, 'Could not post the request'));
        return;
      }
      setMessage(`Posted "${data.title}"`);
      setTitle('');
      setPickup('');
      setDropoff('');
      setReward('');
      setRequests((list) =>
        list.some((x) => x.id === data.id) ? list : [data, ...list],
      );
      loadMine(token);
    } catch {
      setMessage('Cannot reach the server. Is the backend running?');
    }
  }

  // Used for: accept, start, cancel, release
  async function act(action: string, id: string, okText: string) {
    if (!token) return;
    setMessage('');
    try {
      const res = await fetch(`${API}/requests/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(okText);
      } else {
        setMessage(errorText(data, 'That did not work'));
      }
    } catch {
      setMessage('Cannot reach the server. Is the backend running?');
    }
    loadRequests(token);
    loadMine(token);
  }

  async function showCode(id: string) {
    if (!token) return;
    try {
      const res = await fetch(`${API}/requests/${id}/handover-code`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setCodes((c) => ({ ...c, [id]: data.handoverCode }));
      } else {
        setMessage(errorText(data, 'Could not get the code'));
      }
    } catch {
      setMessage('Cannot reach the server. Is the backend running?');
    }
  }

  async function complete(id: string) {
    if (!token) return;
    setMessage('');
    try {
      const res = await fetch(`${API}/requests/${id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: entered[id] ?? '' }),
      });
      const data = await res.json();
      setMessage(res.ok ? 'Task completed!' : errorText(data, 'Could not complete'));
    } catch {
      setMessage('Cannot reach the server. Is the backend running?');
    }
    loadMine(token);
  }

  function logout() {
    try {
      localStorage.removeItem('token');
    } catch {}
    setToken(null);
    setRequests([]);
    setTasks([]);
    setCodes({});
    setEntered({});
    setMessage('');
  }

  const page = {
    maxWidth: 480,
    margin: '60px auto',
    padding: 16,
    fontFamily: 'sans-serif',
  } as const;
  const card = {
    border: '1px solid #666',
    borderRadius: 8,
    padding: 12,
  } as const;
  const btn = { padding: 8, marginTop: 8, marginRight: 8 } as const;

  if (!ready) return null;

  if (!token) {
    return (
      <main style={page}>
        <h1>CampusAid</h1>
        <p>Log in with your college email</p>
        <form
          onSubmit={login}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: 10, fontSize: 16 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: 10, fontSize: 16 }}
          />
          <button type="submit" style={{ padding: 10, fontSize: 16 }}>
            Log in
          </button>
        </form>
        <p>{message}</p>
      </main>
    );
  }

  // Finished tasks go to the bottom of "My tasks".
  const activeTasks = tasks.filter(
    (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED',
  );
  const doneTasks = tasks.filter(
    (t) => t.status === 'COMPLETED' || t.status === 'CANCELLED',
  );

  function renderTask(t: MyTask) {
    return (
      <div key={t.id} style={card}>
        <strong>{t.title}</strong>
        <div>
          {t.pickup} → {t.dropoff} · ₹{t.reward}
        </div>
        <div>
          {STATUS_LABEL[t.status] ?? t.status} ·{' '}
          {t.role === 'requester'
            ? t.helper
              ? `helper: ${t.helper.name}`
              : 'you asked'
            : `you are helping ${t.requester.name}`}
        </div>

        {t.role === 'requester' && t.status === 'REQUESTED' && (
          <button
            style={btn}
            onClick={() => act('cancel', t.id, 'Request cancelled')}
          >
            Cancel
          </button>
        )}

        {t.role === 'requester' &&
          (t.status === 'ACCEPTED' || t.status === 'IN_PROGRESS') && (
            <div>
              {codes[t.id] ? (
                <p>
                  Handover code: <strong>{codes[t.id]}</strong>
                  <br />
                  Give it to the helper only when you get your item.
                </p>
              ) : (
                <button style={btn} onClick={() => showCode(t.id)}>
                  Show handover code
                </button>
              )}
            </div>
          )}

        {t.role === 'helper' && t.status === 'ACCEPTED' && (
          <div>
            <button
              style={btn}
              onClick={() => act('start', t.id, 'Task started')}
            >
              Start
            </button>
            <button
              style={btn}
              onClick={() => act('release', t.id, 'You backed out')}
            >
              Back out
            </button>
          </div>
        )}

        {t.role === 'helper' && t.status === 'IN_PROGRESS' && (
          <div style={{ marginTop: 8 }}>
            <input
              placeholder="6-digit code from the requester"
              value={entered[t.id] ?? ''}
              onChange={(e) =>
                setEntered((m) => ({ ...m, [t.id]: e.target.value }))
              }
              maxLength={6}
              style={{ padding: 8, fontSize: 16, width: '70%' }}
            />
            <button style={btn} onClick={() => complete(t.id)}>
              Complete
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <main style={page}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1>CampusAid</h1>
        <button onClick={logout} style={{ padding: 8 }}>
          Log out
        </button>
      </div>

      {message && (
        <p style={{ border: '1px solid #888', padding: 8, borderRadius: 6 }}>
          {message}
        </p>
      )}

      <h2>My tasks</h2>
      {activeTasks.length === 0 && <p>Nothing in progress.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {activeTasks.map(renderTask)}
      </div>

      <h2>Ask for help</h2>
      <form
        onSubmit={createRequest}
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <input
          placeholder="What do you need? (e.g. Bring my notebook)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
          style={{ padding: 10, fontSize: 16 }}
        />
        <input
          placeholder="Pick up from (e.g. Library)"
          value={pickup}
          onChange={(e) => setPickup(e.target.value)}
          required
          minLength={2}
          style={{ padding: 10, fontSize: 16 }}
        />
        <input
          placeholder="Bring to (e.g. Hostel B)"
          value={dropoff}
          onChange={(e) => setDropoff(e.target.value)}
          required
          minLength={2}
          style={{ padding: 10, fontSize: 16 }}
        />
        <input
          type="number"
          placeholder="Reward in ₹ (0 to 5000)"
          value={reward}
          onChange={(e) => setReward(e.target.value)}
          required
          min={0}
          max={5000}
          step={1}
          style={{ padding: 10, fontSize: 16 }}
        />
        <button type="submit" style={{ padding: 10, fontSize: 16 }}>
          Post request
        </button>
      </form>

      <h2>Open requests</h2>
      {requests.length === 0 && <p>No open requests right now.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {requests.map((r) => (
          <div key={r.id} style={card}>
            <strong>{r.title}</strong>
            <div>
              {r.pickup} → {r.dropoff}
            </div>
            <div>
              ₹{r.reward} · asked by {r.requester.name}
            </div>
            {r.requester.id !== me && (
              <button
                onClick={() => act('accept', r.id, `You accepted "${r.title}"`)}
                style={btn}
              >
                Accept
              </button>
            )}
          </div>
        ))}
      </div>

      {doneTasks.length > 0 && (
        <>
          <h2>Finished</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {doneTasks.map(renderTask)}
          </div>
        </>
      )}
    </main>
  );
}