import { createContext, useContext } from 'react'

export interface User {
  username: string
  role: string
}

export interface UserContextValue {
  user: User
  setUser: (user: User) => void
}

export const UserContext = createContext<UserContextValue | undefined>(undefined)

export function useUserContext() {
  const context = useContext(UserContext)

  if (context === undefined) {
    throw new Error('useUserContext must be used within UserProvider')
  }

  return context
}
