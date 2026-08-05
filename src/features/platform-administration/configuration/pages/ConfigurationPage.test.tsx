import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ConfigurationPage } from './ConfigurationPage'

describe('ConfigurationPage', () => {
  it('renders the provider list with the first provider selected by default', () => {
    render(<ConfigurationPage />)

    expect(screen.getByRole('heading', { name: 'Configuration' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recovery Defender' })).toBeInTheDocument()
    expect(screen.getByLabelText('Work directory')).toHaveValue('/opt/recovery-defender/work')
  })

  it('switches the detail panel when another provider is selected', async () => {
    render(<ConfigurationPage />)

    await userEvent.click(screen.getByRole('button', { name: /VMware vCenter/ }))

    expect(screen.getByRole('heading', { name: 'VMware vCenter' })).toBeInTheDocument()
    expect(screen.getByLabelText('Work directory')).toHaveValue('/opt/vcenter-agent/work')
  })

  it('enables save only after a field changes, and disables it again after saving', async () => {
    render(<ConfigurationPage />)

    const saveButton = screen.getByRole('button', { name: 'Save changes' })
    expect(saveButton).toBeDisabled()

    const workDirectoryInput = screen.getByLabelText('Work directory')
    await userEvent.clear(workDirectoryInput)
    await userEvent.type(workDirectoryInput, '/opt/custom/work')

    expect(saveButton).toBeEnabled()

    await userEvent.click(saveButton)
    expect(saveButton).toBeDisabled()
  })

  it('resets a directory field back to its default value', async () => {
    render(<ConfigurationPage />)

    const workDirectoryInput = screen.getByLabelText('Work directory')
    await userEvent.clear(workDirectoryInput)
    await userEvent.type(workDirectoryInput, '/opt/custom/work')

    const [firstResetButton] = screen.getAllByRole('button', { name: 'Reset' })
    if (!firstResetButton) throw new Error('expected a Reset button to be rendered')
    await userEvent.click(firstResetButton)

    expect(workDirectoryInput).toHaveValue('/opt/recovery-defender/work')
  })
})
