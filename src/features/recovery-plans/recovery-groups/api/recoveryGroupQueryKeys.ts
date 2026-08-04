export const recoveryGroupKeys = {
  all: ['recovery-groups'] as const,
  list: () => [...recoveryGroupKeys.all, 'list'] as const,
}
