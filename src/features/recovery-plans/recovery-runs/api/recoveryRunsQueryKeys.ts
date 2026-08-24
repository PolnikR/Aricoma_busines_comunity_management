export const recoveryRunsKeys = {
  all: ['recovery-runs'] as const,
  latest: (providerId: string | null, dagId: string) => (
    [...recoveryRunsKeys.all, 'latest', providerId ?? null, dagId] as const
  ),
  history: (providerId: string | null, dagId: string, page: number, pageSize: number) => (
    [...recoveryRunsKeys.all, 'history', providerId ?? null, dagId, page, pageSize] as const
  ),
}
