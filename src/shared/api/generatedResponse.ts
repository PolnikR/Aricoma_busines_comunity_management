import { z } from 'zod'

export class GeneratedResponseContractError extends Error {
  readonly operation: string
  readonly issues: readonly string[]

  constructor(
    operation: string,
    issues: readonly string[],
    options?: ErrorOptions,
  ) {
    super(`${operation} response does not match OpenAPI: ${issues.join('; ')}`, options)
    this.name = 'GeneratedResponseContractError'
    this.operation = operation
    this.issues = issues
  }
}

export function parseGeneratedResponse<TSchema extends z.ZodType>(
  schema: TSchema,
  payload: unknown,
  operation: string,
): z.output<TSchema> {
  const parsed = schema.safeParse(payload)
  if (parsed.success) return parsed.data

  const issues = parsed.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'response'
    return `${path}: ${issue.message}`
  })
  throw new GeneratedResponseContractError(operation, issues, { cause: parsed.error })
}
