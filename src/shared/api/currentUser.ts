// Non-React bridge: holds the current user so the plain API layer (apiFetch)
// can read it without a React hook. UserContext writes through to it; the
// context remains the single source of truth. Safe only in a browser-only
// SPA (one user per runtime) — NOT SSR-safe.
export interface CurrentUser {
  username: string
  role: string
}

const DEFAULT_USER: CurrentUser = { username: 'admin', role: 'admin' }

let currentUser: CurrentUser = DEFAULT_USER

export function getCurrentUser(): CurrentUser {
  return currentUser
}

export function setCurrentUser(user: CurrentUser): void {
  currentUser = user
}

export function resetCurrentUser(): void {
  currentUser = DEFAULT_USER
}
