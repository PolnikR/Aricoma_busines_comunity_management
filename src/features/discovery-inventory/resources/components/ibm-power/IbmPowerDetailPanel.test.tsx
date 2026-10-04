import type { ComponentProps } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IbmPowerDetailPanel } from './IbmPowerDetailPanel'
import type { PowerPartitionResource } from '../../model/discoveryTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

afterEach(cleanup)

type Labels = ComponentProps<typeof IbmPowerDetailPanel>['labels']

// One value per section, so every section renders.
const partition = {
  partitionName: 'LPAR01',
  partitionData: {
    Uptime: '12 days',
    CurrentProcessors: '4',
    IPAddress: '10.0.0.10',
    VolumeName: 'hdisk0',
    MaximumVirtualIOSlots: '64',
  },
} as unknown as PowerPartitionResource

const labels = {
  entity: 'Partition',
  detail: 'Partition detail',
  close: 'Close partition',
  resize: 'Resize',
  yes: 'Yes',
  no: 'No',
  sections: {
    summary: 'Summary',
    processorMemory: 'Processor & memory',
    network: 'Network',
    storage: 'Storage',
    virtualIo: 'Virtual I/O',
  },
  // Each field label is its key, which keeps row keys unique.
  fields: new Proxy({}, { get: (_target, key) => String(key) }),
  values: { dedicated: 'Dedicated', shared: 'Shared', fibreChannel: 'Fibre Channel', iscsi: 'iSCSI', direct: 'Direct' },
} as unknown as Labels

describe('IbmPowerDetailPanel', () => {
  it('lays out accented sections that scroll on their own', () => {
    render(<IbmPowerDetailPanel partition={partition} open onClose={vi.fn()} labels={labels} />)
    const accentOf = (name: string) => screen.getByRole('button', { name }).closest('section')?.getAttribute('data-accent')

    expect(screen.getByRole('dialog').querySelector('[data-body-layout]')).toHaveAttribute('data-body-layout', 'sections')
    expect(accentOf('Summary')).toBe('overview')
    expect(accentOf('Processor & memory')).toBe('infrastructure')
    expect(accentOf('Network')).toBe('infrastructure')
    expect(accentOf('Storage')).toBe('storage')
    expect(accentOf('Virtual I/O')).toBe('infrastructure')
  })
})
