import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  GeneratedResponseContractError,
  parseGeneratedResponse,
} from './generatedResponse'

describe('parseGeneratedResponse', () => {
  const schema = z.object({
    records: z.array(z.object({
      id: z.string(),
      enabled: z.boolean().default(true),
    })),
  })

  it('returns generated output with schema defaults applied', () => {
    expect(parseGeneratedResponse(schema, {
      records: [{ id: 'record-1' }],
    }, 'GET /records')).toEqual({
      records: [{ id: 'record-1', enabled: true }],
    })
  })

  it('reports the operation and failing response path for contract drift', () => {
    expect(() => parseGeneratedResponse(schema, {
      records: [{ id: 42 }],
    }, 'GET /records')).toThrow(
      new GeneratedResponseContractError(
        'GET /records',
        ['records.0.id: Invalid input: expected string, received number'],
      ),
    )
  })
})
