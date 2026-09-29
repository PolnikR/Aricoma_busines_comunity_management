import type { z } from 'zod'
import { keepUnlistedFields } from '@/shared/api/validatingMutator'

// Parses a raw backend payload exactly like validatingMutator does: validated by
// the generated schema, defaults applied, fields outside the spec kept.
export function parseWireResponse<TSchema extends z.ZodType>(schema: TSchema, raw: unknown): z.output<TSchema> {
  return keepUnlistedFields(raw, schema.parse(raw)) as z.output<TSchema>
}
