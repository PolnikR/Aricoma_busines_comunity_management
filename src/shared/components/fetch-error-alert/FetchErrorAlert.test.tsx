import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FetchErrorAlert } from './FetchErrorAlert'

afterEach(cleanup)

  describe('FetchErrorAlert', () => {
  it('renders an initial fetch failure with its technical description', () => {
    render(
      <FetchErrorAlert
        title="Infrastructure topology could not be loaded"
        description="Connection refused"
        onRetry={() => undefined}
        retryLabel="Retry loading"
        variant="full"
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Infrastructure topology could not be loaded')
    expect(screen.getByRole('alert')).toHaveTextContent('Connection refused')
    expect(screen.getByRole('button', { name: 'Retry loading' })).toBeEnabled()
  })

  it('calls the retry action from the compact alert', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    render(
      <FetchErrorAlert
        title="Latest request failed"
        description="Showing the previous successful page."
        onRetry={onRetry}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('disables retry and exposes progress while fetching', () => {
    render(
      <FetchErrorAlert
        title="Latest request failed"
        onRetry={() => undefined}
        isRetrying
      />,
    )

    expect(screen.getByRole('alert')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Retrying' })).toBeDisabled()
  })
})
