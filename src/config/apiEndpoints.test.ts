import { describe, expect, it } from 'vitest'
import { API_ENDPOINTS } from './apiEndpoints'

const endpoints = Object.values(API_ENDPOINTS).flatMap(group => Object.values(group))

describe('API_ENDPOINTS', () => {
  it('contains only unique API-prefixed endpoint paths', () => {
    expect(endpoints.every(endpoint => endpoint.startsWith('/api/'))).toBe(true)
    expect(new Set(endpoints).size).toBe(endpoints.length)
  })

  it('defines the platform provider API contract', () => {
    expect(API_ENDPOINTS.platformProviders).toEqual({
      list: '/api/get_platform_providers',
      submit: '/api/submit_platform_provider',
      delete: '/api/delete_platform_provider',
    })
  })

  it('defines the snapshot policy API contract', () => {
    expect(API_ENDPOINTS.snapshotPolicies).toEqual({
      list: '/api/get_policies',
      submit: '/api/submit_policy',
      delete: '/api/delete_policy',
    })
  })

  it('defines the clean room policy API contract', () => {
    expect(API_ENDPOINTS.cleanRoomPolicies).toEqual({
      list: '/api/get_clean_room_policies',
      submit: '/api/submit_clean_room_policy',
      delete: '/api/delete_clean_room_policy',
    })
  })
})
