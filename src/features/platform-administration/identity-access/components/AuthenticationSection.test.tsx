import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IdentityAdminGatewayProvider } from '../services/IdentityAdminGatewayProvider'
import { createMockIdentityAdminGateway } from '../services/mockIdentityAdminGateway'
import { AuthenticationSection } from './AuthenticationSection'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('AuthenticationSection', () => {
  it('shows only Required actions and renders the approved preview rows by default', async () => {
    render(<AuthenticationSection tabId={null} onTabChange={vi.fn()} />)
    const tabs = within(screen.getByRole('tablist', { name: 'Authentication sections' }))
    expect(tabs.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Required actions'])
    expect(screen.getByRole('tab', { name: 'Required actions' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('row', { name: /Update Password/ })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Verify Email/ })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Update Profile/ })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Configure OTP/ })).toBeInTheDocument()
  })

  it('keeps hidden Flows deep links functional without exposing their tab', async () => {
    render(<AuthenticationSection tabId="flows" onTabChange={vi.fn()} />)
    expect(screen.queryByRole('tab', { name: 'Flows' })).not.toBeInTheDocument()
    expect(await screen.findByLabelText('Authentication flows')).toBeInTheDocument()
  })

  it('allows preview enabled and default state controls', async () => {
    render(<AuthenticationSection tabId="required-actions" onTabChange={vi.fn()} />)
    const enabled = await screen.findByRole('checkbox', { name: 'Enable Verify Email' })
    const defaultAction = screen.getByRole('checkbox', { name: 'Set Verify Email as default' })
    await userEvent.click(defaultAction)
    expect(defaultAction).toBeChecked()
    await userEvent.click(enabled)
    expect(enabled).not.toBeChecked()
  })

  it('disables required-action controls while pending and surfaces mutation failures', async () => {
    const gateway = createMockIdentityAdminGateway()
    let rejectUpdate: ((reason: Error) => void) | undefined
    gateway.updateRequiredAction = vi.fn(() => new Promise<void>((_resolve, reject) => {
      rejectUpdate = reject
    }))

    render(
      <IdentityAdminGatewayProvider gateway={gateway}>
        <AuthenticationSection tabId="required-actions" onTabChange={vi.fn()} />
      </IdentityAdminGatewayProvider>,
    )

    const enabled = await screen.findByRole('checkbox', { name: 'Enable Verify Email' })
    await userEvent.click(enabled)

    expect(enabled).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Set Verify Email as default' })).toBeDisabled()

    rejectUpdate?.(new Error('Required action update failed'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Required action could not be updated')
    expect(screen.getByRole('alert')).toHaveTextContent('Required action update failed')
    expect(enabled).not.toBeDisabled()
  })
})
