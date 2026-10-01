import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { VolumesResponse } from '@/generated/query/zod'
import { parseWireResponse } from '@/test-utils/parseWireResponse'
import { mapFlashSystemInventory } from '../helpers/mapFlashSystemInventory'
import { RESOURCE_METRICS_COLLAPSED_KEY } from '../state/resourceMetricsPreference'
import { FlashSystemMetrics, PowerMetrics } from './SourceInventoryMetrics'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

beforeEach(() => { localStorage.setItem(RESOURCE_METRICS_COLLAPSED_KEY, 'false') })

function provider(id: string): ProviderRecord {
  return {
    id,
    name: id,
    description: '',
    type: 'FLASHCOPY',
    role: 'source',
    ipAddress: '10.0.0.1',
    credentialId: null,
    credentialStatus: 'none',
  }
}

function inventory(providerId: string, capacity: string) {
  return mapFlashSystemInventory(parseWireResponse(VolumesResponse, {
    count: 1,
    volumes: [{
      id: '0',
      name: `${providerId}-volume`,
      status: 'online',
      mdisk_grp_id: '0',
      capacity,
      host_maps: [{ host_id: '0', scsi_id: '0' }],
    }],
    pools: {
      0: { name: 'Pool0', capacity, used_capacity: '0 B', free_capacity: capacity },
    },
    hosts: {
      0: { name: 'HOST_esx', cluster_id: null, cluster_name: '' },
    },
    clusters: {},
    consistency_groups: {},
  }), providerId)
}

describe('FlashSystemMetrics', () => {
  it('keeps FlashSystem labels visible while remote values load', () => {
    render(<FlashSystemMetrics resources={[]} inventories={[]} isLoading labels={{ total: 'Volumes', active: 'Online', third: 'Capacity', fourth: 'Free', validated: 'Validated' }} />)
    for (const label of ['Volumes', 'Online', 'Capacity', 'Free']) expect(screen.getByText(label)).toBeVisible()
    expect(screen.getAllByRole('article').every(card => card.getAttribute('aria-busy') === 'true')).toBe(true)
  })

  it('aggregates equal pool and host IDs independently per provider', () => {
    const first = inventory('flash-01', '1 TB')
    const second = inventory('flash-02', '2 TB')

    render(
      <FlashSystemMetrics
        resources={[...first.resources, ...second.resources]}
        inventories={[
          { provider: provider('flash-01'), inventory: first },
          { provider: provider('flash-02'), inventory: second },
        ]}
        labels={{
          total: 'Volumes',
          active: 'Online',
          third: 'Capacity',
          fourth: 'Free',
          validated: 'Validated',
        }}
        helperLabels={{ pools: 'pools', hosts: 'hosts' }}
      />,
    )

    expect(screen.getByText('2 pools')).toBeInTheDocument()
    expect(screen.getByText('2 hosts')).toBeInTheDocument()
    expect(screen.getAllByText('3 TB')).toHaveLength(2)
  })
})

describe('PowerMetrics', () => {
  it('keeps IBM Power labels visible while remote values load', () => {
    render(<PowerMetrics resources={[]} isLoading labels={{ total: 'Partitions', active: 'Running', third: 'LPAR', fourth: 'VIOS', validated: 'Validated' }} />)
    for (const label of ['Partitions', 'Running', 'LPAR', 'VIOS']) expect(screen.getByText(label)).toBeVisible()
    expect(screen.getAllByRole('article').every(card => card.getAttribute('aria-busy') === 'true')).toBe(true)
  })

  it('follows the shared collapsed Resources preference', () => {
    localStorage.setItem(RESOURCE_METRICS_COLLAPSED_KEY, 'true')
    render(<PowerMetrics resources={[]} labels={{ total: 'Partitions', active: 'Running', third: 'LPAR', fourth: 'VIOS', validated: 'Validated' }} />)

    expect(screen.getByRole('button', { name: /0 Partitions.*0 VIOS.*Show details/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })
})
