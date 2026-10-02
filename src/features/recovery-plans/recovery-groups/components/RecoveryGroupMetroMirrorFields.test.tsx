import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { RecoveryGroupMetroMirrorFields } from './RecoveryGroupMetroMirrorFields'
vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
const props = { value: '001', onChange: vi.fn(), loading: false, error: null, onRetry: vi.fn(), warning: '', unresolvedCount: 0, missingGroup: false, mismatch: false }
describe('RecoveryGroupMetroMirrorFields', () => {
  it('counts current missing fields without treating discovery warnings as missing user input', () => {
    const { rerender } = render(<RecoveryGroupMetroMirrorFields {...props} value="" missingNamesCount={2} />)
    expect(screen.getByRole('button', { name: /Review configuration/ })).toHaveTextContent('(3)')
    rerender(<RecoveryGroupMetroMirrorFields {...props} missingNamesCount={0} unresolvedCount={2} missingGroup mismatch />)
    expect(screen.getByRole('button', { name: 'Review configuration' })).not.toHaveTextContent('(3)')
  })

  it('opens a review drawer outside the form and restores focus without changing the group value', async () => {
    render(<RecoveryGroupMetroMirrorFields {...props} unresolvedCount={5} missingGroup mismatch />)
    const summary = screen.getByRole('button', { name: 'Review configuration' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText(/Volumes without an unambiguous auxiliary name: 5/)).not.toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(summary)
    const drawer = screen.getByRole('dialog', { name: 'Configuration review' })
    expect(drawer.parentElement).toBe(document.body)
    expect(screen.getByText(/Volumes without an unambiguous auxiliary name: 5/)).toBeVisible()
    expect(screen.getByText('Your values differ from discovery. Your edits have been kept.')).toBeVisible()
    expect(screen.getByLabelText('Consistency group ID')).toHaveValue('001')
    await user.click(within(drawer).getByRole('button', { name: 'Metro Mirror review help' }))
    expect(within(drawer).getByRole('dialog', { name: 'What this review checks' })).toHaveTextContent('Use existing relationship')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Configuration review' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(summary).toHaveFocus()
  })

  it('exposes an editable controlled group and preserves an intentional empty input', () => {
    render(<RecoveryGroupMetroMirrorFields {...props} />)
    fireEvent.change(screen.getByLabelText('Consistency group ID'), { target: { value: '' } })
    expect(props.onChange).toHaveBeenCalledWith('')
  })
  it('allows editing during loading and exposes retry on failure', () => {
    render(<RecoveryGroupMetroMirrorFields {...props} loading error={new Error('offline')} />)
    expect(screen.getByLabelText('Consistency group ID')).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Review configuration' }))
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(props.onRetry).toHaveBeenCalled()
  })
  it('renders backend warnings as text', () => {
    render(<RecoveryGroupMetroMirrorFields {...props} warning={'<b>warning</b>'} />)
    fireEvent.click(screen.getByRole('button', { name: 'Review configuration' }))
    expect(screen.getByText('<b>warning</b>')).toBeInTheDocument()
  })
})
