import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InfrastructureTopologySkeleton } from './InfrastructureTopologySkeleton'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('InfrastructureTopologySkeleton', () => {
  it('exposes an accessible loading state', () => {
    render(<InfrastructureTopologySkeleton />)
    expect(screen.getByLabelText('Loading infrastructure topology')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('searchbox', { name: 'Search infrastructure topology' })).toBeDisabled()
    expect(screen.getByText('Cluster')).toBeVisible()
    expect(screen.getByLabelText('Topology legend').parentElement).toHaveTextContent('nodes / relations')
  })

  it('keeps the same desktop canvas floor as the loaded workspace', () => {
    render(<InfrastructureTopologySkeleton />)

    const skeleton = screen.getByLabelText('Loading infrastructure topology')
    const canvasPlaceholder = skeleton.querySelector('.animate-pulse')?.parentElement
    // min-content keeps toolbar + canvas floor + legend; overflow-hidden would otherwise let it shrink to 0.
    expect(skeleton).toHaveClass('flex', 'min-h-0', 'flex-1', 'overflow-hidden', 'lg:min-h-min')
    expect(canvasPlaceholder).toHaveClass('min-h-0', 'flex-1', 'lg:min-h-[260px]')
  })
})
