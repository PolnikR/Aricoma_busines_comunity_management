import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ClientScopesSection } from './ClientScopesSection'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('ClientScopesSection', () => {
  it('uses shared search/table controls without fabricating client scopes', () => {
    render(<ClientScopesSection entityId={null} tabId={null} onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(screen.getByRole('searchbox', { name: 'Search client scopes' })).toBeInTheDocument()
    expect(screen.getByLabelText('Client scopes')).toBeInTheDocument()
    expect(screen.getByText('No client scopes connected')).toBeInTheDocument()
  })

  it('renders Settings/Mappers/Scope detail navigation', async () => {
    const onTabChange = vi.fn()
    render(<ClientScopesSection entityId="profile" tabId="settings" onEntityChange={vi.fn()} onTabChange={onTabChange} />)
    expect(screen.getByRole('tablist', { name: 'Client scope sections' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Mappers' }))
    expect(onTabChange).toHaveBeenCalledWith('mappers')
    expect(screen.getByText(/not connected yet/i)).toBeInTheDocument()
  })
})
