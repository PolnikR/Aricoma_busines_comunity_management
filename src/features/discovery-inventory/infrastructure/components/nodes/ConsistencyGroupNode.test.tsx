import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps, ReactNode } from 'react'
import { ConsistencyGroupNode } from './ConsistencyGroupNode'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

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

describe('ConsistencyGroupNode', () => {
  it('renders group label, status, and fcmap mapping count', () => {
    const props = {
      data: {
        id: 'consistencyGroup:5', kind: 'consistencyGroup', label: 'cg5', groupId: '5',
        status: 'copying', fcMappingCount: 3, spansPools: false, poolCount: 1,
      },
      selected: false,
    } as unknown as ComponentProps<typeof ConsistencyGroupNode>
    render(<ConsistencyGroupNode {...props} />)
    expect(screen.getByText('cg5')).toBeInTheDocument()
    expect(screen.getByText('copying')).toBeInTheDocument()
    expect(screen.getByText('3 FlashCopy mappings')).toBeInTheDocument()
  })
})
