import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InfrastructureTopologyLegend } from './InfrastructureTopologyLegend'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('InfrastructureTopologyLegend', () => {
  it('renders node kinds and visible statistics', () => {
    render(<InfrastructureTopologyLegend visibleNodes={7} visibleEdges={6} />)
    expect(screen.getByLabelText('Topology legend')).toBeInTheDocument()
    expect(screen.getByText(/7.*6/)).toBeInTheDocument()
  })
})
