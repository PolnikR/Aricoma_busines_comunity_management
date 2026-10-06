import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiIcon, GridIcon, ServerIcon } from '@/shared/icons/Icons'
import { DetailView, DetailViewSection } from './DetailView'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

function Inventory() {
  const [expanded, setExpanded] = useState(false)
  return (
    <button type="button" onClick={() => { setExpanded(true) }}>
      {expanded ? 'Inventory expanded' : 'Expand inventory'}
    </button>
  )
}

const CONTENT_CENTRE = 'left-[calc(var(--app-content-left,0px)+var(--app-content-width,100%)/2)]'
const CONTENT_CAP = 'max-w-[calc(var(--app-content-width,100%)-2rem)]'

function renderView(props: Partial<Parameters<typeof DetailView>[0]> = {}) {
  const onClose = vi.fn()
  const view = render(
    <DetailView
      open
      onClose={onClose}
      title="db_and_app"
      entityLabel="Recovery group"
      ariaLabel="Recovery group detail"
      closeLabel="Close detail"
      {...props}
    >
      {props.children ?? [
        <DetailViewSection key="overview" id="overview" title="Overview" icon={GridIcon} description="Configuration">
          <p>Overview content</p>
        </DetailViewSection>,
        <DetailViewSection key="technical" id="technical" title="Technical" icon={ApiIcon} secondary>
          <p>Technical content</p>
        </DetailViewSection>,
        <DetailViewSection key="inventory" id="inventory" title="Inventory" icon={ServerIcon} count={4} flush>
          <Inventory />
        </DetailViewSection>,
      ]}
    </DetailView>,
  )
  return { ...view, onClose, dialog: screen.getByRole('dialog', { name: 'Recovery group detail' }) }
}

const navItem = (dialog: HTMLElement, name: string) =>
  within(within(dialog).getByRole('navigation', { name: 'Sections' })).getByRole('button', { name })

describe('DetailView dialog', () => {
  it('renders nothing while closed', () => {
    render(<DetailView open={false} onClose={vi.fn()} title="X" ariaLabel="Detail" closeLabel="Close"><DetailViewSection id="a" title="A">a</DetailViewSection></DetailView>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens as a centred modal dialog with focus on Close', () => {
    const { dialog } = renderView()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveClass('top-1/2', CONTENT_CENTRE, '-translate-x-1/2', '-translate-y-1/2')
    expect(within(dialog).getByRole('button', { name: 'Close detail' })).toHaveFocus()
  })

  // AppShell publishes the content surface box; the fallbacks equal the old viewport
  // centring (left 50%, cap 100% - 2rem), so outside AppShell nothing changes. The offset is
  // always measured, never a hardcoded sidebar width.
  it('centres on the AppShell content surface with a viewport fallback', () => {
    const { dialog } = renderView()
    expect(dialog).toHaveClass(CONTENT_CENTRE, CONTENT_CAP)
    expect(dialog).not.toHaveClass('left-1/2')
    expect(dialog).not.toHaveClass('max-w-[calc(100%-2rem)]')
    // No pixel offset other than the 0px fallback.
    expect(dialog.className).not.toMatch(/[1-9]\d*px/)
  })

  it('keeps the backdrop over the whole viewport, independent of the content surface', () => {
    renderView()
    const backdrop = document.querySelector('div[aria-hidden="true"].fixed')
    expect(backdrop).toHaveClass('fixed', 'inset-0', 'z-40')
    expect(backdrop?.className).not.toContain('--app-content')
  })

  it('has a single centred mode without a mode toggle or resize handle', () => {
    const { dialog } = renderView({ headerActions: <button type="button">Help</button> })
    expect(dialog).not.toHaveAttribute('data-mode')
    expect(within(dialog).queryByRole('separator')).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Compact view' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Expand' })).not.toBeInTheDocument()
    const header = within(dialog).getByRole('heading', { level: 2 }).closest('header')
    if (!header) throw new Error('Expected the detail header')
    expect(within(header).getAllByRole('button').map(button => button.getAttribute('aria-label') ?? button.textContent)).toEqual(['Help', 'Close detail'])
  })

  it('shows entity, title, statuses and meta in the header without empty status slots', () => {
    const { dialog } = renderView({ statuses: [<span key="a">Active</span>, null, false], meta: 'Last run: success · 10s' })
    const heading = within(dialog).getByRole('heading', { level: 2, name: 'db_and_app' })
    expect(heading).toHaveClass('wrap-anywhere', 'line-clamp-2')
    expect(dialog).toHaveTextContent('Recovery group')
    expect(within(dialog).getByText('Active')).toBeInTheDocument()
    expect(within(dialog).getByText('Last run: success · 10s')).toBeInTheDocument()
    expect(heading.nextElementSibling?.children).toHaveLength(1)
  })

  it('closes on Escape, Close and the backdrop', async () => {
    const user = userEvent.setup()
    const { onClose, dialog, container } = renderView()
    fireEvent.keyDown(window, { key: 'Escape' })
    await user.click(within(dialog).getByRole('button', { name: 'Close detail' }))
    const backdrop = container.ownerDocument.querySelector('div[aria-hidden="true"].fixed')
    if (!backdrop) throw new Error('Expected the backdrop')
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('traps Tab inside the dialog', () => {
    const { dialog } = renderView({ headerActions: <button type="button">Help</button>, footer: <button type="button">Edit</button> })
    const close = within(dialog).getByRole('button', { name: 'Close detail' })
    const edit = within(dialog).getByRole('button', { name: 'Edit' })
    edit.focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(within(dialog).getByRole('button', { name: 'Help' })).toHaveFocus()
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(edit).toHaveFocus()
    close.focus()
    expect(close).toHaveFocus()
  })

  it('returns focus to the opener when it closes', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => { setOpen(true) }}>Open detail</button>
          <DetailView open={open} onClose={() => { setOpen(false) }} title="X" ariaLabel="Detail" closeLabel="Close detail">
            <DetailViewSection id="a" title="A">a</DetailViewSection>
          </DetailView>
        </>
      )
    }
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Open detail' })
    await user.click(opener)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('places header actions before Close and pins footer groups', () => {
    const { dialog } = renderView({
      headerActions: <button type="button">Help</button>,
      footerStart: <button type="button">Delete</button>,
      footer: <button type="button">Edit</button>,
    })
    const help = within(dialog).getByRole('button', { name: 'Help' })
    const close = within(dialog).getByRole('button', { name: 'Close detail' })
    expect(help.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const footer = within(dialog).getByRole('button', { name: 'Delete' }).closest('footer')
    expect(footer).toContainElement(within(dialog).getByRole('button', { name: 'Edit' }))
    expect(footer?.children[1]).toHaveClass('justify-end')
  })
})

