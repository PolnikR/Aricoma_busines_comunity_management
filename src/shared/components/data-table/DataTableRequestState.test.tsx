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
  it('keeps cached content visible and shows a compact refresh error when data exists', () => {
    render(
      <DataTableRequestState error={error} hasData>
        <Child />
      </DataTableRequestState>,
    )

    expect(screen.getByText('cached rows')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Latest refresh failed')
  })

  it('shows the blocking error instead of content when no data exists', () => {
    render(
      <DataTableRequestState error={error} hasData={false}>
        <Child />
      </DataTableRequestState>,
    )

    expect(screen.queryByText('cached rows')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Latest refresh failed')
  })
})
