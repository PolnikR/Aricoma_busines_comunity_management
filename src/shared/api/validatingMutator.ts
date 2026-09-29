import { responseSchemas } from '@/generated/query/responseSchemas.gen'
import { parseGeneratedResponse } from './generatedResponse'
import { orvalMutator } from './orvalMutator'

// Orval skips its own runtime validation when a custom mutator is configured, so
// every generated call is validated here against the generated response schema.
export async function validatingMutator<T>(url: string, options?: RequestInit): Promise<T> {
  const payload = await orvalMutator<unknown>(url, options)
  const operation = `${(options?.method ?? 'GET').toUpperCase()} ${url.split('?')[0] ?? url}`
  const schema = responseSchemas[operation]
  return (schema ? parseGeneratedResponse(schema, payload, operation) : payload) as T
}
