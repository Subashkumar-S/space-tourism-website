// Native dev talks to the server on :5000; the Docker build bakes REACT_APP_API_BASE_URL=/api
// (nginx reverse-proxies to the server). Always send the session cookie.
const BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return null; // e.g. logout
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const apiGet = (path) => request("GET", path);
export const apiPost = (path, body) => request("POST", path, body);
export const apiPatch = (path, body) => request("PATCH", path, body);
export const apiDelete = (path) => request("DELETE", path);

export { BASE_URL };
