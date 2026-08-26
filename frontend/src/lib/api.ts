/**
 * TRACE API client — thin fetch wrapper around the endpoints documented in
 * Notes.md (Modules 2–6). Every call shape (method, path, payload) follows
 * that document exactly; the real API wins over any mockup assumption.
 */

const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  method: string;
  body?: unknown;
  token?: string | null;
  isForm?: boolean;
}

/** FastAPI errors come back as `{"detail": "..."}` or `{"detail": [...]}`. */
function extractDetail(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : String(d)))
        .join("; ");
    }
    return String(detail);
  }
  return fallback;
}

async function request<T>(path: string, opts: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined && !opts.isForm) headers["Content-Type"] = "application/json";

  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    body = opts.isForm ? (opts.body as BodyInit) : JSON.stringify(opts.body);
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method,
    headers,
    body,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new ApiError(res.status, extractDetail(data, `${res.status} ${res.statusText}`));
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { method: "GET", token }),
  post: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: "POST", body, token }),
  patch: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: "PATCH", body, token }),
  delete: <T>(path: string, token?: string | null) => request<T>(path, { method: "DELETE", token }),
  postForm: <T>(path: string, form: FormData, token?: string | null) =>
    request<T>(path, { method: "POST", body: form, token, isForm: true }),
};

/** Convenience: 401/403 responses mean the session is invalid for this call. */
export function isAuthFailure(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403);
}
