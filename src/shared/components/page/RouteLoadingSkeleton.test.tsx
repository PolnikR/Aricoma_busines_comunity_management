import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RouteLoadingSkeleton } from './RouteLoadingSkeleton'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('RouteLoadingSkeleton', () => {
  it('renders an accessible shared table loading state without module loading text', () => {
    render(<RouteLoadingSkeleton />)

    expect(screen.getByRole('status', { name: 'Loading' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('Loading module')).not.toBeInTheDocument()
  })
})
