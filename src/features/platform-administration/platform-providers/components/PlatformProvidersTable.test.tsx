import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PlatformProvidersTable } from './PlatformProvidersTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useDeletePlatformProvider', () => ({
  useDeletePlatformProvider: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

describe('PlatformProvidersTable', () => {
  it('keeps search available without exposing platform-provider API errors', () => {
    render(
      <PlatformProvidersTable
        providers={[]}
        isLoading={false}
        error={new Error('platform provider internals')}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert')).not.toHaveTextContent('platform provider internals')
  })
})
