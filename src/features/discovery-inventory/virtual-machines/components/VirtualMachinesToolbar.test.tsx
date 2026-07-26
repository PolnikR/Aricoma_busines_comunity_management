import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VirtualMachinesToolbar } from './VirtualMachinesToolbar'
import type { VirtualMachineFilterOptions, VirtualMachineFilters } from '../types'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test/mockUseTranslation'))

const filters: VirtualMachineFilters = {
  search: '',
  powerState: '',
  connectionState: '',
  cluster: '',
  providerId: '',
  tags: [],
  untagged: false,
}

const options: VirtualMachineFilterOptions = {
  clusters: ['prod'],
  powerStates: ['poweredOn'],
  connectionStates: ['connected'],
}

const providers: ProviderRecord[] = [
  { id: 'vmware-vcenter-01', name: 'Production vCenter', description: '', type: 'VMWARE', ipAddress: '10.0.0.1' },
  { id: 'flashsystem-01', name: 'Backup FlashSystem', description: '', type: 'FLASHCOPY', ipAddress: '10.0.0.2' },
]

afterEach(cleanup)

  describe('VirtualMachinesToolbar provider filter', () => {
  it('lists all providers in the dropdown', () => {
    render(<VirtualMachinesToolbar filters={filters} options={options} providers={providers} onFiltersChange={vi.fn()} onReset={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Filters/i }))

    expect(screen.getByLabelText('Provider')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'All providers' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Production vCenter' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Backup FlashSystem' })).toBeInTheDocument()
  })

  it('shows a skeleton and hides filters while providers are loading', () => {
    render(<VirtualMachinesToolbar filters={filters} options={options} providers={[]} providersLoading onFiltersChange={vi.fn()} onReset={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Filters/i }))

    expect(screen.getByLabelText('Loading filters')).toBeInTheDocument()
    expect(screen.queryByLabelText('Provider')).not.toBeInTheDocument()
  })

  it('applies the selected provider', () => {
    const onFiltersChange = vi.fn()
    render(<VirtualMachinesToolbar filters={filters} options={options} providers={providers} onFiltersChange={onFiltersChange} onReset={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Filters/i }))
    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'vmware-vcenter-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ providerId: 'vmware-vcenter-01' }))
  })

  it('applies a single selected tag', () => {
    const onFiltersChange = vi.fn()
    render(<VirtualMachinesToolbar filters={filters} options={options} providers={providers} availableTags={['WEB', 'DB']} onFiltersChange={onFiltersChange} onReset={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Filters/i }))

    const tagSelect = screen.getByLabelText('Tag')
    expect(screen.getByRole('option', { name: 'WEB' })).toBeInTheDocument()
    fireEvent.change(tagSelect, { target: { value: 'WEB' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ tags: ['WEB'] }))
  })
})
