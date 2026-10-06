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

  it('opens expanded as a modal dialog with focus on Close', () => {
    const { dialog } = renderView()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('data-mode', 'expanded')
    expect(within(dialog).getByRole('button', { name: 'Close detail' })).toHaveFocus()
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
    expect(within(dialog).getByRole('button', { name: 'Compact view' })).toHaveFocus()
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

describe('DetailView modes', () => {
  it('switches to compact and back, keeping the section and its mounted content', async () => {
    const user = userEvent.setup()
    const { dialog } = renderView()
    await user.click(navItem(dialog, 'Inventory'))
    await user.click(within(dialog).getByRole('button', { name: 'Expand inventory' }))

    await user.click(within(dialog).getByRole('button', { name: 'Compact view' }))
    const compact = screen.getByRole('dialog', { name: 'Recovery group detail' })
    expect(compact).toBe(dialog)
    expect(compact).toHaveAttribute('data-mode', 'compact')
    expect(within(compact).getByRole('separator', { name: 'Resize panel' })).toBeInTheDocument()
    expect(navItem(compact, 'Inventory')).toHaveAttribute('aria-current', 'true')
    expect(within(compact).getByRole('region', { name: 'Inventory' })).toHaveTextContent('Inventory expanded')

    const expand = within(compact).getByRole('button', { name: 'Expand' })
    await user.click(expand)
    expect(dialog).toHaveAttribute('data-mode', 'expanded')
    expect(within(dialog).queryByRole('separator')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Compact view' })).toHaveFocus()
    expect(within(dialog).getByRole('region', { name: 'Inventory' })).toHaveTextContent('Inventory expanded')
  })

  it('resets to expanded on the first section after closing', async () => {
    const user = userEvent.setup()
    const { dialog, rerender } = renderView()
    await user.click(navItem(dialog, 'Technical'))
    await user.click(within(dialog).getByRole('button', { name: 'Compact view' }))

    const view = (open: boolean) => (
      <DetailView open={open} onClose={vi.fn()} title="db_and_app" ariaLabel="Recovery group detail" closeLabel="Close detail">
        <DetailViewSection id="overview" title="Overview"><p>Overview content</p></DetailViewSection>
        <DetailViewSection id="technical" title="Technical"><p>Technical content</p></DetailViewSection>
      </DetailView>
    )
    rerender(view(false))
    rerender(view(true))
    const reopened = screen.getByRole('dialog', { name: 'Recovery group detail' })
    expect(reopened).toHaveAttribute('data-mode', 'expanded')
    expect(within(reopened).getByRole('region', { name: 'Overview' })).toBeInTheDocument()
  })
})
