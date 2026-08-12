import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { JsonViewerModal } from './JsonViewerModal'

afterEach(cleanup)

describe('JsonViewerModal', () => {
  it('renders formatted JSON and uses the supplied localized close label', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <JsonViewerModal
        open
        title="Provider JSON"
        data={{ provider_id: 'vmware-01', enabled: true }}
        closeLabel="Zavrieť"
        onClose={onClose}
      />,
    )

    const dialog = screen.getByRole('dialog', { name: 'Provider JSON' })
    expect(dialog).toHaveTextContent('"provider_id": "vmware-01"')
    expect(dialog).toHaveTextContent('"enabled": true')

    await user.click(screen.getByRole('button', { name: 'Zavrieť' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders nothing while closed', () => {
    render(
      <JsonViewerModal
        open={false}
        title="Provider JSON"
        data={{ id: 'vmware-01' }}
        closeLabel="Close"
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
