import { render, screen } from '@testing-library/react'
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

  it('displays status bar with passed count', () => {
    renderWithProviders(<ChecklistResultDialog {...baseProps} />)
    expect(screen.getByText('Test completed')).toBeInTheDocument()
    expect(screen.getByText('2 / 2 passed')).toBeInTheDocument()
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

  it('shows retry button when onRetry provided and status is error', () => {
    const onRetry = vi.fn()
    renderWithProviders(
      <ChecklistResultDialog
        {...baseProps}
        statusBar={{ ...baseProps.statusBar, status: 'error' }}
        onRetry={onRetry}
      />
    )
    const retryButton = screen.getByText('Retry')
    expect(retryButton).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    renderWithProviders(<ChecklistResultDialog {...baseProps} onClose={onClose} />)
    screen.getByText('Close').click()
    expect(onClose).toHaveBeenCalled()
  })
})
