import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EventsSection } from './EventsSection'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('EventsSection', () => {
  it('renders user and admin audit views with shared table/search controls', async () => {
    const onTabChange = vi.fn()
    render(<EventsSection tabId="user-events" onTabChange={onTabChange} onOpenSettings={vi.fn()} />)

    expect(screen.getByRole('tablist', { name: 'Event audit sections' })).toBeInTheDocument()
    expect(screen.getByLabelText('User events')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search user events' })).toBeInTheDocument()
    expect(screen.getByText('No user events connected')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Admin events' }))
    expect(onTabChange).toHaveBeenCalledWith('admin-events')
  })

  it('links audit views to realm event persistence settings', async () => {
    const onOpenSettings = vi.fn()
    render(<EventsSection tabId="admin-events" onTabChange={vi.fn()} onOpenSettings={onOpenSettings} />)

    expect(screen.getByLabelText('Admin events')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Event settings' }))
    expect(onOpenSettings).toHaveBeenCalledOnce()
  })
})
