import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps, ReactNode } from 'react'
import { PowerPartitionNode } from './PowerPartitionNode'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('./TopologyNodeShell', () => ({
  TopologyNodeShell: ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => (
    <div><span>{title}</span><span>{subtitle}</span>{children}</div>
  ),
}))

describe('PowerPartitionNode', () => {
  it('renders partition kind, state and managed system', () => {
    const props = {
      data: {
        id: 'powerPartition:p1',
        kind: 'powerPartition',
        label: 'Payments LPAR',
        partitionId: 'p1',
        partitionKind: 'LPAR',
        partitionState: 'running',
        systemName: 'Power System A',
        operatingSystemType: 'AIX',
        deviceName: '',
        bootMode: 'Normal',
        volumeName: '',
        volumeState: '',
      },
      selected: false,
    } as unknown as ComponentProps<typeof PowerPartitionNode>

    render(<PowerPartitionNode {...props} />)

    expect(screen.getByText('Payments LPAR')).toBeInTheDocument()
    expect(screen.getByText('Power System A')).toBeInTheDocument()
    expect(screen.getByText('LPAR')).toBeInTheDocument()
    expect(screen.getByText('running')).toBeInTheDocument()
  })
})
