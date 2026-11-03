import { useEffect, useRef, useState } from 'react'
import { getPolicySets } from '@/generated/query/policy-sets/policy-sets.gen'
import { getRecoveryGroups } from '@/generated/query/recovery-groups/recovery-groups.gen'
import { getRecoveryApps } from '@/generated/query/recovery-apps/recovery-apps.gen'
import type { PolicyKind } from '../../recovery-policies/catalog/model/policyCatalog'
import { findPolicyConsumers, findPolicySetConsumers, type ReferenceConsumer } from '../model/policyReferences'

export interface ReferenceDeleteTarget { kind: PolicyKind | 'policySet'; id: string }
export type ReferenceSource = 'policySets' | 'groups' | 'applications'
export type ReferenceDeleteIssue =
  | { type: 'inUse'; consumers: { policySets: ReferenceConsumer[]; groups: ReferenceConsumer[]; applications: ReferenceConsumer[] } }
  | { type: 'checkFailed'; failures: { source: ReferenceSource; error: unknown }[] }
type DeleteResult = 'deleted' | 'blocked' | 'checkFailed' | 'deleteFailed' | 'ignored'

export function useReferenceProtectedDelete() {
  const [phase, setPhase] = useState<'idle' | 'checking' | 'deleting'>('idle')
  const [issue, setIssue] = useState<ReferenceDeleteIssue | null>(null)
  const active = useRef<AbortController | null>(null)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      active.current?.abort()
    }
  }, [])

  const execute = async (target: ReferenceDeleteTarget, deleteAction: () => Promise<unknown>): Promise<DeleteResult> => {
    if (active.current || !mounted.current) return 'ignored'
    const controller = new AbortController()
    active.current = controller
    const { kind, id } = target
    const isCurrent = () => mounted.current && !controller.signal.aborted && active.current === controller
    setIssue(null)
    setPhase('checking')
    try {
      const options: RequestInit = { cache: 'no-store', signal: controller.signal }
      if (kind === 'policySet') {
        const [groups, applications] = await Promise.allSettled([getRecoveryGroups(options), getRecoveryApps(options)])
        if (!isCurrent()) return 'ignored'
        const failures: { source: ReferenceSource; error: unknown }[] = []
        if (groups.status === 'rejected') failures.push({ source: 'groups', error: groups.reason })
        if (applications.status === 'rejected') failures.push({ source: 'applications', error: applications.reason })
        if (groups.status !== 'fulfilled' || applications.status !== 'fulfilled') {
          setIssue({ type: 'checkFailed', failures })
          return 'checkFailed'
        }
        const consumers = findPolicySetConsumers(id, groups.value.recovery_groups, applications.value.applications)
        if (consumers.groups.length || consumers.applications.length) {
          setIssue({ type: 'inUse', consumers: { policySets: [], ...consumers } })
          return 'blocked'
        }
      } else {
        try {
          const response = await getPolicySets(options)
          if (!isCurrent()) return 'ignored'
          const policySets = findPolicyConsumers(kind, id, response.policy_sets)
          if (policySets.length) {
            setIssue({ type: 'inUse', consumers: { policySets, groups: [], applications: [] } })
            return 'blocked'
          }
        } catch (error) {
          if (!isCurrent()) return 'ignored'
          setIssue({ type: 'checkFailed', failures: [{ source: 'policySets', error }] })
          return 'checkFailed'
        }
      }
      if (!isCurrent()) return 'ignored'
      setPhase('deleting')
      try {
        await deleteAction()
        return 'deleted'
      } catch {
        // The existing mutation owns its DELETE error and callbacks.
        return 'deleteFailed'
      }
    } finally {
      if (active.current === controller) {
        const canUpdate = isCurrent()
        active.current = null
        if (canUpdate) setPhase('idle')
      }
    }
  }

  const reset = () => { if (!active.current) setIssue(null) }
  return { execute, phase, isPending: phase !== 'idle', issue, reset }
}
