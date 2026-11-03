import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InventoryViewFrame } from './InventoryViewFrame'
import { InventoryPanel } from './InventoryPanel'
import { useInventoryFrame, useInventoryNavigation } from './InventoryCompositionContext'

function Scope({ label }: { label: string }) {
  const frame = useInventoryFrame()
  const navigation = useInventoryNavigation()
  const explicit = useInventoryNavigation('default')
  return <output aria-label={label}>{frame}/{navigation}/{explicit}</output>
}

describe('InventoryViewFrame', () => {
  it('scopes primary navigation separately from embedded content through feature wrappers', () => {
    render(
      <InventoryViewFrame ariaLabel="Inventory view" tabs={<Scope label="Navigation scope" />}>
        <div>
          <Scope label="Content scope" />
          <InventoryPanel ariaLabel="Rows panel" toolbar={<button type="button">Filters</button>} pagination={<div>Pagination</div>}>
            <div>Rows</div>
          </InventoryPanel>
        </div>
      </InventoryViewFrame>,
    )
    const view = screen.getByRole('region', { name: 'Inventory view' })
    expect(within(view).getByLabelText('Navigation scope')).toHaveTextContent('standalone/embedded/default')
    expect(within(view).getByLabelText('Content scope')).toHaveTextContent('embedded/default/default')
    const panel = within(view).getByRole('region', { name: 'Rows panel' })
    expect(panel).not.toHaveAttribute('data-table-surface')
    const viewport = panel.querySelector('.overflow-y-auto')
    expect(viewport).toContainElement(screen.getByText('Rows'))
    expect(viewport).not.toContainElement(screen.getByRole('button', { name: 'Filters' }))
    expect(viewport).not.toContainElement(screen.getByText('Pagination'))
  })

  it('keeps the same view region when loading content is replaced by data without tabs', () => {
    const { rerender } = render(<InventoryViewFrame ariaLabel="Inventory view"><div role="status">Loading</div></InventoryViewFrame>)
    const view = screen.getByRole('region', { name: 'Inventory view' })
    rerender(<InventoryViewFrame ariaLabel="Inventory view"><div>Loaded rows</div></InventoryViewFrame>)
    expect(screen.getByRole('region', { name: 'Inventory view' })).toBe(view)
    expect(within(view).getByText('Loaded rows')).toBeInTheDocument()
    expect(view.children).toHaveLength(1)
  })
})
