export const snapshotPolicyKeys = {
  all: ['snapshot-policies'] as const,
  list: () => [...snapshotPolicyKeys.all, 'list'] as const,
}
