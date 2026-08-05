import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ConfigurationPage } from './ConfigurationPage'

describe('ConfigurationPage', () => {
  it('renders the runtime and session sections with default values', () => {
    render(<ConfigurationPage />)

    expect(screen.getByRole('heading', { name: 'Configuration' })).toBeInTheDocument()
    expect(screen.getByText('Runtime directories')).toBeInTheDocument()
    expect(screen.getByText('Session')).toBeInTheDocument()
    expect(screen.getByLabelText('Work directory')).toHaveValue('/opt/recovery-defender/work')
    expect(screen.getByLabelText('Temp directory')).toHaveValue('/tmp')
    expect(screen.getByLabelText('Log directory')).toHaveValue('/var/log/recovery-defender')
    expect(screen.getByLabelText('Session timeout (minutes)')).toHaveValue(30)
  })

  it('enables save only after a field changes, and disables it again after saving', async () => {
    const user = userEvent.setup()
    render(<ConfigurationPage />)

    const saveButton = screen.getByRole('button', { name: 'Save changes' })
    expect(saveButton).toBeDisabled()

    const workDirectoryInput = screen.getByLabelText('Work directory')
    await user.clear(workDirectoryInput)
    await user.type(workDirectoryInput, '/opt/custom/work')

    expect(saveButton).toBeEnabled()

    await user.click(saveButton)
    expect(saveButton).toBeDisabled()
  })

  it('discards changes on cancel', async () => {
    const user = userEvent.setup()
    render(<ConfigurationPage />)

    const workDirectoryInput = screen.getByLabelText('Work directory')
    await user.clear(workDirectoryInput)
    await user.type(workDirectoryInput, '/opt/custom/work')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByLabelText('Work directory')).toHaveValue('/opt/recovery-defender/work')
  })

  it('resets a directory field back to its default value', async () => {
    const user = userEvent.setup()
    render(<ConfigurationPage />)

    const workDirectoryInput = screen.getByLabelText('Work directory')
    await user.clear(workDirectoryInput)
    await user.type(workDirectoryInput, '/opt/custom/work')

    const [firstResetButton] = screen.getAllByRole('button', { name: 'Reset' })
    if (!firstResetButton) throw new Error('expected a Reset button to be rendered')
    await user.click(firstResetButton)

    expect(workDirectoryInput).toHaveValue('/opt/recovery-defender/work')
  })

  it('resets the session timeout back to its default value', async () => {
    const user = userEvent.setup()
    render(<ConfigurationPage />)

    const sessionTimeoutInput = screen.getByLabelText('Session timeout (minutes)')
    await user.clear(sessionTimeoutInput)
    await user.type(sessionTimeoutInput, '120')

    const resetButtons = screen.getAllByRole('button', { name: 'Reset' })
    const sessionResetButton = resetButtons[resetButtons.length - 1]
    if (!sessionResetButton) throw new Error('expected a Reset button to be rendered')
    await user.click(sessionResetButton)

    expect(sessionTimeoutInput).toHaveValue(30)
  })
})
