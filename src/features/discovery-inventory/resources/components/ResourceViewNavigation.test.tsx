import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { ResourceSourceTab, ResourceSourceTabLabels } from '../helpers/buildResourceSourceTabs'
import { ResourceViewNavigation } from './ResourceViewNavigation'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const labels: ResourceSourceTabLabels = {
  vmware: 'VMware VMs',
  flashsystem: 'FlashSystem Volumes with a long localized label',
  'ibm-power': 'IBM Power Partitions with a long localized label',
}
const items: ResourceSourceTab[] = [
  { value: 'vmware:vcenter-01', resourceTab: 'vmware', providerId: 'vcenter-01', label: 'VMware VMs · Production' },
  { value: 'vmware:vcenter-02', resourceTab: 'vmware', providerId: 'vcenter-02', label: 'VMware VMs · Recovery' },
  { value: 'flashsystem:storage-03', resourceTab: 'flashsystem', providerId: 'storage-03', label: 'FlashSystem Volumes · Storage' },
  { value: 'ibm-power:hmc-04', resourceTab: 'ibm-power', providerId: 'hmc-04', label: 'IBM Power Partitions · HMC' },
]
const tags = ['Production', 'Managed', 'Recovery', 'Critical', 'Europe']
const provider: ProviderRecord = {
  id: 'vcenter-01', name: 'Production', type: 'VMWARE', role: 'source', credentialStatus: 'none',
}
const summary = () => screen.getByRole('group', { name: 'Provider filter' })
const showTags = () => screen.getByRole('button', { name: 'Show all 5 provider tags' })

beforeEach(() => { window.innerWidth = 1440 })

