import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps, ReactNode } from 'react'
import { FlashCopyMapNode } from './FlashCopyMapNode'

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

describe('FlashCopyMapNode', () => {
  it('renders fcmap label, status, and progress', () => {
    const props = {
      data: {
        id: 'fcmap:10', kind: 'fcmap', label: 'fcmap10', fcmapId: '10', status: 'copying',
        progress: '50', copyRate: '50', sourceVolumeId: 'volume:0', targetVolumeId: 'volume:1',
        sourceVolumeName: 'Volume0', targetVolumeName: 'Volume1',
      },
      selected: false,
    } as unknown as ComponentProps<typeof FlashCopyMapNode>
    render(<FlashCopyMapNode {...props} />)
    expect(screen.getByText('fcmap10')).toBeInTheDocument()
    expect(screen.getByText('copying')).toBeInTheDocument()
    expect(screen.getByText('50% Progress')).toBeInTheDocument()
  })
})
