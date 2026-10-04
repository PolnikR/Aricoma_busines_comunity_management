export const historyParams = (providerId?: string, limit?: number) => ({
  ...(providerId ? { provider_id: providerId } : {}),
  ...(limit ? { limit } : {}),
})
