import { OrvalApiError } from './orvalMutator'

const MAX_CAUSE_DEPTH = 10

function isObjectLike(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function nonEmptyTrimmed(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()
  return trimmed || undefined
}

function extractDetailFromBody(body: unknown): string | undefined {
  if (!isRecord(body)) return undefined

  const detail = body['detail']
  const stringDetail = nonEmptyTrimmed(detail)
  if (stringDetail) return stringDetail

  if (!Array.isArray(detail)) return undefined

  const messages = detail.flatMap((entry) => {
    if (!isRecord(entry)) return []

    const message = nonEmptyTrimmed(entry['msg'])
    return message ? [message] : []
  })

  return messages.length > 0 ? messages.join('; ') : undefined
}

interface ErrorChainSummary {
  apiDetail: string | undefined
  hasApiError: boolean
  ordinaryMessage: string | undefined
}

function inspectErrorChain(error: unknown): ErrorChainSummary {
  const visited = new Set<object>()
  let current = error
  let apiDetail: string | undefined
  let hasApiError = false
  let ordinaryMessage: string | undefined

  for (let depth = 0; depth <= MAX_CAUSE_DEPTH; depth += 1) {
    if (!isObjectLike(current) || visited.has(current)) break

    visited.add(current)

    if (current instanceof OrvalApiError) {
      hasApiError = true
      apiDetail ??= extractDetailFromBody(current.body)
    } else if (current instanceof Error) {
      ordinaryMessage ??= nonEmptyTrimmed(current.message)
    }

    current = current instanceof Error ? current.cause : undefined
  }

  return { apiDetail, hasApiError, ordinaryMessage }
}

export function extractBackendErrorDetail(error: unknown): string | undefined {
  return inspectErrorChain(error).apiDetail
}

export function resolveUserFacingErrorMessage(error: unknown, fallback: string): string {
  const { apiDetail, hasApiError, ordinaryMessage } = inspectErrorChain(error)

  if (apiDetail) return apiDetail
  if (hasApiError) return fallback
  return ordinaryMessage ?? fallback
}
