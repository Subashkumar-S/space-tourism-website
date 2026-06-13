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

export { BASE_URL };
