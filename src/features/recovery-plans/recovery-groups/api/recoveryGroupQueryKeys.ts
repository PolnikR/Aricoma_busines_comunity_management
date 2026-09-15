export const recoveryGroupKeys = {
  all: ['recovery-groups'] as const,
  list: () => [...recoveryGroupKeys.all, 'list'] as const,
  inventory: (runId: string) => [...recoveryGroupKeys.all, 'inventory', runId] as const,
}
