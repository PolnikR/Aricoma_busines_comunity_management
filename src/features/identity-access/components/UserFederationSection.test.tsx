import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UserFederationSection } from './UserFederationSection'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('UserFederationSection', () => {
  it('renders the configured-provider table and LDAP/Kerberos add entry points', () => {
    render(<UserFederationSection entityId={null} tabId={null} onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(screen.getByLabelText('User federation providers')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add LDAP' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add Kerberos' })).toBeDisabled()
    expect(screen.getByText('No federation providers connected')).toBeInTheDocument()
  })

  it('renders Settings and Mappers for federation-provider detail routes', async () => {
    const onTabChange = vi.fn()
    render(<UserFederationSection entityId="corporate-ldap" tabId="settings" onEntityChange={vi.fn()} onTabChange={onTabChange} />)
    expect(screen.getByRole('tablist', { name: 'User federation provider sections' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Mappers' }))
    expect(onTabChange).toHaveBeenCalledWith('mappers')
  })
})
