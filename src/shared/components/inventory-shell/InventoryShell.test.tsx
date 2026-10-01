import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InventoryShell } from './InventoryShell'

function renderShell(surfaceMinHeightClassName?: string) {
  render(
    <InventoryShell inventoryTitle="Inventory records" {...(surfaceMinHeightClassName ? { surfaceMinHeightClassName } : {})}>
      <div>Rows</div>
    </InventoryShell>,
  )
  const section = screen.getByRole('region', { name: 'Inventory records' })
  return { section, root: section.parentElement }
}

describe('InventoryShell', () => {
  it('shrinks without a lower bound by default, so contained pages fit the viewport', () => {
    const { section, root } = renderShell()

    expect(root).toHaveClass('flex', 'flex-1', 'flex-col', 'gap-4', 'lg:min-h-0')
    expect(section).toHaveClass('flex', 'flex-1', 'flex-col', 'lg:min-h-0')
  })

  it('replaces the lg shrink with the given card floor and lets the root grow to hold it', () => {
    const { section, root } = renderShell('lg:min-h-[480px]')

    expect(section).toHaveClass('flex', 'flex-1', 'flex-col', 'lg:min-h-[480px]')
    expect(section).not.toHaveClass('lg:min-h-0')
    expect(root).toHaveClass('flex', 'flex-1', 'flex-col', 'gap-4')
    expect(root).not.toHaveClass('lg:min-h-0')
  })
})
