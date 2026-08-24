import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IdentityProvidersSection } from './IdentityProvidersSection'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('IdentityProvidersSection', () => {
  it('groups protocol and social provider types without fabricating configured providers', () => {
    render(<IdentityProvidersSection entityId={null} tabId={null} onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'User-defined and protocol providers' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Social providers' })).toBeInTheDocument()
    expect(screen.getByText('OpenID Connect v1.0')).toBeInTheDocument()
    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText('No configured identity providers')).toBeInTheDocument()
  })

  it('does not render redundant top-level section header in list view', () => {
    render(<IdentityProvidersSection entityId={null} tabId={null} onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(screen.queryByRole('heading', { name: 'Identity providers' })).not.toBeInTheDocument()
  })

  it('renders Settings and Mappers for configured-provider detail routes', async () => {
    const onTabChange = vi.fn()
    render(<IdentityProvidersSection entityId="corporate-oidc" tabId="settings" onEntityChange={vi.fn()} onTabChange={onTabChange} />)
    expect(screen.getByRole('tablist', { name: 'Identity provider sections' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Mappers' }))
    expect(onTabChange).toHaveBeenCalledWith('mappers')
  })

  it('renders detail resource header on entity detail view', () => {
    render(<IdentityProvidersSection entityId="corporate-oidc" tabId="settings" onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'corporate-oidc' })).toBeInTheDocument()
  })
})
