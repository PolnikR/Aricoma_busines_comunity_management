import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ClientsSection } from './ClientsSection'
import { IdentityAdminGatewayProvider } from '../services/IdentityAdminGatewayProvider'
import { createMockIdentityAdminGateway } from '../services/mockIdentityAdminGateway'
import type { IdentityAdminPreview } from '../services/identityAdminGateway'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('ClientsSection', () => {
  it('keeps client table chrome visible and skeletonizes only remote rows while loading', () => {
    const gateway = createMockIdentityAdminGateway()
    gateway.getPreview = vi.fn(() => new Promise<IdentityAdminPreview>(() => undefined))
    const { container } = render(
      <IdentityAdminGatewayProvider gateway={gateway}>
        <ClientsSection entityId={null} tabId={null} onEntityChange={vi.fn()} onTabChange={vi.fn()} />
      </IdentityAdminGatewayProvider>,
    )

    expect(screen.getByRole('searchbox', { name: 'Search clients' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Client ID' })).toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByText('No clients found')).not.toBeInTheDocument()
  })

  it('lists the preview public browser client', async () => {
    render(<ClientsSection entityId={null} tabId={null} onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(screen.getByRole('searchbox', { name: 'Search clients' })).toBeInTheDocument()
    expect(screen.getByLabelText('Clients')).toBeInTheDocument()
    expect(await screen.findByText('abcm-fe')).toBeInTheDocument()
    expect(screen.getByText('Preview only')).toBeInTheDocument()
  })

  it('shows only Settings and Roles while retaining canonical hidden client tabs', async () => {
    const onTabChange = vi.fn()
    render(<ClientsSection entityId="abcm-fe" tabId="settings" onEntityChange={vi.fn()} onTabChange={onTabChange} />)
    expect(await screen.findByRole('heading', { name: 'ABCO frontend' })).toBeInTheDocument()
    const tabs = within(screen.getByRole('tablist', { name: 'Client sections' }))
    expect(tabs.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Settings', 'Roles'])
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByDisplayValue('openid-connect')).toBeInTheDocument()
    expect(screen.getByText('Public client')).toBeInTheDocument()
    expect(screen.queryByText(/secret/i)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Roles' }))
    expect(onTabChange).toHaveBeenCalledWith('roles')
  })

  it('shows ABCO roles and their preview capability summaries', async () => {
    render(<ClientsSection entityId="abcm-fe" tabId="roles" onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(await screen.findByText('Administrator')).toBeInTheDocument()
    expect(screen.getByText('Recovery Manager')).toBeInTheDocument()
    expect(screen.getByText('Viewer')).toBeInTheDocument()
    expect(screen.getByText(/Manage users and application access/)).toBeInTheDocument()
  })
})
