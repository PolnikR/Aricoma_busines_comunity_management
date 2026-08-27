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
})
