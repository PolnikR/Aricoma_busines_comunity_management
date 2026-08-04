import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ClusterNodeTooltip } from './ClusterNodeTooltip'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('ClusterNodeTooltip', () => {
  it('renders cluster details and plural host count', () => {
    render(
      <ClusterNodeTooltip
        nodeRef={createRef<HTMLElement>()}
        data={{ name: 'cluster-1', description: 'Compute cluster', hostCount: 2 }}
      />,
    )
    expect(screen.getByText('cluster-1')).toBeInTheDocument()
    expect(screen.getByText(/2/)).toBeInTheDocument()
  })
})
