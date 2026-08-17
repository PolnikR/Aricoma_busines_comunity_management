export const policySetKeys = {
  all: ['policy-sets'] as const,
  list: () => [...policySetKeys.all, 'list'] as const,
}
