import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

vi.mock('@/generated/query/responseSchemas.gen', () => ({
  responseSchemas: { 'GET /get_credentials': z.object({ credentials: z.array(z.object({ id: z.string() })) }) },
}))
vi.mock('./orvalMutator', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./orvalMutator')>()),
  orvalMutator: vi.fn(),
}))

import { orvalMutator } from './orvalMutator'
import { validatingMutator } from './validatingMutator'

describe('validatingMutator', () => {
  afterEach(() => { vi.mocked(orvalMutator).mockReset() })

  it('returns the parsed response when it matches the schema', async () => {
    vi.mocked(orvalMutator).mockResolvedValue({ credentials: [{ id: 'a', extra: 1 }] })
    await expect(validatingMutator('/get_credentials', { method: 'GET' })).resolves.toEqual({ credentials: [{ id: 'a' }] })
  })

  it('ignores the query string when looking up the schema', async () => {
    vi.mocked(orvalMutator).mockResolvedValue({ credentials: [] })
    await expect(validatingMutator('/get_credentials?x=1', { method: 'GET' })).resolves.toEqual({ credentials: [] })
  })

  it('throws a contract error naming the operation', async () => {
    vi.mocked(orvalMutator).mockResolvedValue({ credentials: 'bad' })
    await expect(validatingMutator('/get_credentials', { method: 'GET' }))
      .rejects.toMatchObject({ name: 'GeneratedResponseContractError', operation: 'GET /get_credentials' })
  })

  it('passes unregistered operations through unchanged', async () => {
    vi.mocked(orvalMutator).mockResolvedValue('ok')
    await expect(validatingMutator('/health', { method: 'GET' })).resolves.toBe('ok')
  })
})
