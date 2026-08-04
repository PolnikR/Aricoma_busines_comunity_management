import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Textarea } from './FormControls'

describe('Textarea', () => {
  it('forwards its ref and exposes an invalid state', () => {
    const ref = createRef<HTMLTextAreaElement>()

    render(<Textarea ref={ref} aria-label="Description" invalid disabled />)

    expect(ref.current).toBe(screen.getByRole('textbox', { name: 'Description' }))
    expect(ref.current).toBeDisabled()
    expect(ref.current).toHaveAttribute('aria-invalid', 'true')
  })
})
