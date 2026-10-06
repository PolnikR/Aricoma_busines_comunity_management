import { useState } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DetailView, DetailViewSection } from '@/shared/components/detail-view'
import { HelpPopover } from '@/shared/components/help-popover/HelpPopover'
import { Modal } from './Modal'
import { openDialog } from './dialogStack'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

afterEach(cleanup)

// A table-like opener, a DetailView and a nested confirmation Modal opened from its footer,
// as in Recovery Group → Delete.
function Harness({ onDetailClose = vi.fn() }: { onDetailClose?: () => void }) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => { setDetailOpen(true) }}>Open detail</button>
      {detailOpen ? (
        <DetailView
          open
          title="Group"
          ariaLabel="Group detail"
          closeLabel="Close detail"
          onClose={() => { onDetailClose(); setDetailOpen(false) }}
          headerActions={<HelpPopover triggerLabel="Group help" title="How it works" closeLabel="Close help">text</HelpPopover>}
          footerStart={<button type="button" onClick={() => { setConfirmOpen(true) }}>Delete</button>}
        >
          <DetailViewSection id="overview" title="Overview">body</DetailViewSection>
        </DetailView>
      ) : null}
      <Modal
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false) }}
        title="Delete group?"
        footer={<><button type="button" onClick={() => { setConfirmOpen(false) }}>Cancel</button><button type="button">Confirm</button></>}
      >
        <p>This cannot be undone.</p>
      </Modal>
    </>
  )
}

const detail = () => screen.queryByRole('dialog', { name: 'Group detail' })
const confirm = () => screen.queryByRole('dialog', { name: 'Delete group?' })

async function openNested() {
  const user = userEvent.setup()
  const onDetailClose = vi.fn()
  render(<Harness onDetailClose={onDetailClose} />)
  await user.click(screen.getByRole('button', { name: 'Open detail' }))
  await user.click(within(screen.getByRole('dialog', { name: 'Group detail' })).getByRole('button', { name: 'Delete' }))
  return { user, onDetailClose }
}

describe('nested dialogs', () => {
  it('closes only the top-most dialog on Escape and restores focus at each level', async () => {
    const { user, onDetailClose } = await openNested()
    expect(confirm()).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(confirm()).not.toBeInTheDocument()
    expect(detail()).toBeInTheDocument()
    expect(onDetailClose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(detail()).not.toBeInTheDocument()
    expect(onDetailClose).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Open detail' })).toHaveFocus()
  })

  it('traps Tab in the top-most dialog only, and in the lower one again once the top closes', async () => {
    const { user } = await openNested()
    const modal = screen.getByRole('dialog', { name: 'Delete group?' })

    for (let step = 0; step < 4; step += 1) {
      await user.tab()
      expect(modal).toContainElement(document.activeElement as HTMLElement)
    }
    await user.tab({ shift: true })
    expect(modal).toContainElement(document.activeElement as HTMLElement)

    await user.keyboard('{Escape}')
    const view = screen.getByRole('dialog', { name: 'Group detail' })
    for (let step = 0; step < 6; step += 1) {
      await user.tab()
      expect(view).toContainElement(document.activeElement as HTMLElement)
    }
  })

  it('still lets the help popover take Escape first inside the DetailView', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open detail' }))
    await user.click(screen.getByRole('button', { name: 'Group help' }))
    expect(screen.getByRole('dialog', { name: 'How it works' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'How it works' })).not.toBeInTheDocument()
    expect(detail()).toBeInTheDocument()
  })
})

describe('dialogStack', () => {
  it('reports only the latest open dialog as top, and the previous one again after it is removed', () => {
    const lower = openDialog()
    const upper = openDialog()
    expect(upper.isTop()).toBe(true)
    expect(lower.isTop()).toBe(false)

    upper.remove()
    expect(lower.isTop()).toBe(true)
    upper.remove()
    expect(lower.isTop()).toBe(true)
    lower.remove()
  })

  it('keeps the order when a lower dialog closes first', () => {
    const lower = openDialog()
    const upper = openDialog()
    lower.remove()
    expect(upper.isTop()).toBe(true)
    upper.remove()
  })
})
