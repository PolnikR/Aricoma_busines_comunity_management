import { afterEach, describe, expect, it } from 'vitest'
import { getCurrentUser, resetCurrentUser, setCurrentUser } from './currentUser'

afterEach(() => {
  resetCurrentUser()
})

describe('currentUser', () => {
  it('returns the default administrator', () => {
    expect(getCurrentUser()).toEqual({ username: 'admin', role: 'admin' })
  })

  it('exposes the current user after it changes', () => {
    setCurrentUser({ username: 'operator', role: 'operator' })

    expect(getCurrentUser()).toEqual({ username: 'operator', role: 'operator' })
  })

  it('restores the default administrator', () => {
    setCurrentUser({ username: 'operator', role: 'operator' })

    resetCurrentUser()

    expect(getCurrentUser()).toEqual({ username: 'admin', role: 'admin' })
  })
})
