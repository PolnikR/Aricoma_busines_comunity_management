import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DagTemplateVersionSelect } from './DagTemplateVersionSelect'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const templates = [
  { platform: 'ibm_power', version: 'v1', default: false, description: 'Legacy server description' },
  { platform: 'ibm_power', version: 'release-2027', default: true, description: 'Current server description' },
]
const props = { platform: 'ibm_power', value: null, templates, isLoading: false, error: null, disabled: false, onChange: vi.fn(), onRetry: vi.fn() }

describe('DagTemplateVersionSelect', () => {
  it('keeps backend default null and displays its server description', async () => {
    const onChange = vi.fn()
    render(<DagTemplateVersionSelect {...props} onChange={onChange} />)
    const select = screen.getByRole('combobox')
    expect(select).toHaveValue('')
    expect(screen.getByText('Current server description')).toBeInTheDocument()
    await userEvent.selectOptions(select, 'v1')
    expect(onChange).toHaveBeenLastCalledWith('v1')
    await userEvent.selectOptions(select, '')
    expect(onChange).toHaveBeenLastCalledWith(null)
  })
  it('preserves an unknown version visibly and offers a deliberate default selection', async () => {
    const onChange = vi.fn()
    render(<DagTemplateVersionSelect {...props} value="removed" onChange={onChange} />)
    expect(screen.getByRole('combobox')).toHaveValue('removed')
    expect(screen.getByRole('alert')).toHaveTextContent('removed')
    await userEvent.selectOptions(screen.getByRole('combobox'), '')
    expect(onChange).toHaveBeenCalledWith(null)
  })
  it('exposes Retry on errors and keeps explicit selection intact', async () => {
    const onRetry = vi.fn()
    render(<DagTemplateVersionSelect {...props} templates={[]} value="saved" error={new Error('offline')} onRetry={onRetry} />)
    expect(screen.getByRole('combobox')).toHaveValue('saved')
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
  it('disables selection while loading and read-only', () => {
    render(<DagTemplateVersionSelect {...props} disabled isLoading />)
    expect(screen.getByRole('combobox')).toBeDisabled()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
  it.each([[], templates.slice(0, 1), templates.map(template => ({ ...template, default: true }))].map(catalog => ({ catalog })))('warns for empty or invalid defaults: %j', ({ catalog }) => {
    render(<DagTemplateVersionSelect {...props} templates={catalog} />)
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
  })
})
