import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RealmSettingsSection } from './RealmSettingsSection'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('RealmSettingsSection', () => {
  it('renders the documented settings hierarchy with current realm context', () => {
    render(<RealmSettingsSection tabId="general" onTabChange={vi.fn()} />)
    expect(screen.getByRole('tablist', { name: 'Realm settings sections' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Security defenses' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('ABCO')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('separates user and admin event persistence settings', () => {
    render(<RealmSettingsSection tabId="events" onTabChange={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'User event settings' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Admin event settings' })).toBeInTheDocument()
    expect(screen.getByText('User event settings not connected')).toBeInTheDocument()
    expect(screen.getByText('Admin event settings not connected')).toBeInTheDocument()
  })

  it('delegates nested URL tab selection', async () => {
    const onTabChange = vi.fn()
    render(<RealmSettingsSection tabId="general" onTabChange={onTabChange} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Tokens' }))
    expect(onTabChange).toHaveBeenCalledWith('tokens')
  })
})
