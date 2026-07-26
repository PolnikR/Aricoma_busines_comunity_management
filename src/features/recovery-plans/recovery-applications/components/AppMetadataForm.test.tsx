import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppMetadataForm } from './AppMetadataForm'

describe('AppMetadataForm', () => {
  it('renders initial values and reports each metadata change', async () => {
    const user = userEvent.setup()
    const onMetadataChange = vi.fn()
    render(<AppMetadataForm
      initialValues={{ name: 'Finance', description: 'Primary', environment: 'dev' }}
      onMetadataChange={onMetadataChange}
    />)

    const name = screen.getByLabelText('Application Name *')
    await user.clear(name)
    await user.type(name, 'Billing')
    await user.selectOptions(screen.getByLabelText('Environment *'), 'prod')

    expect(name).toHaveValue('Billing')
    expect(onMetadataChange).toHaveBeenLastCalledWith({ environment: 'prod' })
    expect(onMetadataChange).toHaveBeenCalledWith({ name: 'Billing' })
  })
})