describe('ResourceViewNavigation', () => {
  it('keeps full accessible provider labels and compact badges beside the resource labels', () => {
    render(<ResourceViewNavigation items={items} labels={labels} value="vmware:vcenter-01" onChange={vi.fn()} />)

    const navigation = screen.getByRole('tablist', { name: 'Inventory source' })
    expect(within(navigation).getAllByRole('tab')).toHaveLength(4)
    expect(within(navigation).getByRole('tab', { name: 'VMware VMs · Production' })).toHaveAttribute('aria-selected', 'true')
    expect(within(navigation).getByRole('tab', { name: 'VMware VMs · Recovery' })).toHaveTextContent('vm-02')
    const flash = within(navigation).getByRole('tab', { name: 'FlashSystem Volumes · Storage' })
    expect(flash).toHaveTextContent(labels.flashsystem)
    expect(within(flash).getByText('flash-03')).toBeInTheDocument()
    const power = within(navigation).getByRole('tab', { name: 'IBM Power Partitions · HMC' })
    expect(power).toHaveTextContent(labels['ibm-power'])
    expect(within(power).getByText('power-04')).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('forwards clicked and keyboard-selected provider values', () => {
    const onChange = vi.fn()
    render(<ResourceViewNavigation items={items} labels={labels} value="vmware:vcenter-01" onChange={onChange} />)

    fireEvent.click(screen.getByRole('tab', { name: 'VMware VMs · Recovery' }))
    expect(onChange).toHaveBeenLastCalledWith('vmware:vcenter-02')
    fireEvent.keyDown(screen.getByRole('tab', { name: 'VMware VMs · Production' }), { key: 'End' })
    expect(onChange).toHaveBeenLastCalledWith('ibm-power:hmc-04')
    expect(screen.getByRole('tab', { name: 'IBM Power Partitions · HMC' })).toHaveFocus()
  })

  it('keeps full tab names and keyboard navigation with a provider scope at 320px', () => {
    window.innerWidth = 320
    const onChange = vi.fn()
    const [selectedItem, nextItem] = items
    if (!selectedItem || !nextItem) throw new Error('Expected two provider navigation fixtures')
    render(<ResourceViewNavigation items={items} labels={labels} value="vmware:vcenter-01" onChange={onChange} selectedProvider={{ ...provider, vmPrefix: 'production-', vmTags: tags }} />)

    const selected = screen.getByRole('tab', { name: selectedItem.label })
    expect(selected).toHaveAttribute('aria-selected', 'true')
    expect(selected).toHaveTextContent('vm-01')
    expect(within(summary()).getByRole('region', { name: 'Name prefix' })).toHaveTextContent('production-')
    expect(within(summary()).getByRole('region', { name: 'Tags' })).toHaveTextContent('Production')
    expect(showTags()).toHaveTextContent('+4')

    fireEvent.keyDown(selected, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('vmware:vcenter-02')
    expect(screen.getByRole('tab', { name: nextItem.label })).toHaveFocus()
  })

  it('renders fallback navigation without an invented badge or provider conditions', () => {
    render(<ResourceViewNavigation
      items={[{ value: 'vmware:none', resourceTab: 'vmware', providerId: null, label: 'VMware VMs' }]}
      labels={labels} value="vmware:none" onChange={vi.fn()} selectedProvider={null}
    />)

    expect(screen.getByRole('tab', { name: 'VMware VMs' })).toHaveTextContent('VMware VMs')
    expect(screen.queryByText('vm-none')).not.toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('omits metadata when the selected VMware provider has no configured scope', () => {
    render(<ResourceViewNavigation items={items} labels={labels} value="vmware:vcenter-01" onChange={vi.fn()} selectedProvider={{ ...provider, vmPrefix: ' ', vmTags: ['', ' '] }} />)
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('uses the literal selected provider prefix without appending a wildcard', () => {
    render(<ResourceViewNavigation items={items} labels={labels} value="vmware:vcenter-01" onChange={vi.fn()} selectedProvider={{ ...provider, vmPrefix: ' prod-* ' }} />)
    expect(within(summary()).getByRole('region', { name: 'Name prefix' })).toHaveTextContent('prod-*')
    expect(summary()).not.toHaveTextContent('prod-**')
    expect(summary()).not.toHaveTextContent('Tags')
    expect(summary()).toHaveAttribute('data-provider-scope', 'vcenter-01')
  })

  it('shows a selected target provider tag without an empty prefix placeholder', () => {
    render(<ResourceViewNavigation items={items} labels={labels} value="vmware:vcenter-01" onChange={vi.fn()} selectedProvider={{ ...provider, role: 'target', vmTags: [' Recovery '] }} />)
    expect(within(summary()).getByRole('region', { name: 'Tags' })).toHaveTextContent('Recovery')
    expect(summary()).not.toHaveTextContent('Name prefix')
  })

  it('shows the full normalized selected scope through the compact tag popover', () => {
    render(<ResourceViewNavigation items={items} labels={labels} value="vmware:vcenter-01" onChange={vi.fn()} selectedProvider={{ ...provider, vmPrefix: 'prod-', vmTags: [...tags, ' Production ', ''] }} />)
    expect(summary()).toHaveTextContent('prod-')
    expect(showTags()).toHaveTextContent('+4')
    fireEvent.click(showTags())
    expect(within(screen.getByRole('dialog', { name: 'Provider tags (5)' })).getAllByRole('listitem').map(item => item.textContent)).toEqual(tags)
  })

  it('closes the old provider popover when selection changes even with identical scope', () => {
    const selected = { ...provider, vmTags: tags }
    const { rerender } = render(<ResourceViewNavigation items={items} labels={labels} value="vmware:vcenter-01" onChange={vi.fn()} selectedProvider={selected} />)
    fireEvent.click(showTags())
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    rerender(<ResourceViewNavigation items={items} labels={labels} value="vmware:vcenter-02" onChange={vi.fn()} selectedProvider={{ ...selected, id: 'vcenter-02' }} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(showTags()).toHaveAttribute('aria-expanded', 'false')
    expect(summary()).toHaveAttribute('data-provider-scope', 'vcenter-02')
    expect(screen.getByRole('tab', { name: 'VMware VMs · Recovery' })).toHaveAttribute('aria-selected', 'true')
  })

  it.each([
    { value: 'flashsystem:storage-03', selectedProvider: { ...provider, id: 'storage-03', type: 'FLASHCOPY' as const, vmPrefix: 'stale-' } },
    { value: 'ibm-power:hmc-04', selectedProvider: { ...provider, id: 'hmc-04', type: 'IBM_POWER' as const, vmTags: tags } },
    { value: 'flashsystem:storage-03', selectedProvider: { ...provider, vmPrefix: 'stale-' } },
    { value: 'vmware:vcenter-02', selectedProvider: { ...provider, vmPrefix: 'previous-provider-' } },
  ])('does not show VMware metadata for a nonmatching selected record ($value)', ({ value, selectedProvider }) => {
    render(<ResourceViewNavigation items={items} labels={labels} value={value} onChange={vi.fn()} selectedProvider={selectedProvider} />)
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Show all/ })).not.toBeInTheDocument()
  })
})
