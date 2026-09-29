import type { CredentialsResponse } from '@/generated/query/zod'

export const selectCredentials = (response: CredentialsResponse) => response.credentials