describe('DetailView sections', () => {
  it('shows the first section by default and only one section at a time', async () => {
    const user = userEvent.setup()
    const { dialog } = renderView()
    expect(navItem(dialog, 'Overview')).toHaveAttribute('aria-current', 'true')
    expect(within(dialog).getByRole('region', { name: 'Overview' })).toHaveTextContent('Overview content')
    expect(within(dialog).queryByText('Technical content')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Expand inventory')).not.toBeInTheDocument()

    await user.click(navItem(dialog, 'Inventory'))
    expect(navItem(dialog, 'Inventory')).toHaveAttribute('aria-current', 'true')
    expect(navItem(dialog, 'Overview')).not.toHaveAttribute('aria-current')
    expect(within(dialog).getAllByRole('region')).toHaveLength(1)
    expect(within(dialog).getByRole('region', { name: 'Inventory' })).toHaveTextContent('Expand inventory')
    expect(within(dialog).queryByText('Overview content')).not.toBeInTheDocument()
  })

  it('lists secondary sections last, shows counts and the section description', () => {
    const { dialog } = renderView()
    const items = within(within(dialog).getByRole('navigation', { name: 'Sections' })).getAllByRole('button')
    expect(items.map(item => item.textContent)).toEqual(['Overview', 'Inventory4', 'Technical'])
    expect(within(dialog).getByText('Configuration')).toBeInTheDocument()
  })

  it('moves focus through the section list with arrow keys', async () => {
    const user = userEvent.setup()
    const { dialog } = renderView()
    navItem(dialog, 'Overview').focus()
    await user.keyboard('{ArrowDown}')
    expect(navItem(dialog, 'Inventory')).toHaveFocus()
    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(navItem(dialog, 'Technical')).toHaveFocus()
  })

  it('omits the navigation for a single section and skips falsy children', () => {
    const { dialog } = renderView({
      children: [
        null,
        false,
        <DetailViewSection key="only" id="only" title="Details"><p>Only content</p></DetailViewSection>,
      ],
    })
    expect(within(dialog).queryByRole('navigation')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('region', { name: 'Details' })).toHaveTextContent('Only content')
  })

  it('reads sections passed inside fragments', () => {
    const { dialog } = renderView({
      children: (
        <>
          <DetailViewSection id="a" title="First"><p>First content</p></DetailViewSection>
          <>
            <DetailViewSection id="b" title="Second"><p>Second content</p></DetailViewSection>
          </>
        </>
      ),
    })
    expect(within(within(dialog).getByRole('navigation')).getAllByRole('button').map(item => item.textContent)).toEqual(['First', 'Second'])
  })

  it('reopens on the first section after closing', async () => {
    const user = userEvent.setup()
    const { dialog, rerender } = renderView()
    await user.click(navItem(dialog, 'Technical'))

    const view = (open: boolean) => (
      <DetailView open={open} onClose={vi.fn()} title="db_and_app" ariaLabel="Recovery group detail" closeLabel="Close detail">
        <DetailViewSection id="overview" title="Overview"><p>Overview content</p></DetailViewSection>
        <DetailViewSection id="technical" title="Technical"><p>Technical content</p></DetailViewSection>
      </DetailView>
    )
    rerender(view(false))
    rerender(view(true))
    const reopened = screen.getByRole('dialog', { name: 'Recovery group detail' })
    expect(within(reopened).getByRole('region', { name: 'Overview' })).toBeInTheDocument()
  })

  it('wraps the navigation above the content on narrow screens and stacks it vertically from sm', () => {
    const { dialog } = renderView()
    const navigation = within(dialog).getByRole('navigation', { name: 'Sections' })
    expect(navigation).toHaveClass('flex-wrap', 'border-b', 'sm:w-52', 'sm:flex-col', 'sm:flex-nowrap', 'sm:border-r')
    expect(navigation.parentElement).toHaveClass('flex-col', 'sm:flex-row')
    expect(navItem(dialog, 'Technical')).toHaveClass('sm:mt-auto')
  })

  it('renders arbitrary React content and drops the padding for flush sections', async () => {
    const user = userEvent.setup()
    const { dialog } = renderView()
    expect(within(dialog).getByRole('region', { name: 'Overview' })).toHaveClass('px-(--detail-gutter)')
    await user.click(navItem(dialog, 'Inventory'))
    const region = within(dialog).getByRole('region', { name: 'Inventory' })
    expect(region).not.toHaveClass('px-(--detail-gutter)')
    await user.click(within(region).getByRole('button', { name: 'Expand inventory' }))
    expect(region).toHaveTextContent('Inventory expanded')
  })
})

describe('DetailView sizes', () => {
  it('defaults to the lg width', () => {
    const { dialog } = renderView()
    expect(dialog).toHaveAttribute('data-size', 'lg')
    expect(dialog).toHaveClass('w-[60rem]')
  })

  // The cap is the content surface width (fallback: the fixed containing block, i.e. the
  // usable viewport without a page scrollbar), the same box the dialog is centred in.
  it.each([
    ['md', 'w-[55rem]'],
    ['lg', 'w-[60rem]'],
    ['xl', 'w-[75rem]'],
  ] as const)('maps size %s to its nominal width, capped to the content surface and centred', (size, widthClass) => {
    const { dialog } = renderView({ size })
    expect(dialog).toHaveAttribute('data-size', size)
    expect(dialog).toHaveClass(widthClass, CONTENT_CAP, CONTENT_CENTRE, '-translate-x-1/2')
    expect(dialog.className).not.toContain('100vw')
  })
})

describe('DetailView section composition contract', () => {
  // A helper that returns a section is not a section: DetailView reads section props from its
  // direct (or fragment) children without rendering them. Helpers belong inside a section.
  function WrappedSection() {
    return <DetailViewSection id="wrapped" title="Wrapped"><p>Wrapped content</p></DetailViewSection>
  }

  it('ignores a helper that returns a section and warns once in development', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const children = [
      <DetailViewSection key="overview" id="overview" title="Overview"><p>Overview content</p></DetailViewSection>,
      <WrappedSection key="wrapped" />,
    ]
    const { dialog, rerender } = renderView({ children })
    rerender(
      <DetailView open onClose={vi.fn()} title="X" ariaLabel="Recovery group detail" closeLabel="Close detail">{children}</DetailView>,
    )

    expect(within(dialog).queryByRole('navigation')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Wrapped content')).not.toBeInTheDocument()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('children must be DetailViewSection elements')
    warn.mockRestore()
  })

  it('accepts helpers inside a section', () => {
    const { dialog } = renderView({
      children: (
        <DetailViewSection id="storage" title="Storage">
          <WrappedSectionContent />
        </DetailViewSection>
      ),
    })
    expect(within(dialog).getByRole('region', { name: 'Storage' })).toHaveTextContent('Backing storage info')
  })

  function WrappedSectionContent() {
    return <p>Backing storage info</p>
  }
})
