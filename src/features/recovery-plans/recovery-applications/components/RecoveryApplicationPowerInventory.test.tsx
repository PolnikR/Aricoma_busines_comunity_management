import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RecoveryAppInventoryResponse, type RecoveryAppInventoryVmOutput } from '@/generated/query/zod'
import { RecoveryApplicationPowerInventory } from './RecoveryApplicationPowerInventory'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const lpar = {
  uuid: 'lpar-uuid', state: 'running', rmc_state: 'active', managed_system: 'Power E1080',
  vfc: [{ slot: 0, wwpns: ['C050760000000001', 'C050760000000002'], vios_name: 'vios1', vios_uuid: 'vios-uuid', port_name: 'fcs0', port_wwpn: 'C050760000000003' }],
  ethernet: [{ slot: 4, vlan: 0, mac: '020000000004', switch: 'ETHERNET0' }],
}

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error('Expected test element or fixture')
  return value
}

function inventory(vm: Partial<RecoveryAppInventoryVmOutput> = {}) {
  return RecoveryAppInventoryResponse.parse({
    recovery_app_id: 'power-app', recovery_app_name: 'Power recovery', run_id: 'power-run', compute_provider_id: 'target-hmc',
    platform: 'ibm_power', recovered_datastores: [], tiers: [{ tier_name: 'Database', recovery_group_id: 'db', recovery_group_name: 'DB group', vms: [{
      name: 'db01', source_name: 'db01', target_name: 'dr_db01', target_hmc_provider_id: 'target-hmc',
      target_managed_system: 'Power E1080', found: true, ownership: 'run', host: 'hrun_dr_db01', lpar, ...vm,
    }] }], recovered_hosts: [{
      host: 'orphan-host', storage_provider_id: 'flashsystem-1', active_ports: 0, wwpns: ['C050760000000004'],
      volumes: [{ vdisk_id: '5', vdisk_name: 'recovery-disk', scsi_id: 0, boot: true, capacity_bytes: 0, pool: 'POOL0',
        flashcopy: { map: 'fc-map', source_vdisk: 'production-disk', consistency_group: 'fc-group' } }],
    }],
  })
}

function openLpar() {
  fireEvent.click(required(screen.getByText('Database').closest('summary')))
  fireEvent.click(required(screen.getByText('db01 → dr_db01').closest('summary')))
}

function field(scope: HTMLElement, label: string) {
  return within(scope).getByText(label, { selector: 'dt' }).nextElementSibling
}

