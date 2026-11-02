import { useQueryClient } from '@tanstack/react-query'
import { useRollbackAppFromOrchestrator, type RollbackAppFromOrchestratorMutationVariables } from '@/generated/query/recovery-apps/recovery-apps.gen'
import { RollbackReport as RollbackReportSchema, type RecoveryAppsResponseOutput } from '@/generated/query/zod'
import { keepUnlistedFields } from '@/shared/api/validatingMutator'
import type { RecoveryApplicationListItem, RollbackReport } from '../model/recoveryApplicationTypes'
import { reconcileRecoveryApplications } from './recoveryApplicationCache'

function object(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : undefined
}

export function applicationHttpStatus(error: unknown): number | null {
  const seen = new Set<unknown>()
  while (!seen.has(error)) {
    const value = object(error)
    if (!value) break
    seen.add(error)
    if (typeof value['status'] === 'number') return value['status']
    error = value['cause']
  }
  return null
}

export function extractApplicationRollbackReport(error: unknown): RollbackReport | null {
  const seen = new Set<unknown>()
  while (!seen.has(error)) {
    const value = object(error)
    if (!value) break
    seen.add(error)
    const received = object(object(value['body'])?.['detail'])?.['rollback']
    const report = RollbackReportSchema.safeParse(received)
    if (report.success) return keepUnlistedFields(received, report.data) as RollbackReport
    error = value['cause']
  }
  return null
}

type RollbackVariables = RollbackAppFromOrchestratorMutationVariables & { application: RecoveryApplicationListItem }

export function useRollbackRecoveryApplication() {
  const queryClient = useQueryClient()
  const mutation = useRollbackAppFromOrchestrator({ mutation: {
    retry: false,
    onSuccess: async (response, variables) => {
      await reconcileRecoveryApplications(queryClient, response as RecoveryAppsResponseOutput, [(variables as RollbackVariables).application])
    },
    onError: async (_error, variables) => {
      await reconcileRecoveryApplications(queryClient, undefined, [(variables as RollbackVariables).application])
    },
  } })
  return {
    mutateAsync: async (application: RecoveryApplicationListItem): Promise<{ report: RollbackReport | null }> => {
      const variables: RollbackVariables = { params: { recovery_app_id: application.id }, application }
      const response = await mutation.mutateAsync(variables) as RecoveryAppsResponseOutput
      return { report: response.rollback ?? null }
    },
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  }
}
