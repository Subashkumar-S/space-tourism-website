// Native dev talks to the server on :5000; the Docker build bakes REACT_APP_API_BASE_URL=/api
// (nginx reverse-proxies to the server). Always send the session cookie.
const BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

export async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && body.error) message = body.error;
    } catch (_) {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return null; // e.g. logout
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export { BASE_URL };
