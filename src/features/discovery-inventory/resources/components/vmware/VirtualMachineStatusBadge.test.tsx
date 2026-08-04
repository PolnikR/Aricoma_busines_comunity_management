import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VirtualMachineStatusBadge } from './VirtualMachineStatusBadge'

describe('VirtualMachineStatusBadge', () => {
  it.each([
    ['poweredOn', 'power'],
    ['connected', 'connection'],
    ['toolsOk', 'tools'],
  ] as const)('renders the %s state', (value, kind) => {
    render(<VirtualMachineStatusBadge value={value} kind={kind} />)
    expect(screen.getByText(value)).toBeInTheDocument()
  })

  it('renders unknown states without dropping their value', () => {
    render(<VirtualMachineStatusBadge value="unknown" kind="connection" />)
    expect(screen.getByText('unknown')).toBeInTheDocument()
  })
})
