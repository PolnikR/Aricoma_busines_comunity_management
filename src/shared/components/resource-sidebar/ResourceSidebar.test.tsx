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
  it('keeps static sidebar controls mounted while only remote entries load', () => {
    render(
      <ResourceSidebar
        {...labels}
        items={[]}
        dragDataKey="vm-name"
        isLoading
      />,
    )

    expect(screen.getByRole('heading', { name: 'Available resources' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search resources' })).toBeDisabled()
    expect(screen.getByRole('status', { name: 'Loading resources' })).toBeInTheDocument()
    expect(screen.queryByText('No resources')).not.toBeInTheDocument()
  })

  it('deduplicates, sorts, filters, and exposes resources only as drag sources', async () => {
    const user = userEvent.setup()
    const setData = vi.fn()
    render(
      <ResourceSidebar
        {...labels}
        items={['WEB-02', 'DB-01', 'WEB-02']}
        dragDataKey="vm-name"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Available resources' }).parentElement?.parentElement)
      .toHaveClass('h-full', 'min-h-0', 'overflow-hidden')
    expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual(['DB-01', 'WEB-02'])
    fireEvent.dragStart(screen.getByText('DB-01'), {
      dataTransfer: { setData },
    })
    expect(setData).toHaveBeenCalledWith('vm-name', 'DB-01')

    await user.clear(screen.getByRole('searchbox', { name: 'Search resources' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search resources' }), 'web')
    expect(screen.queryByText('DB-01')).not.toBeInTheDocument()
  })
})
