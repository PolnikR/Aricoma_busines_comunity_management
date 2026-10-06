import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DetailView, DetailViewSection } from '@/shared/components/detail-view'
import { HelpPopover } from './HelpPopover'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function renderHelp(width?: 'default' | 'wide') {
  return render(
    <>
      <button type="button">Before</button>
      <HelpPopover triggerLabel="Recovery group help" title="How a recovery group works" closeLabel="Close help" {...(width ? { width } : {})}>
        <p>Resources recovered together.</p>
      </HelpPopover>
      <button type="button">Outside</button>
    </>,
  )
}

function renderInDrawer(onClose = vi.fn()) {
  render(
    <DetailView
      open
      title="Group"
      ariaLabel="Group detail"
      closeLabel="Close detail"
      onClose={onClose}
      headerActions={<HelpPopover triggerLabel="Recovery group help" title="How a recovery group works" closeLabel="Close help">text</HelpPopover>}
    >
      <DetailViewSection id="overview" title="Overview">body</DetailViewSection>
    </DetailView>,
  )
  return onClose
}

const trigger = () => screen.getByRole('button', { name: 'Recovery group help' })
const panel = () => screen.queryByRole('dialog', { name: 'How a recovery group works' })

// Fake timers drive the hover delays; fireEvent keeps those tests synchronous.
function hover(element: Element) {
  fireEvent.pointerEnter(element, { pointerType: 'mouse' })
}

function unhover(element: Element) {
  fireEvent.pointerLeave(element, { pointerType: 'mouse' })
}

function wait(ms: number) {
  act(() => { vi.advanceTimersByTime(ms) })
}

