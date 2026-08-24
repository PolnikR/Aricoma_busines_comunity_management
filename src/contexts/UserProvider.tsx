import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { setCurrentUser } from '@/shared/api/currentUser'
import { UserContext, type User } from './UserContext'

// No auth yet: a single hardcoded admin user. When auth lands, seed this from
// the authenticated session instead — nothing else in the app changes.
const DEFAULT_USER: User = { username: 'admin', role: 'admin' }

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User>(DEFAULT_USER)

  // Write through to the non-React bridge so apiFetch sees the current user.
  useEffect(() => {
    setCurrentUser(user)
  }, [user])

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  )
}
