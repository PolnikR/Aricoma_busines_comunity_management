import { useCallback, useState } from 'react'

function readStoredBoolean(key: string, defaultValue: boolean) {
  try {
    const stored = localStorage.getItem(key)
    if (stored === 'true') return true
    if (stored === 'false') return false
  } catch {
    // Fall back to the default when storage is unavailable.
  }
  return defaultValue
}

// Only explicit changes are stored, so a later change of the default still reaches users who never chose.
export function useStoredBoolean(key: string, defaultValue: boolean) {
  const [value, setValue] = useState(() => readStoredBoolean(key, defaultValue))

  const update = useCallback((next: boolean) => {
    setValue(next)
    try {
      localStorage.setItem(key, String(next))
    } catch {
      // The in-memory preference still works when storage is unavailable.
    }
  }, [key])

  return [value, update] as const
}
