import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageProvider'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { ChecklistResultDialog } from './ChecklistResultDialog'

function renderWithProviders(component: React.ReactElement) {
  return render(
    <LanguageProvider>
      <ThemeProvider>
        {component}
      </ThemeProvider>
    </LanguageProvider>,
  )
}

describe('ChecklistResultDialog', () => {
  beforeEach(() => {
    localStorage.setItem('app-language', 'en')
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )
  })
  const baseProps = {
    open: true,
    title: 'Test Dialog',
    primaryName: 'Test Item',
    subtitle: 'test-123',
    statusBar: {
      title: 'Test completed',
      status: 'success' as const,
      passedCount: 2,
      totalCount: 2,
    },
    checks: [
      { name: 'Check 1', detail: 'Details 1', status: 'ok' as const },
      { name: 'Check 2', detail: 'Details 2', status: 'ok' as const },
    ],
    responseData: { test: 'data' },
    onClose: vi.fn(),
  }

  it('renders dialog when open', () => {
    renderWithProviders(<ChecklistResultDialog {...baseProps} />)
    expect(screen.getByText('Test Item')).toBeInTheDocument()
    expect(screen.getByText('test-123')).toBeInTheDocument()
  })

  it('renders informational content without a test status or passed count', () => {
    renderWithProviders(
      <ChecklistResultDialog
        open
        title="SMTP provider"
        primaryName="Test SMTP"
        subtitle="smtp-01"
        checks={[]}
        responseData={null}
        onClose={vi.fn()}
      >
        <p>SMTP provider details</p>
      </ChecklistResultDialog>,
    )

    expect(screen.getByText('SMTP provider details')).toBeInTheDocument()
    expect(screen.queryByText(/passed/)).not.toBeInTheDocument()
  })

  it('displays status bar with passed count', () => {
    renderWithProviders(<ChecklistResultDialog {...baseProps} />)
    expect(screen.getByText('Test completed')).toBeInTheDocument()
    expect(screen.getByText('2 / 2 passed')).toBeInTheDocument()
  })

  it('does not display a pass counter if a request failed before any checks', () => {
    renderWithProviders(<ChecklistResultDialog {...baseProps} statusBar={{ title: 'Connection failed', status: 'error' }} checks={[]} responseData={null} />)
    expect(screen.getByText('Connection failed')).toBeInTheDocument()
    expect(screen.queryByText(/passed/)).not.toBeInTheDocument()
  })

  it('renders all checks', () => {
    renderWithProviders(<ChecklistResultDialog {...baseProps} />)
    expect(screen.getByText('Check 1')).toBeInTheDocument()
    expect(screen.getByText('Check 2')).toBeInTheDocument()
    expect(screen.getByText('Details 1')).toBeInTheDocument()
    expect(screen.getByText('Details 2')).toBeInTheDocument()
  })

  it('renders badges when provided', () => {
    renderWithProviders(
      <ChecklistResultDialog
        {...baseProps}
        badges={[
          { label: 'Badge 1', color: 'info' },
          { label: 'Badge 2', color: 'success' },
        ]}
      />
    )
    expect(screen.getByText('Badge 1')).toBeInTheDocument()
    expect(screen.getByText('Badge 2')).toBeInTheDocument()
  })

  it('shows retry button when onRetry provided and status is error', async () => {
    const onRetry = vi.fn()
    renderWithProviders(
      <ChecklistResultDialog
        {...baseProps}
        statusBar={{ ...baseProps.statusBar, status: 'error' }}
        onRetry={onRetry}
      />
    )
    const retryButton = await screen.findByText('Retry')
    expect(retryButton).toBeInTheDocument()
  })

  it('allows a scoped pending dialog to close through Close and Escape, but not the backdrop', async () => {
    const onClose = vi.fn()
    renderWithProviders(<ChecklistResultDialog {...baseProps} isPending allowCloseWhilePending closeOnBackdrop={false} onClose={onClose} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Close' }))
    const backdrop = document.querySelector<HTMLElement>('[aria-hidden="true"].fixed.inset-0')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop ?? document.body)
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('shows skipped checks neutrally while leaving unknown failures red', () => {
    renderWithProviders(<ChecklistResultDialog {...baseProps} checks={[
      { name: 'Skipped', status: 'skipped' },
      { name: 'Unknown', status: 'timeout' },
    ]} checksAriaLabel="Connection checks" />)

    const checks = screen.getByRole('list', { name: 'Connection checks' })
    expect(checks).toHaveTextContent('skipped')
    expect(screen.getByText('Skipped').closest('li')?.querySelector('.rounded-full')).toHaveClass('text-text-muted')
    expect(screen.getByText('Unknown').closest('li')?.querySelector('.rounded-full')).toHaveClass('text-error-600')
  })

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn()
    renderWithProviders(<ChecklistResultDialog {...baseProps} onClose={onClose} />)
    const closeButton = await screen.findByText('Close')
    closeButton.click()
    expect(onClose).toHaveBeenCalled()
  })
})
