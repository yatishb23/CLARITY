/**
 * Single source of truth for the backend base URL.
 * Set BACKEND_URL in .env.local (server-side only — never exposed to the browser).
 */
export const BACKEND_URL =
  process.env.BACKEND_URL ??
  "https://exquisite-maternity-graceless.ngrok-free.dev";
