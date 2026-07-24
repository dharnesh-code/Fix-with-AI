import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export async function diagnoseIssue(imageFile, description) {
  const form = new FormData();
  form.append("image", imageFile);
  form.append("description", description);

  const { data } = await axios.post(`${API_BASE}/api/diagnose`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function sendChatMessage(sessionId, message) {
  const { data } = await axios.post(`${API_BASE}/api/chat`, {
    session_id: sessionId,
    message,
  });
  return data;
}