describe('RecoveryApplicationPowerInventory', () => {
  it.each(['run', 'foreign', 'unattached', 'unknown', 'future-owner'] as const)('retains existing LPAR details for ownership %s', ownership => {
    render(<RecoveryApplicationPowerInventory inventory={inventory({ ownership, found: ownership === 'run' })} />)
    openLpar()
    expect(screen.getByText('LPAR exists on the target system')).toBeInTheDocument()
    expect(screen.getByText('lpar-uuid')).toBeInTheDocument()
    const labels = { run: 'Owned by this run', foreign: 'WWPNs held by another host', unattached: 'WWPNs without a host', unknown: 'Ownership unverified', 'future-owner': 'Ownership unverified (future-owner)' }
    expect(screen.getByText(labels[ownership])).toBeInTheDocument()
    expect(screen.queryByText('LPAR not found or could not be loaded')).not.toBeInTheDocument()
  })

  it('distinguishes a missing LPAR while retaining target context and orphan hosts', () => {
    render(<RecoveryApplicationPowerInventory inventory={inventory({ found: false, ownership: null, lpar: null })} />)
    openLpar()
    expect(screen.getByText('LPAR not found or could not be loaded')).toBeInTheDocument()
    expect(screen.getByText('target-hmc')).toBeInTheDocument()
    expect(screen.getByText('Power E1080')).toBeInTheDocument()
    expect(screen.getByText('orphan-host')).toBeInTheDocument()
    expect(screen.queryByText('LPAR exists on the target system')).not.toBeInTheDocument()
  })

  it('warns about co-holders while the LPAR disclosure remains collapsed', () => {
    render(<RecoveryApplicationPowerInventory inventory={inventory({ other_hosts: ['production-host'] })} />)
    fireEvent.click(required(screen.getByText('Database').closest('summary')))
    const row = required(screen.getByText('db01 → dr_db01').closest('details'))
    expect(row).not.toHaveAttribute('open')
    expect(within(required(row.querySelector('summary'))).getByText(/WWPNs are also held/)).toBeVisible()
    fireEvent.click(required(row.querySelector('summary')))
    expect(within(row).getByRole('alert')).toHaveTextContent('production-host')
    expect(within(row).getByText('Owned by this run')).toBeInTheDocument()
  })

  it('shows LPAR, vFC and Ethernet fields without losing zero values', () => {
    render(<RecoveryApplicationPowerInventory inventory={inventory()} />)
    openLpar()
    for (const text of ['running', 'active', 'vios1', 'vios-uuid', 'fcs0', 'C050760000000003', '020000000004', 'ETHERNET0']) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }
    const fc = screen.getByRole('region', { name: 'Virtual FC adapters' })
    expect(field(fc, 'Slot')).toHaveTextContent(/^0$/)
    expect(field(fc, 'WWPNs')).toHaveTextContent('C050760000000001, C050760000000002')
    expect(field(screen.getByRole('region', { name: 'Ethernet adapters' }), 'VLAN')).toHaveTextContent(/^0$/)
  })

  it('renders mapped volumes independently of LPAR and keeps SCSI, capacity and FlashCopy data', () => {
    render(<RecoveryApplicationPowerInventory inventory={inventory({ lpar: null, found: false })} />)
    fireEvent.click(required(screen.getByText('orphan-host').closest('summary')))
    const host = required(screen.getByText('orphan-host').closest('details'))
    expect(field(host, 'Active ports')).toHaveTextContent(/^0$/)
    expect(field(host, 'SCSI ID')).toHaveTextContent(/^0$/)
    expect(field(host, 'Capacity (bytes)')).toHaveTextContent(/^0$/)
    expect(field(host, 'Vdisk name')).toHaveTextContent('recovery-disk')
    for (const text of ['flashsystem-1', 'C050760000000004', 'Boot volume', 'POOL0', 'fc-map', 'production-disk', 'fc-group']) {
      expect(within(host).getByText(text)).toBeInTheDocument()
    }
    expect(within(host).getByLabelText('Show technical JSON')).toBeInTheDocument()
  })

  it('does not infer boot from SCSI ID or turn missing capacity into zero', () => {
    const data = inventory()
    const volume = required(required(data.recovered_hosts[0]).volumes[0])
    volume.boot = false
    volume.capacity_bytes = null
    volume.flashcopy = null
    render(<RecoveryApplicationPowerInventory inventory={data} />)
    fireEvent.click(required(screen.getByText('orphan-host').closest('summary')))
    expect(screen.queryByText('Boot volume')).not.toBeInTheDocument()
    expect(field(required(screen.getByText('orphan-host').closest('details')), 'Capacity (bytes)')).toHaveTextContent('—')
    expect(screen.getByText('FlashCopy lineage unavailable or not returned')).toBeInTheDocument()
  })

  it('distinguishes unavailable adapters from an empty list and tolerates untyped record values', () => {
    const data = inventory({ lpar: { ...lpar, vfc: null, ethernet: [] } })
    render(<RecoveryApplicationPowerInventory inventory={data} />)
    openLpar()
    expect(within(screen.getByRole('region', { name: 'Virtual FC adapters' })).getByText('Data unavailable')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Ethernet adapters' })).getByText('No adapters returned.')).toBeInTheDocument()
  })

  it('shows placeholders for invalid adapter and FlashCopy values while preserving raw JSON', () => {
    const data = inventory({ lpar: { vfc: [{ slot: { invalid: true }, wwpns: [7], port_name: false }], ethernet: [{ mac: 123 }] } })
    required(required(data.recovered_hosts[0]).volumes[0]).flashcopy = { map: ['invalid'], source_vdisk: { secret: 'extra-value' } }
    render(<RecoveryApplicationPowerInventory inventory={data} />)
    openLpar()
    const fc = screen.getByRole('region', { name: 'Virtual FC adapters' })
    expect(field(fc, 'Slot')).toHaveTextContent('—')
    expect(field(fc, 'WWPNs')).toHaveTextContent('—')
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument()
    fireEvent.click(required(screen.getByText('orphan-host').closest('summary')))
    const host = required(screen.getByText('orphan-host').closest('details'))
    expect(field(host, 'FlashCopy map')).toHaveTextContent('—')
    fireEvent.click(within(host).getByText('Response body'))
    expect(within(host).getByText(/extra-value/)).toBeInTheDocument()
  })

  it('keeps partially read hosts with no volumes and distinguishes an empty inventory', () => {
    const data = inventory()
    data.tiers = []
    required(data.recovered_hosts[0]).active_ports = null
    required(data.recovered_hosts[0]).volumes = []
    render(<RecoveryApplicationPowerInventory inventory={data} />)
    fireEvent.click(required(screen.getByText('orphan-host').closest('summary')))
    expect(field(required(screen.getByText('orphan-host').closest('details')), 'Active ports')).toHaveTextContent('—')
    expect(screen.getAllByText('No inventory items were returned.')).toHaveLength(2)
  })

  it('retains the same vdisk mapped to different hosts and a reported missing host', () => {
    const data = inventory()
    data.recovered_hosts.push({ ...required(data.recovered_hosts[0]), host: 'second-host', exists: false })
    render(<RecoveryApplicationPowerInventory inventory={data} />)
    for (const name of ['orphan-host', 'second-host']) {
      fireEvent.click(required(screen.getByText(name).closest('summary')))
      const host = required(screen.getByText(name).closest('details'))
      expect(field(host, 'Vdisk ID')).toHaveTextContent('5')
    }
    expect(screen.getByText('Host does not exist')).toBeInTheDocument()
  })

  it('keeps native disclosures keyboard focusable', async () => {
    render(<RecoveryApplicationPowerInventory inventory={inventory()} />)
    const tier = required(screen.getByText('Database').closest('summary'))
    await userEvent.tab()
    expect(tier).toHaveFocus()
    // jsdom does not implement native summary keyboard activation; the browser
    // check verifies Enter/Space. Opening here lets us check the next focus stop.
    fireEvent.click(tier)
    await userEvent.tab()
    const summary = required(screen.getByText('db01 → dr_db01').closest('summary'))
    expect(summary).toHaveFocus()
  })
})
