import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VirtualMachineMetrics } from './VirtualMachineMetrics'

describe('VirtualMachineMetrics', () => {
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
