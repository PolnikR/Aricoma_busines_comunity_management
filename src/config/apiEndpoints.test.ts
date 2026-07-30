import { describe, expect, it } from 'vitest'
import { API_ENDPOINTS } from './apiEndpoints'

const endpoints = Object.values(API_ENDPOINTS).flatMap(group => Object.values(group))

describe('API_ENDPOINTS', () => {
  it('contains only unique API-prefixed endpoint paths', () => {
    expect(endpoints.every(endpoint => endpoint.startsWith('/api/'))).toBe(true)
    expect(new Set(endpoints).size).toBe(endpoints.length)
  })
})
