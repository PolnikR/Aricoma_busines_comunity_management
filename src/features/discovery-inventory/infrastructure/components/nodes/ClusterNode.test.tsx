import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps, ReactNode } from 'react'
import { ClusterNode } from './ClusterNode'

vi.mock('../../hooks/useTooltipHover', () => ({
  useTooltipHover: () => ({
    showTooltip: false,
    nodeRef: { current: null },
    handleMouseEnter: vi.fn(),
    handleMouseLeave: vi.fn(),
  }),
}))
vi.mock('./TopologyNodeShell', () => ({
  TopologyNodeShell: ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => (
    <div><span>{title}</span><span>{subtitle}</span>{children}</div>
  ),
}))

describe('ClusterNode', () => {
  it('renders cluster label and host count', () => {
    const props = {
      data: { id: 'c1', kind: 'cluster', label: 'cluster-1', hostCount: 2 },
      selected: false,
    } as unknown as ComponentProps<typeof ClusterNode>
    render(<ClusterNode {...props} />)
    expect(screen.getByText('cluster-1')).toBeInTheDocument()
    expect(screen.getByText('2 hosts')).toBeInTheDocument()
  })
})
