import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConnectionTestNotification } from './ConnectionTestNotification'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

afterEach(cleanup)

describe('ConnectionTestNotification', () => {
  it('shows a compact localized success card and opens the result with the keyboard', async () => {
    const user = userEvent.setup()
    const onViewResult = vi.fn()
    render(<ConnectionTestNotification providerName="Production Airflow" failed={false} onViewResult={onViewResult} onDismiss={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveClass('border-l-success-500')
    expect(screen.getByText('Connection successful')).toBeInTheDocument()
    expect(screen.getByText('Production Airflow')).toBeInTheDocument()
    expect(screen.queryByText(/Production Airflow is available/)).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    await user.tab()
    expect(screen.getByRole('button', { name: /View result/ })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onViewResult).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Dismiss notification' })).toHaveFocus()
  })

  it('shows failure and returns focus to the page before dismissal', () => {
    const onDismiss = vi.fn()
    render(
      <>
        <main><button type="button">Page action</button></main>
        <ConnectionTestNotification providerName="Airflow" failed onViewResult={vi.fn()} onDismiss={onDismiss} />
      </>,
    )
    expect(screen.getByRole('status')).toHaveClass('border-l-error-500')
    expect(screen.getByText('Connection test failed')).toBeInTheDocument()
    expect(screen.getByText('Airflow')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }))
    expect(screen.getByRole('button', { name: 'Page action' })).toHaveFocus()
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
