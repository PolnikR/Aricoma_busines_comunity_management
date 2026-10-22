import { afterEach, describe, expect, it, vi } from 'vitest'
import { validatingMutator } from './validatingMutator'

// The unit project runs without module isolation, so this test uses the real
// generated response registry and only stubs fetch.
function stubFetch(body: unknown) {
  const mock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() => Promise.resolve(
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  ))
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('validatingMutator', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('returns the validated response and keeps fields the schema does not list', async () => {
    stubFetch({ credentials: [{ id: 'a', name: 'A', username: 'u', extra: 1 }] })
    await expect(validatingMutator('/get_credentials', { method: 'GET' })).resolves.toEqual({
      credentials: [{ id: 'a', name: 'A', username: 'u', extra: 1 }],
    })
  })

  it('applies schema defaults in nested records without dropping vendor fields', async () => {
    stubFetch({ count: 1, volumes: [{ name: 'VOL-01', vendor_flag: 'x' }], pools: {}, hosts: {}, clusters: {}, consistency_groups: {} })
    const result = await validatingMutator<{ volumes: Record<string, unknown>[] }>('/get_volumes', { method: 'GET' })

    expect(result.volumes[0]).toMatchObject({ name: 'VOL-01', vendor_flag: 'x', status: 'unknown', host_maps: [] })
  })

  it('ignores the query string when looking up the schema', async () => {
    stubFetch({ credentials: 'bad' })
    await expect(validatingMutator('/get_credentials?x=1', { method: 'GET' }))
      .rejects.toMatchObject({ name: 'GeneratedResponseContractError', operation: 'GET /get_credentials' })
  })

  it.each([undefined, 50])('normalizes snapshot copy rate %s through the response registry', async rate => {
    stubFetch({ snapshot_policies: [{
      id: 'hourly', name: 'Hourly', frequency_value: 1, frequency_unit: 'hours',
      retention_value: 1, retention_unit: 'days', flashcopy_copy_rate: rate,
    }] })
    await expect(validatingMutator('/get_policies', { method: 'GET' })).resolves.toMatchObject({
      snapshot_policies: [{ id: 'hourly', flashcopy_copy_rate: rate ?? 0 }],
    })
  })

  it('throws a contract error naming the operation', async () => {
    stubFetch({ roles: [] })
    await expect(validatingMutator('/get_roles_permissions', { method: 'GET' }))
      .rejects.toMatchObject({ name: 'GeneratedResponseContractError', operation: 'GET /get_roles_permissions' })
  })

  it('passes operations without a response schema through unchanged', async () => {
    stubFetch({ status: 'anything' })
    await expect(validatingMutator('/not_in_the_spec', { method: 'GET' })).resolves.toEqual({ status: 'anything' })
  })
})
