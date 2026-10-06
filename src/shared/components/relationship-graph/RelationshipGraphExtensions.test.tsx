import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CopyIcon, DiskIcon } from '@/shared/icons/Icons'
import {
  RelationshipChain,
  RelationshipConnector,
  RelationshipGraph,
  RelationshipGroup,
  RelationshipLanes,
  RelationshipNode,
  type RelationshipDirection,
} from '.'

afterEach(cleanup)

const edges = [
  { from: 'a1', to: 'b1' }, { from: 'b1', to: 'c1' },
  { from: 'a2', to: 'b2' }, { from: 'b2', to: 'c2' },
]

interface GraphProps {
  activeEntityId?: string | null
  onActiveEntityChange?: (id: string | null) => void
  onActivate?: () => void
}

// Two independent three-node rows in the compact, soft, component-scoped presentation.
function Graph({ activeEntityId, onActiveEntityChange, onActivate }: GraphProps) {
  const row = (n: 1 | 2) => (
    <RelationshipChain layout="leading">
      <RelationshipNode entityId={`a${String(n)}`} icon={DiskIcon} tone="storage" name={`master_${String(n)}`} description={`master ${String(n)}`} />
      <RelationshipConnector from={`a${String(n)}`} to={`b${String(n)}`} kind="replication" label="Replica" value={`${String(n * 30)} %`} progress={n * 30} />
      <RelationshipNode entityId={`b${String(n)}`} icon={DiskIcon} tone="storage" name={`aux_VOLUME_${String(n)}`} nameLines={2} description={`aux ${String(n)}`} onActivate={onActivate} activateLabel={`Show aux ${String(n)}`} />
      <RelationshipConnector from={`b${String(n)}`} to={`c${String(n)}`} kind="protection" label="Copies" />
      <RelationshipNode entityId={`c${String(n)}`} icon={CopyIcon} tone="protection" name="2 copies" description={`copies ${String(n)}`} />
    </RelationshipChain>
  )
  return (
    <RelationshipGraph edges={edges} density="compact" dimming="soft" highlightScope="component" activeEntityId={activeEntityId} onActiveEntityChange={onActiveEntityChange}>
      <RelationshipGroup title="Rows" header={<RelationshipLanes layout="leading" labels={['Source', null, 'Replica', null, 'Copies']} />}>
        {row(1)}
        {row(2)}
      </RelationshipGroup>
    </RelationshipGraph>
  )
}

const highlight = (entityId: string) => document.querySelector(`[data-entity-id="${entityId}"]`)?.getAttribute('data-highlight')
const connector = (kind: string, index = 0) => [...document.querySelectorAll<HTMLElement>(`[data-edge-kind="${kind}"]`)][index]

function Single({ direction, progress, lineStyle, kind = 'replication', value, note }: {
  direction?: RelationshipDirection; progress?: number; lineStyle?: 'solid' | 'dashed'; kind?: 'replication' | 'protection' | 'neutral'; value?: string; note?: string
}) {
  return (
    <RelationshipGraph edges={[{ from: 'x', to: 'y' }]}>
      <RelationshipConnector from="x" to="y" kind={kind} label="Link" direction={direction} progress={progress} lineStyle={lineStyle} value={value} note={note} />
    </RelationshipGraph>
  )
}

