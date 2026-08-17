export const credentialKeys = {
  all: ['credentials'] as const,
  list: () => [...credentialKeys.all, 'list'] as const,
}
