import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppShellSkeleton } from './AppShellSkeleton'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('AppShellSkeleton', () => {
  it('renders one localized busy status with decorative shell placeholders', () => {
    const { container } = render(<AppShellSkeleton />)

    expect(screen.getByRole('status', { name: 'Loading' })).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelectorAll('a, button, input, img')).toHaveLength(0)
    expect(screen.queryByText('Loading')).not.toBeInTheDocument()
  })

  it('stacks the page heading and action placeholders below the small breakpoint', () => {
    render(<AppShellSkeleton />)

    expect(screen.getByTestId('skeleton-page-heading')).toHaveClass('flex-col', 'items-start', 'sm:flex-row', 'sm:items-end')
  })
})
