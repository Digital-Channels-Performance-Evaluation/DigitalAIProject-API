import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

/**
 * All requests go through the Next.js rewrite at /api/* → backend /api/*
 * Never use absolute URLs — that breaks Docker and causes CORS issues.
 *
 * FastAPI sends 308 redirects for trailing-slash URLs.
 * The interceptor below strips ALL trailing slashes before "?" or end-of-string.
 * 
 * IMPORTANT: HTTPOnly cookies are now used for authentication.
 * withCredentials: true ensures cookies are sent with requests.
 */
const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  // 30s for normal requests; long-running ML endpoints get their own timeout via config override
  timeout: 30_000,
  maxRedirects: 5,
  withCredentials: true,  // REQUIRED for HTTPOnly cookies
});

// ── Strip trailing slash (handles /path/ and /path/?query) ──────────────
function stripSlash(url: string): string {
  return url.replace(/\/\?/, "?").replace(/\/$/, "");
}

// ── Strip trailing slash only ───────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
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
        // Call refresh endpoint - it will use HTTPOnly refresh_token cookie
        await axios.post("/api/auth/refresh", {}, { withCredentials: true });
        // Retry original request - new access_token cookie is now set
        return api(original);
      } catch {
        // Refresh failed - redirect to login
        if (typeof window !== "undefined") {
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

/** For ML training / report generation endpoints that can legitimately take longer */
export const apiLong = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 120_000,
  withCredentials: true,  // REQUIRED for HTTPOnly cookies
});
apiLong.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.url) config.url = stripSlash(config.url);
  return config;
});

export default api;
