import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

const keycloakMock = vi.hoisted(() => ({
  token: 'test-token',
  updateToken: vi.fn(() => Promise.resolve(true)),
  logout: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/config/keycloak', () => ({ keycloak: keycloakMock }))

afterEach(() => {
  cleanup()
})
