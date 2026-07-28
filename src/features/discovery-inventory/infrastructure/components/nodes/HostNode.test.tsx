import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps, ReactNode } from 'react'
import { HostNode } from './HostNode'

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

describe('HostNode', () => {
  it('renders host, clusters, and VM count', () => {
    const props = {
      data: {
        id: 'h1', kind: 'host', label: 'host-1',
        clusterNames: ['cluster-a', 'cluster-b'], virtualMachineCount: 4,
      },
      selected: false,
    } as unknown as ComponentProps<typeof HostNode>
    render(<HostNode {...props} />)
    expect(screen.getByText('cluster-a, cluster-b')).toBeInTheDocument()
    expect(screen.getByText('4 virtual machines')).toBeInTheDocument()
  })
})
