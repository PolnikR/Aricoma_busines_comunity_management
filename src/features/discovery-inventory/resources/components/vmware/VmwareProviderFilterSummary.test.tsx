import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveVmwareProviderFilter } from '../../helpers/vmwareProviderFilter'
import { VmwareProviderFilterSummary } from './VmwareProviderFilterSummary'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const labels = { label: 'Provider filter', nameLabel: 'Name prefix', tagLabel: 'Tags' }
const fiveTags = ['Production', 'Managed', 'Recovery', 'Critical', 'Europe']
const group = () => screen.getByRole('group', { name: labels.label })
const trigger = (count: number) => screen.getByRole('button', { name: `Show all ${String(count)} provider tags` })

function resize(width: number) {
  act(() => {
    window.innerWidth = width
    window.dispatchEvent(new Event('resize'))
  })
}

beforeEach(() => { window.innerWidth = 1440 })
afterEach(cleanup)

describe('VmwareProviderFilterSummary', () => {
  it('renders nothing for an empty normalized provider scope', () => {
    const { container } = render(<VmwareProviderFilterSummary {...labels} filter={resolveVmwareProviderFilter({ vmPrefix: ' ', vmTags: [' ', ''] })} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows only the literal prefix without adding a wildcard or a visible group heading', () => {
    render(<VmwareProviderFilterSummary {...labels} filter={resolveVmwareProviderFilter({ vmPrefix: ' prod-* ' })} />)
    expect(group()).toHaveTextContent('Name prefix')
    expect(screen.getByText('prod-*')).toBeInTheDocument()
    expect(group()).not.toHaveTextContent('Tags')
    expect(group()).not.toHaveTextContent('Provider filter')
    expect(group()).not.toHaveTextContent('▼')
    expect(group()).not.toHaveTextContent('Any')
  })

  it('shows only the configured tag without empty prefix placeholders', () => {
    render(<VmwareProviderFilterSummary {...labels} filter={resolveVmwareProviderFilter({ vmTags: ['Managed'] })} />)
    expect(group()).toHaveTextContent('Tags')
    expect(screen.getByText('Managed')).toBeInTheDocument()
    expect(group()).not.toHaveTextContent('Name prefix')
    expect(within(group()).queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows one normalized tag and puts the remaining tag behind +1', () => {
    const filter = resolveVmwareProviderFilter({ vmPrefix: ' prod- ', vmTags: [' Managed ', 'Managed', '', 'Recovery', 'Recovery '] })
    render(<VmwareProviderFilterSummary {...labels} filter={{ ...filter, tag: 'obsolete alias' }} />)
    expect(screen.getByText('prod-')).toBeInTheDocument()
    expect(screen.getAllByText('Managed')).toHaveLength(1)
    expect(screen.queryByText('Recovery')).not.toBeInTheDocument()
    expect(screen.queryByText('obsolete alias')).not.toBeInTheDocument()
    expect(trigger(2)).toHaveTextContent('+1')
  })

  it('shows one desktop tag and one +4 trigger with every full tag in its panel', () => {
    render(<VmwareProviderFilterSummary {...labels} filter={resolveVmwareProviderFilter({ vmTags: fiveTags })} />)
    expect(within(group()).getByText('Production')).toBeInTheDocument()
    expect(within(group()).queryByText('Managed')).not.toBeInTheDocument()
    expect(within(group()).queryByText('Recovery')).not.toBeInTheDocument()
    expect(within(group()).getAllByRole('button')).toHaveLength(1)
    expect(trigger(5)).toHaveTextContent('+4')
    fireEvent.click(trigger(5))
    const panel = screen.getByRole('dialog', { name: 'Provider tags (5)' })
    expect(within(panel).getAllByRole('listitem').map(item => item.textContent)).toEqual(fiveTags)
  })

  it('counts deduplicated tags rather than the raw provider values', () => {
    render(<VmwareProviderFilterSummary {...labels} filter={resolveVmwareProviderFilter({ vmTags: [' Production ', 'Managed', 'Recovery', 'Managed', ' ', 'Production'] })} />)
    expect(trigger(3)).toHaveTextContent('+2')
    fireEvent.click(trigger(3))
    expect(within(screen.getByRole('dialog')).getAllByRole('listitem').map(item => item.textContent)).toEqual(['Production', 'Managed', 'Recovery'])
  })

  it('keeps one tag and +4 across the old 1100px boundary', () => {
    resize(1099)
    render(<VmwareProviderFilterSummary {...labels} filter={resolveVmwareProviderFilter({ vmTags: fiveTags })} />)
    expect(trigger(5)).toHaveTextContent('+4')
    expect(within(group()).queryByText('Managed')).not.toBeInTheDocument()
    resize(1100)
    expect(trigger(5)).toHaveTextContent('+4')
    expect(within(group()).queryByText('Managed')).not.toBeInTheDocument()
    expect(within(group()).getAllByRole('button')).toHaveLength(1)
  })

  it('opens and dismisses the full list by keyboard and returns focus from the panel', async () => {
    const user = userEvent.setup()
    render(<VmwareProviderFilterSummary {...labels} filter={resolveVmwareProviderFilter({ vmTags: fiveTags })} />)
    act(() => { trigger(5).focus() })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.tab()
    expect(screen.getByRole('dialog')).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger(5)).toHaveFocus()
    await user.click(trigger(5))
    await user.click(screen.getByRole('button', { name: 'Close help' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger(5)).toHaveFocus()
  })

  it('closes the previous provider panel even when the next provider has identical tags', () => {
    const filter = resolveVmwareProviderFilter({ vmTags: fiveTags })
    const { rerender } = render(<VmwareProviderFilterSummary {...labels} providerId="first" filter={filter} />)
    fireEvent.click(trigger(5))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    rerender(<VmwareProviderFilterSummary {...labels} providerId="second" filter={filter} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger(5)).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps the same trigger and logical focus while resizing a five-tag scope', () => {
    render(<VmwareProviderFilterSummary {...labels} filter={resolveVmwareProviderFilter({ vmTags: fiveTags })} />)
    const button = trigger(5)
    act(() => { button.focus() })
    resize(900)
    expect(trigger(5)).toBe(button)
    expect(button).toHaveFocus()
    expect(button).toHaveTextContent('+4')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it.each(['trigger', 'panel'])('preserves the two-tag %s and focus when resizing to desktop', (focusTarget) => {
    resize(900)
    render(<VmwareProviderFilterSummary {...labels} filter={resolveVmwareProviderFilter({ vmTags: ['Production', 'Managed'] })} />)
    act(() => { trigger(2).focus() })
    if (focusTarget === 'panel') act(() => { screen.getByRole('dialog').focus() })
    const focused = document.activeElement
    resize(1100)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(trigger(2)).toHaveTextContent('+1')
    expect(document.activeElement).toBe(focused)
  })

  it('does not steal external focus on resize', () => {
    resize(900)
    render(<><button type="button">Other control</button><VmwareProviderFilterSummary {...labels} filter={resolveVmwareProviderFilter({ vmTags: ['Production', 'Managed'] })} /></>)
    act(() => { screen.getByRole('button', { name: 'Other control' }).focus() })
    resize(1100)
    expect(screen.getByRole('button', { name: 'Other control' })).toHaveFocus()
  })

  it('keeps compact field names and long values accessible at 320px', () => {
    resize(320)
    const prefix = 'production-very-long-provider-prefix-with-literal-*'
    const tag = 'Department / European production infrastructure / Recovery required'
    render(<VmwareProviderFilterSummary {...labels} filter={resolveVmwareProviderFilter({ vmPrefix: prefix, vmTags: [tag, ...fiveTags] })} />)

    const prefixValue = within(group()).getByRole('region', { name: labels.nameLabel })
    const tagValue = within(group()).getByRole('region', { name: labels.tagLabel })
    expect(prefixValue).toHaveTextContent(prefix)
    expect(tagValue).toHaveTextContent(tag)
    act(() => { prefixValue.focus() })
    expect(prefixValue).toHaveFocus()
    act(() => { tagValue.focus() })
    expect(tagValue).toHaveFocus()
    expect(trigger(6)).toHaveTextContent('+5')
    fireEvent.click(trigger(6))
    expect(within(screen.getByRole('dialog')).getAllByRole('listitem').map(item => item.textContent)).toEqual([tag, ...fiveTags])
  })

  it('keeps long prefix and tag text available to keyboard users and screen readers', () => {
    const prefix = 'production-very-long-provider-prefix-with-literal-*'
    const tag = 'Department / European production infrastructure / Recovery required'
    render(<VmwareProviderFilterSummary {...labels} filter={resolveVmwareProviderFilter({ vmPrefix: prefix, vmTags: [tag] })} />)
    const prefixValue = screen.getByText(prefix)
    const tagValue = screen.getByText(tag)
    act(() => { prefixValue.focus() })
    expect(prefixValue).toHaveFocus()
    act(() => { tagValue.focus() })
    expect(tagValue).toHaveFocus()
    expect(group()).toHaveTextContent(prefix)
    expect(group()).toHaveTextContent(tag)
  })
})
