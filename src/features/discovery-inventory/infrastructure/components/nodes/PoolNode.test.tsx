import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps, ReactNode } from 'react'
import { PoolNode } from './PoolNode'

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

describe('PoolNode', () => {
  it('renders pool label, capacity, and volume count', () => {
    const props = {
      data: {
        id: 'pool:0', kind: 'pool', label: 'Pool0', poolId: '0', status: 'online',
        capacity: '10.00TB', freeCapacity: '5.00TB', volumeCount: 46, encrypt: 'no', easyTier: 'on',
      },
      selected: false,
    } as unknown as ComponentProps<typeof PoolNode>
    render(<PoolNode {...props} />)
    expect(screen.getByText('Pool0')).toBeInTheDocument()
    expect(screen.getByText('10.00TB')).toBeInTheDocument()
    expect(screen.getByText('46 volumes')).toBeInTheDocument()
  })
})
