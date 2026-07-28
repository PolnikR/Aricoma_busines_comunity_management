import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResourceSidebar } from './ResourceSidebar'

const labels = {
  title: 'Available resources',
  searchPlaceholder: 'Search resources',
  loadingLabel: 'Loading resources',
  noItemsLabel: 'No resources',
  noMatchesLabel: 'No matches',
  errorTitle: 'Failed',
  staleErrorTitle: 'Latest request failed',
  staleErrorDescription: 'Showing previous data',
  retryLabel: 'Retry',
}

describe('ResourceSidebar', () => {
  it('deduplicates, sorts, filters, selects, and drags resources', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const setData = vi.fn()
    render(
      <ResourceSidebar
        {...labels}
        items={['WEB-02', 'DB-01', 'WEB-02']}
        dragDataKey="vm-name"
        onSelect={onSelect}
      />,
    )

    expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual(['DB-01', 'WEB-02'])
    fireEvent.dragStart(screen.getByRole('button', { name: 'DB-01' }), {
      dataTransfer: { setData },
    })
    expect(setData).toHaveBeenCalledWith('vm-name', 'DB-01')

    await user.clear(screen.getByRole('searchbox', { name: 'Search resources' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search resources' }), 'web')
    expect(screen.queryByRole('button', { name: 'DB-01' })).not.toBeInTheDocument()
  })
})
