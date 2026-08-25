import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '@/shared/components/button/Button'
import { IdentityResourceDetailPage, IdentityResourceHeader, IdentitySettingsSection } from './IdentityResourceLayout'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('IdentityResourceLayout', () => {
  it('renders resource header context with shared actions and back navigation', async () => {
    const onBack = vi.fn()
    render(
      <IdentityResourceHeader
        eyebrow="Manage"
        title="alice.smith"
        description="alice@example.com"
        backLabel="Users"
        onBack={onBack}
        actions={<Button size="sm">Action</Button>}
      />,
    )

    expect(screen.getByRole('heading', { name: 'alice.smith' })).toBeInTheDocument()
    expect(screen.getByText('Manage')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Users' }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('composes the shared Tabs component within a providers-style content panel', async () => {
    const onTabChange = vi.fn()
    render(
      <IdentityResourceDetailPage
        title="Client"
        tabs={[{ value: 'settings', label: 'Settings' }, { value: 'roles', label: 'Roles' }]}
        tabId="settings"
        onTabChange={onTabChange}
        tabAriaLabel="Client sections"
      >
        <div>Settings content</div>
      </IdentityResourceDetailPage>,
    )

    expect(screen.getByRole('tablist', { name: 'Client sections' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(screen.getByRole('tab', { name: 'Roles' }))
    expect(onTabChange).toHaveBeenCalledWith('roles')
  })

  it('renders consistent settings section hierarchy without duplicating form controls', () => {
    render(<IdentitySettingsSection title="General settings" description="Realm-wide values"><input aria-label="Existing shared control seam" /></IdentitySettingsSection>)

    expect(screen.getByRole('heading', { name: 'General settings' })).toBeInTheDocument()
    expect(screen.getByText('Realm-wide values')).toBeInTheDocument()
  })
})