describe('HelpPopover', () => {
  it('renders a labelled trigger that is closed by default', () => {
    renderHelp()
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog')
    expect(panel()).not.toBeInTheDocument()
  })

  it('opens on hover after a short delay without moving focus', () => {
    vi.useFakeTimers()
    renderHelp()
    const before = screen.getByRole('button', { name: 'Before' })
    before.focus()

    hover(trigger())
    expect(panel()).not.toBeInTheDocument()
    wait(200)

    const dialog = panel()
    expect(dialog).toHaveTextContent('Resources recovered together.')
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    expect(trigger()).toHaveAttribute('aria-controls', dialog?.id)
    expect(before).toHaveFocus()
  })

  it('stays open while the pointer moves from the trigger into the panel and closes once it leaves both', () => {
    vi.useFakeTimers()
    renderHelp()

    hover(trigger())
    wait(200)
    unhover(trigger())
    wait(100)
    hover(screen.getByText('Resources recovered together.'))
    wait(500)
    expect(panel()).toBeInTheDocument()

    unhover(screen.getByText('Resources recovered together.'))
    wait(100)
    expect(panel()).toBeInTheDocument()
    wait(200)
    expect(panel()).not.toBeInTheDocument()
  })

  it('ignores touch hover', () => {
    vi.useFakeTimers()
    renderHelp()

    fireEvent.pointerEnter(trigger(), { pointerType: 'touch' })
    wait(500)

    expect(panel()).not.toBeInTheDocument()
  })

  it('opens on keyboard focus, stays open while focus is inside and closes when focus leaves', async () => {
    const user = userEvent.setup()
    renderHelp()
    screen.getByRole('button', { name: 'Before' }).focus()

    await user.tab()
    expect(trigger()).toHaveFocus()
    expect(panel()).toBeInTheDocument()

    await user.tab()
    expect(panel()).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Close help' })).toHaveFocus()
    expect(panel()).toBeInTheDocument()

    await user.tab()
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus()
    expect(panel()).not.toBeInTheDocument()
  })

  it('keeps a hover-opened panel open while it holds focus', () => {
    vi.useFakeTimers()
    renderHelp()

    hover(trigger())
    wait(200)
    act(() => { screen.getByRole('button', { name: 'Close help' }).focus() })
    unhover(trigger())
    wait(500)

    expect(panel()).toBeInTheDocument()
  })

  it('opens on click as a touch fallback and does not toggle closed on a second click', async () => {
    const user = userEvent.setup()
    renderHelp()

    fireEvent.click(trigger())
    expect(panel()).toBeInTheDocument()

    await user.click(trigger())
    expect(panel()).toBeInTheDocument()
    expect(trigger()).toHaveFocus()
  })

  it('closes with its close button, returns focus to the trigger and does not reopen from that focus', async () => {
    const user = userEvent.setup()
    renderHelp()

    await user.click(trigger())
    await user.click(screen.getByRole('button', { name: 'Close help' }))

    expect(panel()).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()

    await user.tab({ shift: true })
    await user.tab()
    expect(trigger()).toHaveFocus()
    expect(panel()).toBeInTheDocument()
  })

  it('closes on a pointer down outside', async () => {
    const user = userEvent.setup()
    renderHelp()

    await user.click(trigger())
    await user.click(screen.getByRole('button', { name: 'Outside' }))

    expect(panel()).not.toBeInTheDocument()
  })

  it('stays open on a click inside the panel', async () => {
    const user = userEvent.setup()
    renderHelp()

    await user.click(trigger())
    await user.click(screen.getByText('Resources recovered together.'))

    expect(panel()).toBeInTheDocument()
  })

  it('closes on Escape, keeps focus on the trigger, does not reopen and keeps the key from window listeners', async () => {
    const user = userEvent.setup()
    const windowKeydown = vi.fn()
    window.addEventListener('keydown', windowKeydown)
    renderHelp()

    await user.click(trigger())
    await user.keyboard('{Escape}')

    expect(panel()).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()
    expect(windowKeydown).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }))
    window.removeEventListener('keydown', windowKeydown)
  })

  it('returns focus to the trigger when Escape is pressed inside the panel', async () => {
    const user = userEvent.setup()
    renderHelp()

    await user.click(trigger())
    await user.tab()
    expect(panel()).toHaveFocus()
    await user.keyboard('{Escape}')

    expect(panel()).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()
  })

  it('closes only itself on Escape inside a DetailView when opened by focus; the next Escape closes the detail', async () => {
    const user = userEvent.setup()
    const onClose = renderInDrawer()

    await user.click(trigger())
    await user.keyboard('{Escape}')
    expect(panel()).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.keyDown(trigger(), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes only itself on Escape inside a DetailView when opened by hover with focus elsewhere', () => {
    vi.useFakeTimers()
    const onClose = renderInDrawer()
    const closeDetail = screen.getByRole('button', { name: 'Close detail' })
    closeDetail.focus()

    hover(trigger())
    wait(200)
    expect(panel()).toBeInTheDocument()

    fireEvent.keyDown(closeDetail, { key: 'Escape' })
    expect(panel()).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(closeDetail).toHaveFocus()

    fireEvent.keyDown(closeDetail, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders the panel in a portal on document.body, outside the clipping dialog, and owns it for assistive tech', async () => {
    const user = userEvent.setup()
    renderInDrawer()

    await user.click(trigger())
    const detail = screen.getByRole('dialog', { name: 'Group detail' })
    const helpPanel = panel()
    expect(helpPanel?.parentElement).toBe(document.body)
    expect(detail).not.toContainElement(helpPanel)
    expect(helpPanel).toHaveClass('fixed')
    expect(trigger().parentElement).toHaveAttribute('aria-owns', helpPanel?.id)
  })

  it('bridges Tab through the portaled panel so the detail focus trap never takes it', async () => {
    const user = userEvent.setup()
    const onClose = renderInDrawer()
    const detail = screen.getByRole('dialog', { name: 'Group detail' })

    act(() => { trigger().focus() })
    expect(panel()).toBeInTheDocument()
    await user.tab()
    expect(panel()).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Close help' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(panel()).toHaveFocus()
    await user.tab({ shift: true })
    expect(trigger()).toHaveFocus()

    // Past the panel's last control, focus continues after the trigger in the detail.
    await user.tab()
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Close detail' })).toHaveFocus()
    expect(detail).toContainElement(document.activeElement as HTMLElement)
    expect(panel()).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('returns focus to the trigger when Escape is pressed in the portaled panel inside a detail', async () => {
    const user = userEvent.setup()
    const onClose = renderInDrawer()

    act(() => { trigger().focus() })
    await user.tab()
    expect(panel()).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(panel()).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()
    expect(onClose).not.toHaveBeenCalled()
  })

  describe('placement', () => {
    // jsdom has no layout: give the trigger and the panel fixed boxes in a 800×600 viewport.
    // clientWidth is the usable width; it is below innerWidth when a classic page scrollbar shows.
    let triggerBox = { left: 0, top: 0 }
    function layout(box: { left: number; top: number }, clientWidth = 800) {
      triggerBox = box
      vi.stubGlobal('innerWidth', 800)
      vi.stubGlobal('innerHeight', 600)
      Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: clientWidth })
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        if (this.getAttribute('role') === 'dialog') return DOMRect.fromRect({ x: 0, y: 0, width: 300, height: 400 })
        if (this.getAttribute('aria-label') === 'Recovery group help') return DOMRect.fromRect({ x: triggerBox.left, y: triggerBox.top, width: 32, height: 32 })
        return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 })
      })
    }
    afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
      Reflect.deleteProperty(document.documentElement, 'clientWidth')
    })

    it('opens below the trigger with its right edge on the trigger when there is room', () => {
      layout({ left: 400, top: 40 })
      renderHelp()
      fireEvent.click(trigger())
      // below = 600 - 72 - 8 - 8; right edge 432 → left 132
      expect(panel()).toHaveStyle({ top: '80px', left: '132px', maxHeight: '512px' })
    })

    it('flips above the trigger near the bottom edge and caps its height to the space above', () => {
      layout({ left: 400, top: 520 })
      renderHelp()
      fireEvent.click(trigger())
      // below = 32 < 400 and above = 504: top = 520 - 8 - 400
      expect(panel()).toHaveStyle({ top: '112px', left: '132px', maxHeight: '504px' })
    })

    it('stays inside the viewport near the left and right edges', () => {
      layout({ left: 20, top: 40 })
      renderHelp()
      fireEvent.click(trigger())
      expect(panel()).toHaveStyle({ left: '8px' })
      cleanup()

      layout({ left: 780, top: 40 })
      renderHelp()
      fireEvent.click(trigger())
      // right edge 812 would overflow: left = 800 - 8 - 300
      expect(panel()).toHaveStyle({ left: '492px' })
    })

    it('clamps against the usable width, not innerWidth, when a classic scrollbar shows', () => {
      layout({ left: 760, top: 40 }, 785)
      renderHelp('wide')
      fireEvent.click(trigger())
      // right edge 792 would sit under the 15 px scrollbar: left = 785 - 8 - 300, not 800 - 8 - 300
      expect(panel()).toHaveStyle({ left: '477px' })
    })

    it('follows the trigger on resize and on scroll', () => {
      layout({ left: 400, top: 40 })
      renderHelp()
      fireEvent.click(trigger())
      expect(panel()).toHaveStyle({ top: '80px', left: '132px' })

      triggerBox = { left: 300, top: 100 }
      act(() => { window.dispatchEvent(new Event('resize')) })
      expect(panel()).toHaveStyle({ top: '140px', left: '32px' })

      triggerBox = { left: 350, top: 60 }
      // A scroll in any container moves the trigger; the listener captures it.
      act(() => { document.body.dispatchEvent(new Event('scroll')) })
      expect(panel()).toHaveStyle({ top: '100px', left: '82px' })
    })
  })

  // Nominal widths share a cap relative to the fixed containing block (the usable viewport,
  // without a page scrollbar), never 100vw.
  it.each([
    [undefined, 'w-[22rem]'],
    ['wide', 'w-[55rem]'],
  ] as const)('uses its nominal width (%s) capped to the usable viewport', (width, widthClass) => {
    renderHelp(width)
    fireEvent.click(trigger())
    expect(panel()).toHaveClass(widthClass, 'max-w-[calc(100%-2rem)]', 'fixed')
    expect(panel()?.className).not.toContain('100vw')
  })
})
