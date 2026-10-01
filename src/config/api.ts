// Public API address only. SMTP configuration belongs exclusively to the backend.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL?.trim() || (import.meta.env.DEV ? 'http://localhost:8000' : '')).replace(/\/+$/, '')
