import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InfrastructureTopologyLegend } from './InfrastructureTopologyLegend'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('InfrastructureTopologyLegend', () => {
  it('renders node kinds and visible statistics', () => {
    render(<InfrastructureTopologyLegend platform="vmware" visibleNodes={7} visibleEdges={6} />)
    expect(screen.getByLabelText('Topology legend')).toBeInTheDocument()
    expect(screen.getByText(/7.*6/)).toBeInTheDocument()
  })

  it('renders IBM Power node kinds', () => {
    render(<InfrastructureTopologyLegend platform="ibm-power" visibleNodes={3} visibleEdges={2} />)

    expect(screen.getByText('Managed system')).toBeInTheDocument()
    expect(screen.getByText('LPAR')).toBeInTheDocument()
    expect(screen.getByText('VIOS')).toBeInTheDocument()
    expect(screen.queryByText('Datastore')).not.toBeInTheDocument()
  })
})
