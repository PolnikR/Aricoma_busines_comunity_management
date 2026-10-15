import { Navigate, useLocation } from 'react-router'

// Preserve query parameters and hashes in bookmarks when a legacy URL redirects.
export function RedirectPreservingSearch({ to }: { to: string }) {
  const { search, hash } = useLocation()
  return <Navigate to={{ pathname: to, search, hash }} replace />
}
