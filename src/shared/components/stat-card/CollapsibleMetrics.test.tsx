import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CollapsibleMetrics } from './CollapsibleMetrics'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const KEY = 'test.metrics-collapsed'
const items = [
  { label: 'Discovered VMs', value: '36', helper: 'Validated inventory', icon: <span /> },
  { label: 'Allocated memory', value: '424 GB', helper: '150 total vCPU', icon: <span /> },
]

describe('CollapsibleMetrics', () => {
  beforeEach(() => { localStorage.clear() })

  it('shows the collapsed summary strip by default', () => {
    render(<CollapsibleMetrics items={items} storageKey={KEY} />)

    const toggle = screen.getByRole('button', { name: /36 Discovered VMs.*424 GB Allocated memory.*Show details/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.queryByText('Validated inventory')).not.toBeInTheDocument()
  })

  it('expands to stat cards, collapses again and remembers the choice', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<CollapsibleMetrics items={items} storageKey={KEY} />)

    await user.click(screen.getByRole('button', { name: /Show details/ }))
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getByText('Validated inventory')).toBeInTheDocument()
    const hide = screen.getByRole('button', { name: 'Hide stats' })
    expect(hide).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById(hide.getAttribute('aria-controls') ?? '')).not.toBeNull()

    unmount()
    render(<CollapsibleMetrics items={items} storageKey={KEY} />)
    expect(screen.getAllByRole('article')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Hide stats' }))
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(localStorage.getItem(KEY)).toBe('true')
  })

  it('keeps labels in the strip while values load', () => {
    render(<CollapsibleMetrics items={items} storageKey={KEY} isLoading />)

    const toggle = screen.getByRole('button', { name: /Discovered VMs/ })
    expect(toggle).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('36')).not.toBeInTheDocument()
  })
})
