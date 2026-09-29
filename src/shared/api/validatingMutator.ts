import { responseSchemas } from '@/generated/query/responseSchemas.gen'
import { parseGeneratedResponse } from './generatedResponse'
import { orvalMutator } from './orvalMutator'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Orval emits `zod.object` for every schema with listed properties, which strips
// keys the spec does not list (even with `additionalProperties: true`). The parsed
// value is laid over the received payload so validation and defaults apply while
// vendor fields outside the spec survive.
export function keepUnlistedFields(received: unknown, parsed: unknown): unknown {
  if (Array.isArray(received) && Array.isArray(parsed) && received.length === parsed.length) {
    return parsed.map((item, index) => keepUnlistedFields(received[index], item))
  }
  if (isPlainObject(received) && isPlainObject(parsed)) {
    const merged: Record<string, unknown> = { ...received }
    for (const [key, value] of Object.entries(parsed)) {
      merged[key] = keepUnlistedFields(received[key], value)
    }
    return merged
  }
  return parsed
}

// Orval skips its own runtime validation when a custom mutator is configured, so
// every generated call is validated here against the generated response schema.
export async function validatingMutator<T>(url: string, options?: RequestInit): Promise<T> {
  const payload = await orvalMutator<unknown>(url, options)
  const operation = `${(options?.method ?? 'GET').toUpperCase()} ${url.split('?')[0] ?? url}`
  const schema = responseSchemas[operation]
  if (!schema) return payload as T
  return keepUnlistedFields(payload, parseGeneratedResponse(schema, payload, operation)) as T
}

// Generated hooks use this as their error type: the mutator throws OrvalApiError
// (HTTP failure), GeneratedResponseContractError (contract mismatch) or a network Error.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Orval requires this generic parameter to detect and use ErrorType
export type ErrorType<_Error> = Error
