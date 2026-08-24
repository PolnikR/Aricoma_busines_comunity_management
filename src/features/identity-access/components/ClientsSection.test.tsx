import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ClientsSection } from './ClientsSection'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('ClientsSection', () => {
  it('uses shared search/table controls for the integration-gated client list', () => {
    render(<ClientsSection entityId={null} tabId={null} onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(screen.getByRole('searchbox', { name: 'Search clients' })).toBeInTheDocument()
    expect(screen.getByLabelText('Clients')).toBeInTheDocument()
    expect(screen.getByText('No clients connected')).toBeInTheDocument()
  })

  it('renders the full client workspace and delegates nested tab navigation', async () => {
    const onTabChange = vi.fn()
    render(<ClientsSection entityId="abco-console" tabId="settings" onEntityChange={vi.fn()} onTabChange={onTabChange} />)
    expect(screen.getByRole('heading', { name: 'abco-console' })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Client sections' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(screen.getByRole('tab', { name: 'Client scopes' }))
    expect(onTabChange).toHaveBeenCalledWith('client-scopes')
  })
})
