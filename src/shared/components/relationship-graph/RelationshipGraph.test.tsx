import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { AlertTriangleIcon, ServerIcon, StorageIcon } from '@/shared/icons/Icons'
import {
  RelationshipChain,
  RelationshipConnector,
  RelationshipGraph,
  RelationshipGroup,
  RelationshipNode,
  RelationshipNote,
  type RelationshipDirection,
} from '.'

afterEach(cleanup)

const edges = [
  { from: 'compute', to: 'storage' },
  { from: 'storage', to: 'partner' },
  { from: 'compute-2', to: 'storage' },
]

// Two rows; the storage entity is rendered in both of them.
function Graph({ partnerDirection = 'both' }: { partnerDirection?: RelationshipDirection }) {
  return (
    <RelationshipGraph edges={edges}>
      <RelationshipGroup title="Compute providers">
        <RelationshipChain>
          <RelationshipNode entityId="compute" icon={ServerIcon} tone="compute" name="vCenter" monoId="vcenter-01" description="backing storage Flash 01" />
          <RelationshipConnector from="compute" to="storage" kind="backing" label="Backing storage" />
          <RelationshipNode entityId="storage" icon={StorageIcon} tone="storage" name="Flash 01" description="backs vCenter, partner Flash 02" />
          <RelationshipConnector from="storage" to="partner" kind="partner" direction={partnerDirection} label="Partner" srLabel="mutual partner" />
          <RelationshipNode entityId="partner" icon={StorageIcon} tone="storage" name="Flash 02" description="partner Flash 01" />
        </RelationshipChain>
        <RelationshipChain>
          <RelationshipNode entityId="compute-2" icon={ServerIcon} tone="compute" name="Branch vCenter" description="backing storage Flash 01" />
          <RelationshipConnector from="compute-2" to="storage" kind="backing" label="Backing storage" />
          <RelationshipNode entityId="storage" icon={StorageIcon} tone="storage" name="Flash 01" description="backs Branch vCenter" />
          <RelationshipNote span={2}>No partner</RelationshipNote>
        </RelationshipChain>
      </RelationshipGroup>
    </RelationshipGraph>
  )
}

const node = (name: string) => screen.getAllByRole('group', { name })
const connectors = () => [...document.querySelectorAll<HTMLElement>('[data-edge-kind]')]
const line = (connector: HTMLElement) => connector.querySelector('[data-connector-line]')
const label = (connector: HTMLElement) => connector.querySelector('[data-connector-label]')

