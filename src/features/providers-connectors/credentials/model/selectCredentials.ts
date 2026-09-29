import type { CredentialRecord, CredentialsResponse } from '@/generated/query/zod'

export const selectCredentials = (response: CredentialsResponse): CredentialRecord[] => response.credentials
