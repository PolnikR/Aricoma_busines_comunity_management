import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EventsSection } from './EventsSection'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('EventsSection', () => {
  it('renders user and admin audit tabs without redundant header', () => {
    const onTabChange = vi.fn()
    render(<EventsSection tabId="user-events" onTabChange={onTabChange} onOpenSettings={vi.fn()} />)

    expect(screen.getByRole('tablist', { name: 'Event audit sections' })).toBeInTheDocument()
    expect(screen.getByLabelText('User events')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search user events' })).toBeInTheDocument()
    expect(screen.getByText('No user events connected')).toBeInTheDocument()

    expect(screen.queryByRole('heading', { name: 'Events' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Review Keycloak user activity/)).not.toBeInTheDocument()
  })

  it('delegates audit tab navigation', async () => {
    const onTabChange = vi.fn()
    render(<EventsSection tabId="user-events" onTabChange={onTabChange} onOpenSettings={vi.fn()} />)

    await userEvent.click(screen.getByRole('tab', { name: 'Admin events' }))
    expect(onTabChange).toHaveBeenCalledWith('admin-events')
  })

  it('preserves onOpenSettings callback for page-level action handling', () => {
    const onOpenSettings = vi.fn()
    render(<EventsSection tabId="admin-events" onTabChange={vi.fn()} onOpenSettings={onOpenSettings} />)

    expect(screen.getByLabelText('Admin events')).toBeInTheDocument()
  })
})
