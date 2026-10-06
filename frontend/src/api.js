import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS  = 300000;

// --- Auth ---
export async function registerUser(name, email, password) {
  const { data } = await axios.post(`${API_BASE}/api/auth/register`, { name, email, password });
  return data; // { token, user }
}

export async function loginUser(email, password) {
  const { data } = await axios.post(`${API_BASE}/api/auth/login`, { email, password });
  return data; // { token, user }
}

export async function fetchMe() {
  const { data } = await axios.get(`${API_BASE}/api/auth/me`);
  return data;
}

// --- Diagnosis ---
export async function diagnoseIssue(imageFile, description, onStatusChange) {
  const form = new FormData();
  form.append('image', imageFile);
  form.append('description', description);

  const { data: queued } = await axios.post(`${API_BASE}/api/diagnose`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  const { task_id } = queued;
  onStatusChange?.('queued');

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const { data: task } = await axios.get(`${API_BASE}/api/task/${task_id}`);
    if (task.status === 'processing') onStatusChange?.('processing');
    if (task.status === 'done') { onStatusChange?.('done'); return task; }
    if (task.status === 'error') throw new Error(task.error || 'Diagnosis failed.');
  }
  throw new Error('Diagnosis timed out. Please try again.');
}

// --- Chat ---
export async function sendChatMessage(sessionId, message) {
  const { data } = await axios.post(`${API_BASE}/api/chat`, { session_id: sessionId, message });
  return data;
}

// --- History ---
export async function fetchHistory() {
  const { data } = await axios.get(`${API_BASE}/api/history`);
  return data;
}

export async function deleteHistoryItem(id) {
  await axios.delete(`${API_BASE}/api/history/${id}`);
}
