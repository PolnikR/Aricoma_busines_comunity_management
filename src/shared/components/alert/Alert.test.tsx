import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Alert } from './Alert'

describe('Alert', () => {
  it('uses status semantics for informational messages', () => {
    render(<Alert title="Heads up" description="Information" />)

    expect(screen.getByRole('status')).toHaveTextContent('Heads up')
    expect(screen.getByRole('status')).toHaveTextContent('Information')
  })

  it('uses alert semantics for errors', () => {
    render(<Alert title="Save failed" variant="error" />)

    expect(screen.getByRole('alert')).toHaveTextContent('Save failed')
  })
})
