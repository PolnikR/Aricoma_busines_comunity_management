import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VirtualMachinesToolbar } from './VirtualMachinesToolbar'
import type { VirtualMachineFilterOptions, VirtualMachineFilters } from '../../types/virtualMachineTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const filters: VirtualMachineFilters = {
  search: '',
  powerState: '',
  connectionState: '',
  cluster: '',
  tags: [],
  untagged: false,
}

const options: VirtualMachineFilterOptions = {
  clusters: ['prod'],
  powerStates: ['poweredOn'],
  connectionStates: ['connected'],
}

afterEach(cleanup)

describe('VirtualMachinesToolbar source filters', () => {
  it('does not render a duplicate provider selector for the selected source tab', () => {
    render(<VirtualMachinesToolbar filters={filters} options={options} onFiltersChange={vi.fn()} onReset={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Filters/i }))

    expect(screen.queryByLabelText('Provider')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filters' })).not.toHaveTextContent('1')
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
    expect(onFiltersChange.mock.calls[0]?.[0]).not.toHaveProperty('providerId')
  })
})
