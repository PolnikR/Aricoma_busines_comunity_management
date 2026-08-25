import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DataTableRequestState } from './DataTableRequestState'

const error = {
  title: 'Latest refresh failed',
  description: 'Showing previous data',
  retryLabel: 'Retry',
  isRetrying: false,
  onRetry: vi.fn(),
}

function Child() {
  return <div>cached rows</div>
}

describe('DataTableRequestState', () => {
  it('keeps cached content mounted and shows a compact refresh error when cached data exists', () => {
    render(
      <DataTableRequestState error={error} hasCachedData>
        <Child />
      </DataTableRequestState>,
    )

    expect(screen.getByText('cached rows')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Latest refresh failed')
    expect(screen.getByText('Showing previous data')).toBeInTheDocument()
  })

  it('shows the blocking error instead of content when no cached data exists', () => {
    render(
      <DataTableRequestState error={error} hasCachedData={false}>
        <Child />
      </DataTableRequestState>,
    )

    expect(screen.queryByText('cached rows')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Latest refresh failed')
  })
})
