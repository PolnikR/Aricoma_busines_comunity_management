import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { RecoveryGroupMetroMirrorFields } from './RecoveryGroupMetroMirrorFields'
vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
const props = { value: '001', onChange: vi.fn(), loading: false, error: null, onRetry: vi.fn(), warning: '', unresolvedCount: 0, missingGroup: false, mismatch: false }
describe('RecoveryGroupMetroMirrorFields', () => {
  it('keeps discovery details collapsed until requested without changing the group value', async () => {
    render(<RecoveryGroupMetroMirrorFields {...props} unresolvedCount={5} missingGroup mismatch />)
    const summary = screen.getByText('Check the existing Metro Mirror configuration')
    const details = summary.closest('details')
    expect(details).not.toBeNull()
    expect(details).not.toHaveAttribute('open')
    expect(screen.getByText(/Volumes without an unambiguous auxiliary name: 5/)).not.toBeVisible()
    const user = userEvent.setup()
    await user.click(summary)
    expect(details).toHaveAttribute('open')
    expect(screen.getByText(/Volumes without an unambiguous auxiliary name: 5/)).toBeVisible()
    expect(screen.getByText('Your values differ from discovery. Your edits have been kept.')).toBeVisible()
    expect(screen.getByLabelText('Consistency group ID')).toHaveValue('001')
    await user.click(summary)
    expect(details).not.toHaveAttribute('open')
  })

  it('exposes an editable controlled group and preserves an intentional empty input', () => {
    render(<RecoveryGroupMetroMirrorFields {...props} />)
    fireEvent.change(screen.getByLabelText('Consistency group ID'), { target: { value: '' } })
    expect(props.onChange).toHaveBeenCalledWith('')
  })
  it('allows editing during loading and exposes retry on failure', () => {
    render(<RecoveryGroupMetroMirrorFields {...props} loading error={new Error('offline')} />)
    expect(screen.getByLabelText('Consistency group ID')).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(props.onRetry).toHaveBeenCalled()
  })
  it('renders backend warnings as text', () => {
    render(<RecoveryGroupMetroMirrorFields {...props} warning={'<b>warning</b>'} />)
    expect(screen.getByText('<b>warning</b>')).toBeInTheDocument()
  })
})
