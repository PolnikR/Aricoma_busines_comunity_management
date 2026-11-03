import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DetailView, DetailViewSection } from '@/shared/components/detail-view'
import { ReferenceDeleteNotice } from './ReferenceDeleteNotice'
import type { ReferenceDeleteIssue } from '../hooks/useReferenceProtectedDelete'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('ReferenceDeleteNotice', () => {
  it('lists every blocking name and ID by type without rendering HTML', () => {
    render(<ReferenceDeleteNotice issue={{ type: 'inUse', consumers: {
      policySets: [{ id: 'ps-1', name: 'Same' }, { id: 'ps-2', name: 'Same' }],
      groups: [{ id: 'g', name: '<script>Group</script>' }], applications: [{ id: 'a', name: 'Application' }],
    } }} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog', { name: 'Cannot delete an item that is in use' })
    for (const text of ['Policy Sets', 'Recovery Groups', 'Recovery Applications', 'ps-1', 'ps-2', 'g', 'a', '<script>Group</script>']) {
      expect(within(dialog).getByText(text, { exact: true })).toBeVisible()
    }
    expect(dialog.querySelector('script')).toBeNull()
  })

  it('distinguishes failed sources and shows the reason without an empty assertion', () => {
    render(<ReferenceDeleteNotice issue={{ type: 'checkFailed', failures: [
      { source: 'groups', error: new Error('Access denied') }, { source: 'applications', error: new Error('Offline') },
    ] }} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: 'Could not verify usage' })).toBeVisible()
    expect(screen.getByText('Recovery Groups')).toBeVisible()
    expect(screen.getByText('Recovery Applications')).toBeVisible()
    expect(screen.getByText('Access denied')).toBeVisible()
    expect(screen.queryByText('This Policy Set is not used by any Recovery Group or Recovery Application.')).not.toBeInTheDocument()
  })

  it('keeps a long result in its own modal and returns focus to the still-open detail', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [issue, setIssue] = useState<ReferenceDeleteIssue | null>(null)
      return <>
        <DetailView open onClose={() => undefined} title="Policy Set" ariaLabel="Policy Set detail" closeLabel="Close detail"
          footerStart={<button onClick={() => { setIssue({ type: 'inUse', consumers: { policySets: Array.from({ length: 60 }, (_, n) => ({ id: `set-${String(n)}`, name: `Policy Set ${String(n)}` })), groups: [], applications: [] } }) }}>Delete</button>}
          footer={<button>Edit</button>}>
          <DetailViewSection id="overview" title="Overview">Existing overview</DetailViewSection>
        </DetailView>
        <ReferenceDeleteNotice issue={issue} onClose={() => { setIssue(null) }} />
      </>
    }
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const result = screen.getByRole('dialog', { name: 'Cannot delete an item that is in use' })
    expect(within(result).getAllByRole('listitem')).toHaveLength(60)
    expect(result).toHaveClass('max-h-[90vh]')
    expect(screen.getByText('set-59').closest('.overflow-y-auto')).not.toBeNull()
    const close = within(result).getByRole('button', { name: 'Close' })
    expect(close).toHaveFocus()
    await user.tab()
    expect(close).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Cannot delete an item that is in use' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Policy Set detail' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeEnabled()
    expect(screen.getByText('Existing overview')).toBeVisible()
  })
})
