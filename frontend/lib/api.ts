import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

/**
 * All requests go through the Next.js rewrite at /api/* → backend /api/*
 * Never use absolute URLs — that breaks Docker and causes CORS issues.
 *
 * FastAPI sends 308 redirects for trailing-slash URLs.
 * The interceptor below strips ALL trailing slashes before "?" or end-of-string.
 */
const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 120_000,
  maxRedirects: 5,
  withCredentials: false,
});

// ── Strip trailing slash (handles /path/ and /path/?query) ──────────────
function stripSlash(url: string): string {
  // Replace /? with ? and trailing / with nothing
  return url.replace(/\/\?/, "?").replace(/\/$/, "");
}

// ── Attach JWT access token + strip trailing slash ───────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.url) config.url = stripSlash(config.url);
  return config;
});

// ── Auto-refresh on 401 ───────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const rt = localStorage.getItem("refresh_token");
        if (rt) {
          const { data } = await axios.post("/api/auth/refresh", { refresh_token: rt });
          localStorage.setItem("access_token", data.access_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        }
      } catch {
        localStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
