export const recoveryApplicationsQueryKey = ['recovery-applications'] as const
export const recoveryApplicationInventoryQueryKey = (runId: string) => (
  [...recoveryApplicationsQueryKey, 'inventory', runId] as const
)
