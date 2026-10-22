import { useRef, useState } from 'react'

export type PostDeletePhase = 'idle' | 'refreshing' | 'error'
type RefreshList = () => Promise<{ isError: boolean }>

export function usePostDeleteRefresh(refreshList: RefreshList) {
  const [phase, setPhase] = useState<PostDeletePhase>('idle')
  const active = useRef<Promise<void> | null>(null)

  const afterDelete = (): Promise<void> => {
    if (active.current) return active.current
    setPhase('refreshing')
    const run = async () => {
      try {
        const result = await refreshList()
        setPhase(result.isError ? 'error' : 'idle')
      } catch {
        setPhase('error')
      } finally {
        active.current = null
      }
    }
    active.current = run()
    return active.current
  }

  const refresh = async () => {
    if (active.current || phase === 'error') await afterDelete()
    else await refreshList()
  }

  return { phase, afterDelete, refresh }
}
