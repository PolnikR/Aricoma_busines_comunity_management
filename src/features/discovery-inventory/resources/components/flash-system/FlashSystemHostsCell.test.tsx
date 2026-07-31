import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FlashSystemVolumeResource } from '../../../model/discoveryTypes'
import type {
  FlashSystemHostSummary,
} from '../../helpers/buildFlashSystemHostSummaries'
import type { FlashSystemHostTooltipLabels } from './FlashSystemHostBadge'
import { FlashSystemHostsCell } from './FlashSystemHostsCell'

const labels: FlashSystemHostTooltipLabels = {
  showDetails: 'Show details for host',
  hostId: 'Host ID',
  cluster: 'Cluster',
  notAssigned: 'Not assigned',
  mappedVolumes: 'Mapped volumes',
  mappedCapacity: 'Mapped capacity',
  unavailable: 'Unavailable',
  lun: 'LUN',
  showAdditionalHosts: 'Show additional hosts',
  additionalHosts: 'Additional mapped hosts',
}

function summary(id: string): FlashSystemHostSummary {
  return {
    key: `flash-01:${id}`,
    providerId: 'flash-01',
    hostId: id,
    name: `Host ${id}`,
    clusterId: null,
    clusterName: '',
    mappedVolumes: [],
    totalCapacityBytes: null,
  }
}

function volume(hostIds: string[]): FlashSystemVolumeResource {
  return {
    id: 'volume-01',
    name: 'Volume 01',
    IO_group_id: '',
    IO_group_name: '',
    status: 'online',
    capacity: '1 GB',
    type: 'striped',
    vdisk_UID: 'uid-01',
    mdisk_grp_id: '0',
    mdisk_grp_name: 'Pool0',
    FC_id: '',
    FC_name: '',
    RC_id: '',
    RC_name: '',
    fc_map_count: '0',
    copy_count: '1',
    fast_write_state: '',
    se_copy_count: '0',
    RC_change: '',
    compressed_copy_count: '0',
    parent_mdisk_grp_id: '',
    parent_mdisk_grp_name: '',
    formatting: '',
    encrypt: '',
    volume_id: 'volume-01',
    volume_name: 'Volume 01',
    function: '',
    protocol: 'scsi',
    host_maps: hostIds.map((hostId) => ({ host_id: hostId, scsi_id: hostId })),
    resourceId: 'flash-01:volume-01',
    providerId: 'flash-01',
    providerType: 'FLASHCOPY',
    pool: null,
    capacityBytes: 1_000_000_000,
    resolvedHostMaps: hostIds.map((hostId) => ({
      host_id: hostId,
      scsi_id: hostId,
      hostName: `Host ${hostId}`,
      clusterId: null,
      clusterName: '',
    })),
  }
}

describe('FlashSystemHostsCell', () => {
  it('shows two host badges and a compact overflow badge', () => {
    const summaries = new Map(['0', '1', '2', '3'].map((id) => [`flash-01:${id}`, summary(id)]))
    render(<FlashSystemHostsCell volume={volume(['0', '1', '2', '3'])} summaries={summaries} labels={labels} />)

    expect(screen.getByRole('button', { name: 'Show details for host Host 0' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show details for host Host 1' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show details for host Host 2' })).not.toBeInTheDocument()

    const overflow = screen.getByRole('button', { name: 'Show additional hosts 2' })
    expect(overflow).toHaveTextContent('+2')
    fireEvent.mouseEnter(overflow)
    const tooltip = screen.getByRole('tooltip')
    expect(within(tooltip).getByText('Host 2')).toBeInTheDocument()
    expect(within(tooltip).getByText('Host 3')).toBeInTheDocument()
  })

  it('renders a dash when the volume has no mapped hosts', () => {
    const { container } = render(
      <FlashSystemHostsCell volume={volume([])} summaries={new Map()} labels={labels} />,
    )

    expect(container).toHaveTextContent('-')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('does not repeat a host badge when the API repeats a mapping', () => {
    const summaries = new Map([['flash-01:0', summary('0')]])
    render(
      <FlashSystemHostsCell volume={volume(['0', '0'])} summaries={summaries} labels={labels} />,
    )

    expect(screen.getAllByRole('button', { name: 'Show details for host Host 0' })).toHaveLength(1)
  })
})
