import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FlashSystemHostSummary } from '../helpers/buildFlashSystemHostSummaries'
import {
  FlashSystemHostBadge,
} from './FlashSystemHostBadge'
import type { FlashSystemHostTooltipLabels } from './FlashSystemHostBadge'

const labels: FlashSystemHostTooltipLabels = {
  showDetails: 'Show details for host',
  hostId: 'Host ID',
  cluster: 'Cluster',
  notAssigned: 'Not assigned',
  mappedVolumes: 'Mapped volumes',
  mappedCapacity: 'Mapped capacity',
  unavailable: 'Unavailable',
  lun: 'LUN',
  showAdditionalHosts: 'Show additional hosts',
  additionalHosts: 'Additional mapped hosts',
}

const originalInnerWidth = window.innerWidth

afterEach(() => {
  vi.useRealTimers()
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth })
})

function hostSummary(volumeCount = 1): FlashSystemHostSummary {
  return {
    key: 'flash-01:0',
    providerId: 'flash-01',
    hostId: '0',
    name: 'HOST_esx',
    clusterId: 'cluster-01',
    clusterName: 'Production cluster',
    totalCapacityBytes: volumeCount * 1_000_000_000,
    mappedVolumes: Array.from({ length: volumeCount }, (_, index) => ({
      resourceId: `flash-01:volume-${String(index)}`,
      name: `Volume ${String(index + 1)}`,
      scsiId: String(index),
      capacityBytes: 1_000_000_000,
    })),
  }
}

describe('FlashSystemHostBadge', () => {
  it('opens an accessible tooltip on hover with host and volume relationships', () => {
    render(<FlashSystemHostBadge summary={hostSummary(6)} labels={labels} />)

    const badge = screen.getByRole('button', { name: 'Show details for host HOST_esx' })
    fireEvent.mouseEnter(badge)

    const tooltip = screen.getByRole('tooltip')
    expect(badge).toHaveAttribute('aria-describedby', tooltip.id)
    expect(within(tooltip).getByText('Production cluster')).toBeInTheDocument()
    expect(within(tooltip).getByText('6')).toBeInTheDocument()
    expect(within(tooltip).getByText('6 GB')).toBeInTheDocument()
    expect(within(tooltip).getByText('LUN 5')).toBeInTheDocument()
    expect(within(tooltip).getByTestId('mapped-volume-list')).toHaveClass('max-h-[120px]', 'overflow-y-auto')
  })

  it('opens by tap without triggering a parent row and closes with Escape', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(
      <div onClick={onRowClick}>
        <FlashSystemHostBadge summary={hostSummary()} labels={labels} />
      </div>,
    )

    const badge = screen.getByRole('button', { name: 'Show details for host HOST_esx' })
    await user.click(badge)

    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(onRowClick).not.toHaveBeenCalled()

    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    await user.click(badge)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    fireEvent.keyDown(badge, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('opens on keyboard focus and closes after focus leaves', () => {
    vi.useFakeTimers()
    render(<FlashSystemHostBadge summary={hostSummary()} labels={labels} />)

    const badge = screen.getByRole('button', { name: 'Show details for host HOST_esx' })
    fireEvent.focus(badge)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    fireEvent.blur(badge)
    act(() => { vi.advanceTimersByTime(121) })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('keeps the portal tooltip inside a narrow viewport', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 280 })
    render(<FlashSystemHostBadge summary={hostSummary()} labels={labels} />)

    const badge = screen.getByRole('button', { name: 'Show details for host HOST_esx' })
    vi.spyOn(badge, 'getBoundingClientRect').mockReturnValue({
      x: 250,
      y: 20,
      top: 20,
      right: 278,
      bottom: 44,
      left: 250,
      width: 28,
      height: 24,
      toJSON: () => ({}),
    })
    fireEvent.mouseEnter(badge)

    expect(screen.getByRole('tooltip')).toHaveStyle({ left: '8px', width: '264px' })
  })
})
