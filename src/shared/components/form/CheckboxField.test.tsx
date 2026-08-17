import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CheckboxField } from './FormControls'

describe('CheckboxField', () => {
  it('associates the label and forwards checkbox changes', () => {
    const onChange = vi.fn()
    render(<CheckboxField label="Datastores" checked={false} onChange={onChange} />)

    fireEvent.click(screen.getByRole('checkbox', { name: 'Datastores' }))
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('forwards the disabled state', () => {
    render(<CheckboxField label="Disabled filter" disabled />)
    expect(screen.getByRole('checkbox', { name: 'Disabled filter' })).toBeDisabled()
  })
})
