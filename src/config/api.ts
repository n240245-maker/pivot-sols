// Public API address only. SMTP configuration belongs exclusively to the backend.
// Hosted requests use the same-origin Vercel /api proxy so the HttpOnly cookie
// belongs to the frontend site. Development can call the local backend directly.
export const API_BASE_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:8000').replace(/\/+$/, '')
  : ''
