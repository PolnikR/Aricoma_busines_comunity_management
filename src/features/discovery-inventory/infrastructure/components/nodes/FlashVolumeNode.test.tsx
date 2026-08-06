import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps, ReactNode } from 'react'
import { FlashVolumeNode } from './FlashVolumeNode'

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

function baseData(overrides: Record<string, unknown> = {}) {
  return {
    id: 'volume:0', kind: 'volume', label: 'Volume0', volumeId: '0', status: 'online',
    capacity: '1.00TB', role: null, isSnapshotTarget: false, hasSnapshots: false,
    snapshotCount: 0, mdiskGroupName: 'Pool0',
    ...overrides,
  }
}

describe('FlashVolumeNode', () => {
  it('renders volume label, capacity, and status without a role badge', () => {
    const props = { data: baseData(), selected: false } as unknown as ComponentProps<typeof FlashVolumeNode>
    render(<FlashVolumeNode {...props} />)
    expect(screen.getByText('Volume0')).toBeInTheDocument()
    expect(screen.getByText('1.00TB')).toBeInTheDocument()
    expect(screen.getByText('online')).toBeInTheDocument()
    expect(screen.queryByText('Target')).not.toBeInTheDocument()
  })

  it('renders a role badge for a snapshot target volume', () => {
    const props = {
      data: baseData({ role: 'target', isSnapshotTarget: true }),
      selected: false,
    } as unknown as ComponentProps<typeof FlashVolumeNode>
    render(<FlashVolumeNode {...props} />)
    expect(screen.getByText('Target')).toBeInTheDocument()
  })
})
