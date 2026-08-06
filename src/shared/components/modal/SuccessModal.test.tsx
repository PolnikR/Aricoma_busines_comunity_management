import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SuccessModal } from './SuccessModal'

describe('SuccessModal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the message while open and calls onClose after the duration elapses', () => {
    const onClose = vi.fn()
    render(
      <SuccessModal
        open
        onClose={onClose}
        message="Recovery group was successfully registered with airflow id run-123"
        durationMs={2000}
      />,
    )

    expect(screen.getByText('Recovery group was successfully registered with airflow id run-123')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    vi.advanceTimersByTime(2000)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders nothing when closed', () => {
    render(<SuccessModal open={false} onClose={vi.fn()} message="Done" />)
    expect(screen.queryByText('Done')).not.toBeInTheDocument()
  })
})
