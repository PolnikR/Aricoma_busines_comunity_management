import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DagTemplateVersionSelect } from './DagTemplateVersionSelect'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const props = {
  id: 'group-version', translationPrefix: 'recovery.application.lifecycle', platform: 'flashcopy',
  value: null, templates: [
    { platform: 'flashcopy', version: 'v1', default: false, description: 'Legacy' },
    { platform: 'flashcopy', version: 'future', default: true, description: 'Backend default' },
  ], isLoading: false, error: null, disabled: false, onRetry: vi.fn(), onChange: vi.fn(),
}

describe('shared DAG template selector', () => {
  it('uses the supplied label target and backend default, and maps deliberate default selection to null', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<DagTemplateVersionSelect {...props} onChange={onChange} />)
    const select = screen.getByLabelText('DAG Template Version')
    expect(select).toHaveAttribute('id', 'group-version')
    expect(select).toHaveValue('future')
    expect(within(select).getAllByRole('option')).toHaveLength(2)
    await userEvent.selectOptions(select, 'v1')
    expect(onChange).toHaveBeenLastCalledWith('v1')
    rerender(<DagTemplateVersionSelect {...props} value="v1" onChange={onChange} />)
    await userEvent.selectOptions(select, 'future')
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('preserves unknown values and blocks direct callbacks when disabled', () => {
    const onChange = vi.fn()
    render(<DagTemplateVersionSelect {...props} value="removed" disabled onChange={onChange} />)
    expect(screen.getByRole('combobox')).toHaveValue('removed')
    expect(screen.getByRole('alert')).toHaveTextContent('removed')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'v1' } })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps explicit configuration visible during a failed catalog request and supports retry', async () => {
    const onRetry = vi.fn()
    render(<DagTemplateVersionSelect {...props} templates={[]} value="saved" error={new Error('offline')} onRetry={onRetry} />)
    expect(screen.getByRole('combobox')).toHaveValue('saved')
    expect(screen.getByRole('combobox')).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
