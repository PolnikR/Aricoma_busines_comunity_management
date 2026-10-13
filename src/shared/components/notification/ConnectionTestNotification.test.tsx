import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConnectionTestNotification } from './ConnectionTestNotification'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

afterEach(cleanup)

describe('ConnectionTestNotification', () => {
  it('shows a nonblocking localized success card and opens the result on request', () => {
    const onViewResult = vi.fn()
    render(<ConnectionTestNotification providerName="Production Airflow" failed={false} onViewResult={onViewResult} onDismiss={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveClass('border-l-success-500')
    expect(screen.getByText('Connection successful')).toBeInTheDocument()
    expect(screen.getByText(/Production Airflow is available/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /View result/ }))
    expect(onViewResult).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }))
    expect(screen.getByRole('button', { name: 'Page action' })).toHaveFocus()
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
