import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UserFederationSection } from './UserFederationSection'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('UserFederationSection', () => {
  it('renders the configured-provider table in provider-style panel', () => {
    render(<UserFederationSection entityId={null} tabId={null} onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(screen.getByLabelText('User federation providers')).toBeInTheDocument()
    expect(screen.getByText('No federation providers connected')).toBeInTheDocument()
  })

  it('does not render redundant top-level section header in list view', () => {
    render(<UserFederationSection entityId={null} tabId={null} onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(screen.queryByRole('heading', { name: 'User federation' })).not.toBeInTheDocument()
  })

  it('renders Settings and Mappers for federation-provider detail routes', async () => {
    const onTabChange = vi.fn()
    render(<UserFederationSection entityId="corporate-ldap" tabId="settings" onEntityChange={vi.fn()} onTabChange={onTabChange} />)
    expect(screen.getByRole('tablist', { name: 'User federation provider sections' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Mappers' }))
    expect(onTabChange).toHaveBeenCalledWith('mappers')
  })

  it('renders detail resource header on entity detail view', () => {
    render(<UserFederationSection entityId="corporate-ldap" tabId="settings" onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'corporate-ldap' })).toBeInTheDocument()
  })
})
