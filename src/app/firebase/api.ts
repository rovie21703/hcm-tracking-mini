// Express backend integration.
//
// When VITE_API_BASE is set (e.g. http://localhost:4000), all punch operations
// and reports are routed through the Node.js + Express server in /server.
// When it is empty, the frontend talks to Firestore directly via the Web SDK
// (used in the Figma Make preview, which can't host a Node server).

export const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || "";
export const useServer = !!API_BASE;

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  get: (path: string) => fetch(`${API_BASE}${path}`).then(handle),
  post: (path: string, body: unknown) =>
    fetch(`${API_BASE}${path}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }).then(handle),
  put: (path: string, body: unknown) =>
    fetch(`${API_BASE}${path}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }).then(handle),
  del: (path: string) =>
    fetch(`${API_BASE}${path}`, { method: "DELETE" }).then(handle),
};
