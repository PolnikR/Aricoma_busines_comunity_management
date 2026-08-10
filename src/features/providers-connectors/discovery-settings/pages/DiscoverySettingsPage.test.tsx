import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DiscoverySettingsPage } from './DiscoverySettingsPage'

describe('DiscoverySettingsPage', () => {
  it('renders all three discovery settings sections', () => {
    render(<DiscoverySettingsPage />)

    expect(screen.getByRole('heading', { name: 'Discovery settings' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Discovery schedule' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Discovery history' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Failure notifications' })).toBeInTheDocument()
  })

  it('disables schedule controls when scheduled discovery is turned off', async () => {
    const user = userEvent.setup()
    render(<DiscoverySettingsPage />)

    await user.click(screen.getByRole('switch', { name: 'Scheduled discovery' }))

    expect(screen.getByLabelText('Discovery frequency')).toBeDisabled()
    expect(screen.getByLabelText('Discovery timezone')).toBeDisabled()
    expect(screen.getByText(/Scheduled discovery is disabled/)).toBeInTheDocument()
  })

  it('updates the summary and saves local settings changes', async () => {
    const user = userEvent.setup()
    render(<DiscoverySettingsPage />)

    const saveButton = screen.getByRole('button', { name: 'Save changes' })
    expect(saveButton).toBeDisabled()

    await user.selectOptions(screen.getByLabelText('Discovery frequency'), '6 hours')
    expect(screen.getByText('Every 6 hours')).toBeInTheDocument()
    expect(saveButton).toBeEnabled()

    await user.click(saveButton)

    expect(saveButton).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Discovery settings saved locally.')
  })

  it('shows the selected recipient email and restores saved values on cancel', async () => {
    const user = userEvent.setup()
    render(<DiscoverySettingsPage />)

    await user.selectOptions(screen.getByLabelText('Notification recipient'), 'martin')
    expect(screen.getByText('martin.horvath@example.com')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByLabelText('Notification recipient')).toHaveValue('nina')
  })
})
