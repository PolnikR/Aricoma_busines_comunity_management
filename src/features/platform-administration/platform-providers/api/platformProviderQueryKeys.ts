export const platformProviderKeys = {
  all: ['platform-providers'] as const,
  list: () => [...platformProviderKeys.all, 'list'] as const,
}
