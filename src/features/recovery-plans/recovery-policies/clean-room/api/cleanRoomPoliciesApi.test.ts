import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CleanRoomPolicy } from '../model/cleanRoomPolicyTypes'
import {
  deleteCleanRoomPolicy,
  fetchCleanRoomPolicies,
  submitCleanRoomPolicy,
} from './cleanRoomPoliciesApi'

const policy: CleanRoomPolicy = {
  id: 'enforce-clean-target',
  name: 'Enforce Clean Target',
  description: 'Remove conflicting target resources before recovery.',
  enabled: true,
}

function stubFetch(payload: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(payload === null ? null : JSON.stringify(payload), { status }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('cleanRoomPoliciesApi', () => {
  it('loads and validates clean room policies with the current user header', async () => {
    const fetchMock = stubFetch({ clean_room_policies: [policy] })

    await expect(fetchCleanRoomPolicies()).resolves.toEqual([policy])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/get_clean_room_policies')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
  })

  it('submits the wire contract and reads only the returned clean room list', async () => {
    const fetchMock = stubFetch({
      recovery_app_policies: [{ id: 'unrelated' }],
      clean_room_policies: [policy],
    })

    await expect(submitCleanRoomPolicy(policy)).resolves.toEqual([policy])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/submit_clean_room_policy')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify(policy))
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  })

  it('deletes an encoded policy id and parses the authoritative list', async () => {
    const fetchMock = stubFetch({ clean_room_policies: [] })

    await expect(deleteCleanRoomPolicy('clean/target policy')).resolves.toEqual([])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/delete_clean_room_policy?policy_id=clean%2Ftarget+policy')
    expect(init.method).toBe('DELETE')
  })

  it('rejects malformed responses, invalid input, and unsuccessful requests', async () => {
    stubFetch({ clean_room_policies: [{ ...policy, enabled: 'yes' }] })
    await expect(fetchCleanRoomPolicies()).rejects.toBeInstanceOf(Error)

    const fetchMock = stubFetch({ clean_room_policies: [] })
    await expect(submitCleanRoomPolicy({ ...policy, id: '' })).rejects.toBeInstanceOf(Error)
    await expect(deleteCleanRoomPolicy('')).rejects.toBeInstanceOf(Error)
    expect(fetchMock).not.toHaveBeenCalled()

    stubFetch(null, 503)
    await expect(fetchCleanRoomPolicies()).rejects.toThrow('Get clean room policies request failed with status 503')
  })
})
