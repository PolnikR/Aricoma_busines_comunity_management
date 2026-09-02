import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LanguageContext, type Language } from '@/contexts/LanguageContext'
import czechTranslations from '@/locales/cs.json'
import englishTranslations from '@/locales/en.json'
import { AccessLogsQueryToolbar } from './AccessLogsQueryToolbar'

function renderToolbar(
  overrides: Partial<ComponentProps<typeof AccessLogsQueryToolbar>> = {},
  language: Language = 'en',
) {
  const onFiltersChange = vi.fn()
  const onDensityChange = vi.fn()
  render(
    <LanguageContext.Provider value={{
      language,
      setLanguage: vi.fn(),
      translations: language === 'cs' ? czechTranslations : englishTranslations,
    }}>
      <AccessLogsQueryToolbar
        filters={{ lines: 200, status: 500, method: 'GET', pathContains: '/health' }}
        onFiltersChange={onFiltersChange}
        density="comfortable"
        onDensityChange={onDensityChange}
        {...overrides}
      />
    </LanguageContext.Provider>,
  )
  return { onFiltersChange, onDensityChange }
}

describe('AccessLogsQueryToolbar', () => {
  it('renders search, density and filter controls from the active Czech translation context', async () => {
    const user = userEvent.setup()
    renderToolbar({}, 'cs')

    expect(screen.getByRole('searchbox', { name: 'Hledat v přístupových lozích podle cesty' })).toHaveValue('/health')
    expect(screen.getByRole('group', { name: 'Hustota řádků' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'pohodlný' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'kompaktní' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Filtry/ }))

    const dialog = screen.getByRole('dialog', { name: 'Filtrovat přístupové logy' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByLabelText('Řádky')).toBeInTheDocument()
    expect(screen.getByLabelText('Stav')).toBeInTheDocument()
    expect(screen.getByLabelText('Metoda')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vymazat vše' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aplikovat' })).toBeInTheDocument()
  })

  it('applies the path search immediately without opening the filter dialog', async () => {
    const user = userEvent.setup()
    const { onFiltersChange } = renderToolbar({ filters: { lines: 200 } })

    await user.type(screen.getByRole('searchbox', { name: 'Search access logs by path' }), '/')

    expect(onFiltersChange).toHaveBeenCalledExactlyOnceWith({ lines: 200, pathContains: '/' })
  })

  it('counts the applied filters on the filter trigger', () => {
    renderToolbar()

    expect(screen.getByRole('button', { name: 'Filters 3' })).toBeInTheDocument()
  })

  it('discards dialog edits that were not applied', async () => {
    const user = userEvent.setup()
    const { onFiltersChange } = renderToolbar()

    await user.click(screen.getByRole('button', { name: /Filters/ }))
    await user.clear(screen.getByLabelText('Method'))
    await user.type(screen.getByLabelText('Method'), 'POST')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onFiltersChange).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /Filters/ }))
    expect(screen.getByLabelText('Method')).toHaveValue('GET')
  })

  it('keeps draft values isolated until Apply submits a normalized filter snapshot', async () => {
    const user = userEvent.setup()
    const { onFiltersChange } = renderToolbar()
    await user.click(screen.getByRole('button', { name: /Filters/ }))

    const linesInput = screen.getByLabelText('Lines')
    const statusInput = screen.getByLabelText('Status')
    const methodInput = screen.getByLabelText('Method')
    await user.clear(linesInput)
    await user.type(linesInput, '300')
    await user.clear(statusInput)
    await user.type(statusInput, '404')
    await user.clear(methodInput)
    await user.type(methodInput, ' post ')

    expect(onFiltersChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onFiltersChange).toHaveBeenCalledOnce()
    expect(onFiltersChange).toHaveBeenCalledWith({
      lines: 300,
      status: 404,
      method: 'POST',
      pathContains: '/health',
    })
  })

  it.each([
    { lines: '0', message: 'Lines must be between 1 and 5000.' },
    { lines: '5001', message: 'Lines must be between 1 and 5000.' },
  ])('rejects an out-of-range Lines draft of $lines', async ({ lines, message }) => {
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByRole('button', { name: /Filters/ }))

    const linesInput = screen.getByLabelText('Lines')
    await user.clear(linesInput)
    await user.type(linesInput, lines)

    expect(linesInput).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled()
  })

  it('requires Status to be an optional integer', async () => {
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByRole('button', { name: /Filters/ }))

    const statusInput = screen.getByLabelText('Status')
    await user.clear(statusInput)
    await user.type(statusInput, '404.5')

    expect(statusInput).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Status must be an integer.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled()
  })

  it('clears filters to the server defaults', async () => {
    const user = userEvent.setup()
    const { onFiltersChange } = renderToolbar()
    await user.click(screen.getByRole('button', { name: /Filters/ }))

    await user.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(onFiltersChange).toHaveBeenCalledOnce()
    expect(onFiltersChange).toHaveBeenCalledWith({ lines: 200 })
    expect(screen.getByLabelText('Lines')).toHaveValue(200)
    expect(screen.getByLabelText('Status')).toHaveValue(null)
    expect(screen.getByLabelText('Method')).toHaveValue('')
  })

  it('exposes labelled density choices and dispatches changes', async () => {
    const user = userEvent.setup()
    const { onDensityChange } = renderToolbar()

    expect(screen.getByRole('group', { name: 'Row density' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'comfortable' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'compact' }))

    expect(onDensityChange).toHaveBeenCalledWith('compact')
  })
})
