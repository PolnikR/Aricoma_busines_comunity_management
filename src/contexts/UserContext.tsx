import type { ReactNode } from 'react'
import { createContext, useContext, useState, useEffect } from 'react'
import { setCurrentUser } from '@/shared/api/currentUser'

export interface User {
  username: string
  role: string
}

interface UserContextType {
  user: User
  setUser: (user: User) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

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

// eslint-disable-next-line react-refresh/only-export-components
export function useUserContext() {
  const context = useContext(UserContext)

  if (context === undefined) {
    throw new Error('useUserContext must be used within UserProvider')
  }

  return context
}
