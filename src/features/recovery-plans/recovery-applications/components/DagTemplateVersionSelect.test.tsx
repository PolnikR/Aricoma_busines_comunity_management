import { render, screen, within } from '@testing-library/react'
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
  it('explains Power versions even when selection is disabled without changing the value', async () => {
    const onChange = vi.fn()
    render(<DagTemplateVersionSelect {...props} disabled onChange={onChange} />)
    const help = screen.getByRole('button', { name: 'About Power DAG template version' })
    expect(help).toBeEnabled()
    expect(help.closest('label')).toBeNull()
    await userEvent.click(help)
    expect(screen.getByRole('dialog')).toHaveTextContent('Both v1 and v2 run LPAR recovery sequentially')
    expect(screen.getByRole('combobox')).toHaveValue('release-2027')
    expect(onChange).not.toHaveBeenCalled()
  })
  it('shows the BE default as the selected option exactly once, but submits null for it', async () => {
    const onChange = vi.fn()
    render(<DagTemplateVersionSelect {...props} onChange={onChange} />)
    const select = screen.getByRole('combobox')
    expect(select).toHaveValue('release-2027')
    expect(within(select).getAllByRole('option').map(option => option.textContent)).toEqual(['release-2027 (default)', 'v1'])
    expect(screen.getByText('Current server description')).toBeInTheDocument()
    await userEvent.selectOptions(select, 'v1')
    expect(onChange).toHaveBeenLastCalledWith('v1')
  })

  it('shows IBM Power v1 (default) and v2 with no duplicate v1', async () => {
    const onChange = vi.fn()
    const ibmTemplates = [
      { platform: 'ibm_power', version: 'v1', default: true, description: 'Original graph' },
      { platform: 'ibm_power', version: 'v2', default: false, description: 'Improved graph' },
    ]
    const { rerender } = render(<DagTemplateVersionSelect {...props} templates={ibmTemplates} onChange={onChange} />)
    const select = screen.getByRole('combobox')
    expect(select).toHaveValue('v1')
    expect(within(select).getAllByRole('option').map(option => option.textContent)).toEqual(['v1 (default)', 'v2'])
    await userEvent.selectOptions(select, 'v2')
    expect(onChange).toHaveBeenLastCalledWith('v2')
    rerender(<DagTemplateVersionSelect {...props} templates={ibmTemplates} value="v2" onChange={onChange} />)
    await userEvent.selectOptions(select, 'v1')
    expect(onChange).toHaveBeenLastCalledWith(null)
    rerender(<DagTemplateVersionSelect {...props} templates={ibmTemplates} value="v1" onChange={onChange} />)
    expect(select).toHaveValue('v1')
    expect(within(select).getAllByRole('option')).toHaveLength(2)
  })

  it('preserves an unknown explicit version and offers a deliberate default selection', async () => {
    const onChange = vi.fn()
    render(<DagTemplateVersionSelect {...props} value="removed" onChange={onChange} />)
    expect(screen.getByRole('combobox')).toHaveValue('removed')
    expect(screen.getByRole('alert')).toHaveTextContent('removed')
    await userEvent.selectOptions(screen.getByRole('combobox'), 'release-2027')
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('exposes Retry on errors and keeps explicit selection intact', async () => {
    const onRetry = vi.fn()
    render(<DagTemplateVersionSelect {...props} templates={[]} value="saved" error={new Error('offline')} onRetry={onRetry} />)
    expect(screen.getByRole('combobox')).toHaveValue('saved')
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('keeps a stored default version visible when refreshing a cached catalog fails', () => {
    render(<DagTemplateVersionSelect {...props} value="release-2027" error={new Error('offline')} />)
    const select = screen.getByRole('combobox')
    expect(select).toBeDisabled()
    expect(select).toHaveValue('release-2027')
    expect(within(select).getAllByRole('option').filter(option => option.getAttribute('value') === 'release-2027')).toHaveLength(1)
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
