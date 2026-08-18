import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResponseBodyViewer } from './ResponseBodyViewer'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

afterEach(cleanup)

describe('ResponseBodyViewer', () => {
  it('renders the data as formatted JSON', () => {
    const { container } = render(<ResponseBodyViewer data={{ provider_id: 'vmware-01', ok: true }} />)

    expect(container).toHaveTextContent('"provider_id": "vmware-01"')
    expect(container).toHaveTextContent('"ok": true')
  })

  it('copies the formatted JSON and shows a brief confirmation', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    render(<ResponseBodyViewer data={{ id: 'vmware-01' }} />)

    await user.click(screen.getByRole('button', { name: 'Copy' }))

    expect(writeText).toHaveBeenCalledWith(JSON.stringify({ id: 'vmware-01' }, null, 2))
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('does not throw when the clipboard API is unavailable', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })

    render(<ResponseBodyViewer data={{ id: 'vmware-01' }} />)

    await user.click(screen.getByRole('button', { name: 'Copy' }))

    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
  })
})
