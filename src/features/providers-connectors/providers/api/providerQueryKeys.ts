export const providerKeys = {
  all: ['providers'] as const,
  list: () => [...providerKeys.all, 'list'] as const,
}
