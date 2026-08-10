import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VirtualMachinesToolbar } from './VirtualMachinesToolbar'
import type { VirtualMachineFilterOptions, VirtualMachineFilters } from '../../types'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

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

afterEach(cleanup)

describe('VirtualMachinesToolbar filters', () => {
  it('does not duplicate provider source selection in the filter dialog', () => {
    render(<VirtualMachinesToolbar filters={filters} options={options} onFiltersChange={vi.fn()} onReset={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Filters/i }))

    expect(screen.queryByLabelText('Provider')).not.toBeInTheDocument()
  })

  it('does not count the selected provider source as an active filter', () => {
    render(
      <VirtualMachinesToolbar
        filters={{ ...filters, providerId: 'vmware-vcenter-01' }}
        options={options}
        onFiltersChange={vi.fn()}
        onReset={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
  })

  it('applies a single selected tag', () => {
    const onFiltersChange = vi.fn()
    render(<VirtualMachinesToolbar filters={filters} options={options} availableTags={['WEB', 'DB']} onFiltersChange={onFiltersChange} onReset={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Filters/i }))

    const tagSelect = screen.getByLabelText('Tag')
    expect(screen.getByRole('option', { name: 'WEB' })).toBeInTheDocument()
    fireEvent.change(tagSelect, { target: { value: 'WEB' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ tags: ['WEB'] }))
  })
})
