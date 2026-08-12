export const recoveryAppPolicyKeys = {
  all: ['recovery-app-policies'] as const,
  list: () => [...recoveryAppPolicyKeys.all, 'list'] as const,
}
