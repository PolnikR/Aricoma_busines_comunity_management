import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RealmSettingsSection } from './RealmSettingsSection'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('RealmSettingsSection', () => {
  it('shows only the five approved realm tabs and preview realm context', async () => {
    render(<RealmSettingsSection tabId="general" onTabChange={vi.fn()} />)
    const tabs = within(screen.getByRole('tablist', { name: 'Realm settings sections' }))
    expect(tabs.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['General', 'Login', 'User profile', 'Email', 'Themes'])
    expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByDisplayValue('abco')).toBeInTheDocument()
    expect(screen.getByDisplayValue('ABCO')).toBeInTheDocument()
    expect(screen.getByText(/Preview only/)).toBeInTheDocument()
  })

  it('separates user and admin event persistence settings', async () => {
    render(<RealmSettingsSection tabId="events" onTabChange={vi.fn()} />)
    expect(await screen.findByRole('heading', { name: 'User event settings' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Admin event settings' })).toBeInTheDocument()
    expect(screen.getByText('User event settings not connected')).toBeInTheDocument()
    expect(screen.getByText('Admin event settings not connected')).toBeInTheDocument()
  })

  it('delegates nested URL tab selection', async () => {
    const onTabChange = vi.fn()
    render(<RealmSettingsSection tabId="general" onTabChange={onTabChange} />)
    await userEvent.click(screen.getByRole('tab', { name: 'User profile' }))
    expect(onTabChange).toHaveBeenCalledWith('user-profile')
  })

  it('renders safe preview settings for login, profile, email, and themes', async () => {
    const { rerender } = render(<RealmSettingsSection tabId="login" onTabChange={vi.fn()} />)
    expect(await screen.findByRole('checkbox', { name: 'User registration' })).toBeInTheDocument()
    expect(screen.getByText(/Changes stay in this preview/)).toBeInTheDocument()

    rerender(<RealmSettingsSection tabId="user-profile" onTabChange={vi.fn()} />)
    expect(await screen.findByRole('row', { name: /Username/ })).toHaveTextContent('Required')
    expect(screen.getByRole('row', { name: /Email/ })).toHaveTextContent('User editable')

    rerender(<RealmSettingsSection tabId="email" onTabChange={vi.fn()} />)
    expect(await screen.findByDisplayValue('smtp.example.invalid')).toBeInTheDocument()
    expect(screen.queryByDisplayValue(/password|secret/i)).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('Not exposed')).toBeInTheDocument()

    rerender(<RealmSettingsSection tabId="themes" onTabChange={vi.fn()} />)
    expect(await screen.findByDisplayValue('abco')).toBeInTheDocument()
  })
})
