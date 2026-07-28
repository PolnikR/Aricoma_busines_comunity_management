import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'

export function useUnsavedChangesGuard(isDirty: boolean) {
  const allowNavigationRef = useRef(false)
  const pendingActionRef = useRef<(() => void) | null>(null)
  const [hasPendingAction, setHasPendingAction] = useState(false)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (
    isDirty
    && !allowNavigationRef.current
    && currentLocation.pathname !== nextLocation.pathname
  ))

  useEffect(() => {
    if (!isDirty) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => { window.removeEventListener('beforeunload', handleBeforeUnload) }
  }, [isDirty])

  const cancelNavigation = useCallback(() => {
    pendingActionRef.current = null
    setHasPendingAction(false)
    if (blocker.state === 'blocked') blocker.reset()
  }, [blocker])

  const confirmNavigation = useCallback(() => {
    const pendingAction = pendingActionRef.current
    pendingActionRef.current = null
    setHasPendingAction(false)
    if (pendingAction) {
      allowNavigationRef.current = true
      pendingAction()
      allowNavigationRef.current = false
      return
    }
    if (blocker.state === 'blocked') blocker.proceed()
  }, [blocker])

  const requestNavigation = useCallback((action: () => void) => {
    if (!isDirty) {
      action()
      return
    }
    pendingActionRef.current = action
    setHasPendingAction(true)
  }, [isDirty])

  const runWithoutBlocking = useCallback((action: () => void) => {
    allowNavigationRef.current = true
    action()
    allowNavigationRef.current = false
  }, [])

  return {
    isNavigationBlocked: hasPendingAction || blocker.state === 'blocked',
    cancelNavigation,
    confirmNavigation,
    requestNavigation,
    runWithoutBlocking,
  }
}
