import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VirtualMachinesSkeleton } from './VirtualMachinesSkeleton'

describe('VirtualMachinesSkeleton', () => {
  it('renders metrics and an accessible table loading state', () => {
    const { container } = render(<VirtualMachinesSkeleton />)
    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status', { name: 'Loading virtual machines' })).toBeInTheDocument()
  })
})
