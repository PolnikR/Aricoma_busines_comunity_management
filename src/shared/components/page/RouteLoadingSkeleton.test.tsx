import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RouteLoadingSkeleton } from './RouteLoadingSkeleton'
import { VirtualMachinesSkeleton } from '../inventory-shell/InventoryShell'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('RouteLoadingSkeleton', () => {
  it('renders an accessible shared table loading state without module loading text', () => {
    render(<RouteLoadingSkeleton />)

    expect(screen.getByRole('status', { name: 'Loading' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('Loading module')).not.toBeInTheDocument()
  })

  it('renders the shared virtual machines loading state', () => {
    const { container } = render(<VirtualMachinesSkeleton />)

    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status', { name: 'Loading virtual machines' })).toBeInTheDocument()
  })

  it('renders a builder-shaped loading state when requested', () => {
    const { container } = render(<RouteLoadingSkeleton variant="builder" />)
    expect(screen.getByLabelText('Loading')).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('.lg\\:grid-cols-\\[280px_minmax\\(0\\,1fr\\)\\]')).toBeInTheDocument()
  })
})
