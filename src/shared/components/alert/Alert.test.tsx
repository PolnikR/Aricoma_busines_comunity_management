import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Alert } from './Alert'

describe('Alert', () => {
  it('keeps the full error and description in the compact size', () => {
    const message = `Provider ${'storage-'.repeat(30)} has no orchestratorConnId`
    const { rerender } = render(<Alert title={message} description="Connection details" variant="error" size="sm" />)
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('alert')).toHaveTextContent('Connection details')
    expect(screen.getByRole('alert')).toHaveClass('px-3', 'py-2')
    rerender(<Alert title={message} variant="error" />)
    expect(screen.getByRole('alert')).toHaveClass('px-4', 'py-3')
  })

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