describe('RelationshipGraph', () => {
  it('renders each node as a focusable labelled group with its icon chip, tone and relationship description', () => {
    render(<Graph />)
    const [vcenter] = node('vCenter')
    if (!vcenter) throw new Error('vCenter node not rendered')

    expect(vcenter).toHaveAttribute('tabIndex', '0')
    expect(vcenter).toHaveAccessibleDescription('backing storage Flash 01')
    expect(vcenter.querySelector('[data-node-icon]')).toHaveClass('bg-surface-muted', 'text-text-secondary')
    expect(vcenter.querySelector('[data-node-icon] svg')).toHaveAttribute('aria-hidden', 'true')
    expect(vcenter).toHaveTextContent('vcenter-01')
    expect(node('Flash 01')[0]?.querySelector('[data-node-icon]')).toHaveClass('bg-accent-soft', 'text-accent')
    expect(screen.getByRole('list', { name: 'Compute providers' }).children).toHaveLength(2)
  })

  it('renders a problem node with a dashed error border, alert chip and mono name', () => {
    render(
      <RelationshipGraph edges={[]}>
        <RelationshipNode entityId="problem:missing" icon={AlertTriangleIcon} tone="problem" name="missing-fs" description="unresolved" />
      </RelationshipGraph>,
    )
    const problem = screen.getByRole('group', { name: 'missing-fs' })

    expect(problem).toHaveClass('border-dashed', 'border-error-500', 'bg-surface-subtle')
    expect(problem.querySelector('[data-node-icon]')).toHaveClass('bg-error-50', 'text-error-600')
    expect(screen.getByText('missing-fs')).toHaveClass('font-mono')
  })

  it('on hover keeps the node, its direct neighbours and incident edges at full strength and dims the rest', () => {
    render(<Graph />)
    const [vcenter] = node('vCenter')
    if (!vcenter) throw new Error('vCenter node not rendered')

    fireEvent.pointerEnter(vcenter)

    expect(vcenter.closest('[data-dimmed]')).toHaveAttribute('data-dimmed', 'true')
    expect(vcenter).toHaveAttribute('data-highlight', 'on')
    for (const storage of node('Flash 01')) expect(storage).toHaveAttribute('data-highlight', 'on')
    expect(node('Flash 02')[0]).toHaveClass('opacity-35')
    expect(node('Branch vCenter')[0]).toHaveClass('opacity-35')
    const [backing, partner, branchBacking] = connectors()
    if (!backing || !partner || !branchBacking) throw new Error('connectors not rendered')
    expect(backing).toHaveAttribute('data-highlight', 'on')
    expect(line(backing)).not.toHaveClass('opacity-[0.12]')
    expect(line(partner)).toHaveClass('opacity-[0.12]')
    expect(label(partner)).toHaveClass('opacity-15')
    expect(line(branchBacking)).toHaveClass('opacity-[0.12]')
  })

  it('highlights every card of a repeated entity and all its neighbours', () => {
    render(<Graph />)
    const [storage] = node('Flash 01')
    if (!storage) throw new Error('storage node not rendered')

    fireEvent.pointerEnter(storage)

    for (const name of ['vCenter', 'Flash 01', 'Flash 02', 'Branch vCenter']) {
      for (const card of node(name)) expect(card).toHaveAttribute('data-highlight', 'on')
    }
    for (const connector of connectors()) expect(connector).toHaveAttribute('data-highlight', 'on')
  })

  it('gives a repeated entity unique aria target ids per card', () => {
    render(<Graph />)
    const cards = node('Flash 01')
    const ids = cards.flatMap(card => [card.getAttribute('aria-labelledby'), card.getAttribute('aria-describedby')])
    const allIds = [...document.querySelectorAll('[id]')].map(element => element.id)

    expect(cards).toHaveLength(2)
    expect(new Set(ids).size).toBe(4)
    expect(new Set(allIds).size).toBe(allIds.length)
    expect(cards[0]).toHaveAccessibleDescription('backs vCenter, partner Flash 02')
    expect(cards[1]).toHaveAccessibleDescription('backs Branch vCenter')
  })

  it('gives keyboard focus the same highlight and restores the graph on blur', async () => {
    const user = userEvent.setup()
    render(<Graph />)
    const [vcenter] = node('vCenter')

    await user.tab()
    expect(vcenter).toHaveFocus()
    expect(node('Flash 02')[0]).toHaveAttribute('data-highlight', 'off')

    await user.tab()
    expect(node('Flash 01')[0]).toHaveFocus()
    expect(node('Flash 02')[0]).toHaveAttribute('data-highlight', 'on')

    await user.tab({ shift: true })
    await user.tab({ shift: true })
    expect(document.body).toHaveFocus()
    for (const card of screen.getAllByRole('group')) {
      expect(card).toHaveAttribute('data-highlight', 'idle')
      expect(card).not.toHaveClass('opacity-35')
    }
    expect(document.querySelector('[data-dimmed]')).toBeNull()
  })

  it('falls back from hover to the focused node when the pointer leaves', () => {
    render(<Graph />)
    const [vcenter] = node('vCenter')
    const [partner] = node('Flash 02')
    if (!vcenter || !partner) throw new Error('nodes not rendered')

    fireEvent.focus(vcenter)
    fireEvent.pointerEnter(partner)
    expect(vcenter).toHaveAttribute('data-highlight', 'off')

    fireEvent.pointerLeave(partner)
    expect(vcenter).toHaveAttribute('data-highlight', 'on')
    expect(partner).toHaveAttribute('data-highlight', 'off')
  })

  it.each([
    ['forward', ['wide-end', 'narrow-end']],
    ['backward', ['wide-start', 'narrow-start']],
    ['both', ['wide-end', 'narrow-end', 'wide-start', 'narrow-start']],
  ] as const)('draws %s tips in the wide and the narrow layout', (direction, tips) => {
    render(<Graph partnerDirection={direction} />)
    const partner = connectors()[1]
    if (!partner) throw new Error('partner connector not rendered')
    const drawn = [...partner.querySelectorAll('[data-tip]')]

    expect(partner).toHaveAttribute('data-direction', direction)
    expect(drawn.map(tip => tip.getAttribute('data-tip'))).toEqual(tips)
  })

  it('points narrow tips down for forward and up for backward, and keeps them out of the wide layout', () => {
    render(<Graph partnerDirection="both" />)
    const partner = connectors()[1]
    const tip = (name: string) => partner?.querySelector(`[data-tip="${name}"]`)

    expect(tip('narrow-end')).toHaveClass('rotate-90', 'bottom-0', '@min-[40rem]/relationship-graph:hidden')
    expect(tip('narrow-start')).toHaveClass('-rotate-90', 'top-0', '@min-[40rem]/relationship-graph:hidden')
    expect(tip('wide-end')).toHaveClass('hidden', '@min-[40rem]/relationship-graph:block')
    expect(tip('wide-start')).toHaveClass('rotate-180', 'hidden', '@min-[40rem]/relationship-graph:block')
  })

  it('colours connectors by kind, dashes problems and reads the sr label instead of the visible one', () => {
    render(
      <RelationshipGraph edges={[{ from: 'a', to: 'b' }]}>
        <RelationshipConnector from="a" to="b" kind="problem" label="Unresolved" srLabel="unresolved backing storage" />
      </RelationshipGraph>,
    )
    const [problem] = connectors()
    if (!problem) throw new Error('connector not rendered')

    expect(line(problem)).toHaveClass('text-error-500')
    expect(problem.querySelectorAll('.border-dashed')).toHaveLength(2)
    expect(label(problem)).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('unresolved backing storage')).toHaveClass('sr-only')
  })

  it('uses the orange family for partners, never warning tokens', () => {
    render(<Graph />)
    const partner = connectors()[1]
    if (!partner) throw new Error('partner connector not rendered')

    expect(line(partner)).toHaveClass('text-orange-500')
    expect(partner.outerHTML).not.toMatch(/warning-/)
  })

  it('lays rows out as a stack and switches to the chain grid through the container query', () => {
    render(<Graph />)
    const row = screen.getByRole('list', { name: 'Compute providers' }).firstElementChild

    expect(row?.closest('.\\@container\\/relationship-graph')).not.toBeNull()
    expect(row).toHaveClass('grid-cols-1', '@min-[40rem]/relationship-graph:grid-cols-[minmax(0,1fr)_7.5rem_minmax(0,1fr)_6.25rem_minmax(0,1fr)]')
    expect(screen.getByText('No partner')).toHaveClass('@min-[40rem]/relationship-graph:col-span-2')
  })
})
