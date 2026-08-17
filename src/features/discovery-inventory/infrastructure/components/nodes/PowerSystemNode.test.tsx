import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps, ReactNode } from 'react'
import { PowerSystemNode } from './PowerSystemNode'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('./TopologyNodeShell', () => ({
  TopologyNodeShell: ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => (
    <div><span>{title}</span><span>{subtitle}</span>{children}</div>
  ),
}))

describe('PowerSystemNode', () => {
  it('renders a managed system and its partition counts', () => {
    const props = {
      data: {
        id: 'powerSystem:s1',
        kind: 'powerSystem',
        label: 'Power System A',
        partitionCount: 3,
        lparCount: 2,
        viosCount: 1,
      },
      selected: false,
    } as unknown as ComponentProps<typeof PowerSystemNode>

    render(<PowerSystemNode {...props} />)

    expect(screen.getByText('Power System A')).toBeInTheDocument()
    expect(screen.getByText('2 LPAR')).toBeInTheDocument()
    expect(screen.getByText('1 VIOS')).toBeInTheDocument()
  })
})