describe('RelationshipGraph extensions', () => {
  it('highlights the whole connected row in component scope and softens other rows to 60 %', () => {
    render(<Graph />)
    fireEvent.pointerEnter(screen.getByRole('group', { name: 'master_1' }))

    for (const id of ['a1', 'b1', 'c1']) expect(highlight(id)).toBe('on')
    for (const id of ['a2', 'b2', 'c2']) expect(highlight(id)).toBe('off')
    expect(screen.getByRole('group', { name: 'master_2' })).toHaveClass('opacity-60')
    expect(screen.getByRole('group', { name: 'master_2' })).not.toHaveClass('opacity-35')
    expect(connector('protection', 0)).toHaveAttribute('data-highlight', 'on')
    expect(connector('protection', 1)).toHaveClass('opacity-60')
    expect(screen.getByRole('group', { name: 'master_1' })).toHaveClass('border-accent/45')
  })

  it('takes an external active entity, lets the pointer win, and ignores ids it does not draw', () => {
    const { rerender } = render(<Graph activeEntityId="b2" />)
    expect(highlight('a2')).toBe('on')
    expect(highlight('a1')).toBe('off')

    fireEvent.pointerEnter(screen.getByRole('group', { name: 'master_1' }))
    expect(highlight('a1')).toBe('on')
    expect(highlight('a2')).toBe('off')
    fireEvent.pointerLeave(screen.getByRole('group', { name: 'master_1' }))
    expect(highlight('a2')).toBe('on')

    rerender(<Graph activeEntityId="not-drawn" />)
    for (const id of ['a1', 'a2', 'c1']) expect(highlight(id)).toBe('idle')
  })

  it('reports the internally hovered or focused entity', () => {
    const onChange = vi.fn()
    render(<Graph onActiveEntityChange={onChange} />)
    fireEvent.pointerEnter(screen.getByRole('group', { name: 'master_2' }))
    expect(onChange).toHaveBeenLastCalledWith('a2')
    fireEvent.pointerLeave(screen.getByRole('group', { name: 'master_2' }))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('renders an actionable node as a button with its description and keeps passive nodes as groups', async () => {
    const onActivate = vi.fn()
    render(<Graph onActivate={onActivate} />)
    const button = screen.getByRole('button', { name: 'Show aux 1' })

    expect(button).toHaveAccessibleDescription('aux 1')
    expect(screen.getByRole('group', { name: 'master_1' })).toHaveAttribute('tabIndex', '0')
    await userEvent.setup().click(button)
    expect(onActivate).toHaveBeenCalledTimes(1)
    fireEvent.focus(button)
    expect(highlight('c1')).toBe('on')
  })

  it('wraps two-line names at technical separators and keeps the full name as title', () => {
    render(<Graph />)
    const name = screen.getByTitle('aux_VOLUME_1')

    expect(name).toHaveClass('line-clamp-2')
    expect(name.querySelectorAll('wbr')).toHaveLength(2)
    expect(name).toHaveTextContent('aux_VOLUME_1')
  })

  it('uses compact nodes, the leading chain grid and a lane header that hides when stacked', () => {
    render(<Graph />)
    const lanes = document.querySelector('[data-relationship-lanes]')

    expect(lanes).toHaveClass('hidden', '@min-[40rem]/relationship-graph:grid', '@min-[40rem]/relationship-graph:grid-cols-[minmax(0,1fr)_8.5rem_minmax(0,1.2fr)_4.75rem_7.75rem]')
    expect(lanes).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('list', { name: 'Rows' }).firstElementChild).toHaveClass('@min-[54rem]/relationship-graph:grid-cols-[minmax(0,0.9fr)_11.5rem_minmax(0,1.15fr)_7rem_8.5rem]')
    expect(screen.getByRole('group', { name: 'master_1' })).toHaveClass('rounded-lg', 'py-1.5')
  })

  it('colours replication with the accent and protection with the protection pink', () => {
    render(<Graph />)
    expect(connector('replication')?.querySelector('[data-connector-line]')).toHaveClass('text-accent')
    expect(connector('protection')?.querySelector('[data-connector-line]')).toHaveClass('text-theme-pink-500')
  })

  it('shows value and note and reads them when no sr label is given', () => {
    render(<Single value="72 %" note="Stopped" />)
    const link = connector('replication')
    if (!link) throw new Error('connector not rendered')

    expect(link.querySelector('[data-connector-value]')).toHaveTextContent('72 %')
    expect(link.querySelector('[data-connector-note]')).toHaveTextContent('Stopped')
    expect(link.querySelector('.sr-only')).toHaveTextContent('Link, 72 %, Stopped')
  })

  it.each([
    [72, 'forward', 'left-1'],
    [0, 'forward', 'left-1'],
    [40, 'backward', 'right-1'],
  ] as const)('fills a %s %% progress track from the %s side', (progress, direction, side) => {
    render(<Single progress={progress} direction={direction} />)
    const fill = connector('replication')?.querySelector('[data-connector-progress]')

    expect(fill).toHaveAttribute('data-connector-progress', String(progress))
    expect(fill).toHaveClass(side)
  })

  it('draws no fill without progress and dashes independently of the kind', () => {
    const { rerender } = render(<Single value="In sync" />)
    expect(connector('replication')?.querySelector('[data-connector-progress]')).toBeNull()
    expect(connector('replication')?.querySelector('.border-dashed')).toBeNull()

    rerender(<Single value="Not reported" lineStyle="dashed" />)
    expect(connector('replication')?.querySelectorAll('.border-dashed')).toHaveLength(2)
  })

  it('keeps the simple label connector unchanged when no rich content is given', () => {
    render(<Single kind="neutral" />)
    const link = connector('neutral')

    expect(link).toHaveClass('h-12', '@min-[40rem]/relationship-graph:h-5.5')
    expect(link?.querySelector('[data-connector-label]')).toHaveClass('bg-surface', 'px-1.5')
  })
})
