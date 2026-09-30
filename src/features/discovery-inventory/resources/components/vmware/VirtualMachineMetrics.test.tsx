import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESOURCE_METRICS_COLLAPSED_KEY } from '../../state/resourceMetricsPreference'
import { VirtualMachineMetrics } from './VirtualMachineMetrics'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('VirtualMachineMetrics', () => {
  beforeEach(() => { localStorage.setItem(RESOURCE_METRICS_COLLAPSED_KEY, 'false') })

  it('shows the collapsed summary when no preference is stored', () => {
    localStorage.clear()
    render(<VirtualMachineMetrics metrics={{ total: 8, poweredOn: 6, clusters: 2, totalCpu: 32, totalMemoryGb: 128 }} />)

    expect(screen.getByRole('button', { name: /8 Discovered VMs.*6 Powered on.*2 Clusters.*128 GB Allocated memory/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('keeps metric labels and icons visible while only remote values load', () => {
    render(<VirtualMachineMetrics isLoading />)

    for (const label of ['Discovered VMs', 'Powered on', 'Clusters', 'Allocated memory']) {
      expect(screen.getByText(label)).toBeVisible()
    }
    expect(screen.getAllByRole('article').every(card => card.getAttribute('aria-busy') === 'true')).toBe(true)
    expect(screen.queryByText('0% of inventory')).not.toBeInTheDocument()
  })

  it('renders totals and calculates the powered-on percentage', () => {
    render(<VirtualMachineMetrics metrics={{
      total: 8,
      poweredOn: 6,
      clusters: 2,
      totalCpu: 32,
      totalMemoryGb: 128,
    }} />)

    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('75% of inventory')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('128 GB')).toBeInTheDocument()
    expect(screen.getByText('32 total vCPU')).toBeInTheDocument()
  })

  it('reports zero percent for an empty inventory', () => {
    render(<VirtualMachineMetrics metrics={{
      total: 0,
      poweredOn: 0,
      clusters: 0,
      totalCpu: 0,
      totalMemoryGb: 0,
    }} />)

    expect(screen.getByText('0% of inventory')).toBeInTheDocument()
  })
})
