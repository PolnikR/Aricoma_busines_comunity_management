import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResponseBodyViewer } from './ResponseBodyViewer'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

afterEach(cleanup)

describe('ResponseBodyViewer', () => {
  it('shows the header label and expands the JSON on click', () => {
    const { container } = render(<ResponseBodyViewer data={{ id: 'vmware-01' }} />)

    expect(screen.getByText('Response body')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Response body'))

    expect(container).toHaveTextContent('"id": "vmware-01"')
  })

  it('starts expanded when defaultOpen is set, with no click needed', () => {
    const { container } = render(<ResponseBodyViewer data={{ id: 'vmware-01' }} defaultOpen />)

    expect(container).toHaveTextContent('"id": "vmware-01"')
  })

  it('shows the schema caption only when schemaTypeName is provided', () => {
    const { rerender } = render(<ResponseBodyViewer data={{ id: 'vmware-01' }} defaultOpen />)
    expect(screen.queryByText('Matches')).not.toBeInTheDocument()

    rerender(<ResponseBodyViewer data={{ id: 'vmware-01' }} defaultOpen schemaTypeName="ProviderTestResponse" />)
    expect(screen.getByText('Matches')).toBeInTheDocument()
    expect(screen.getByText('ProviderTestResponse')).toBeInTheDocument()
  })

  it('copies the formatted JSON and shows a brief confirmation', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    render(<ResponseBodyViewer data={{ id: 'vmware-01' }} defaultOpen />)

    await user.click(screen.getByRole('button', { name: 'Copy' }))

    expect(writeText).toHaveBeenCalledWith(JSON.stringify({ id: 'vmware-01' }, null, 2))
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('does not throw when the clipboard API is unavailable', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })

    render(<ResponseBodyViewer data={{ id: 'vmware-01' }} defaultOpen />)

    await user.click(screen.getByRole('button', { name: 'Copy' }))

    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
  })
})
