import { vi } from 'vitest'

interface KeycloakUnitMock {
  token: string | undefined
  updateToken: ReturnType<typeof vi.fn>
  logout: ReturnType<typeof vi.fn>
}

export const keycloakMock: KeycloakUnitMock = {
  token: 'test-token',
  updateToken: vi.fn(),
  logout: vi.fn(),
}
