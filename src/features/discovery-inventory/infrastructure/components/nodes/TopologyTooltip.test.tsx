import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TopologyTooltip, TopologyTooltipField } from './TopologyTooltip'

describe('TopologyTooltip', () => {
  it('portals content and positions it beside the node', () => {
    const ref = createRef<HTMLElement>()
    const node = document.createElement('div')
    node.getBoundingClientRect = () => ({
      top: 20, right: 120, bottom: 70, left: 20, width: 100, height: 50,
      x: 20, y: 20, toJSON: () => ({}),
    })
    Object.defineProperty(ref, 'current', { value: node })
    render(
      <TopologyTooltip nodeRef={ref} estimatedHeight={100}>
        <TopologyTooltipField label="Host" value="host-1" />
      </TopologyTooltip>,
    )
    expect(screen.getByText('Host:')).toBeInTheDocument()
    expect(screen.getByText('host-1').parentElement?.parentElement).toHaveStyle({ left: '128px' })
  })
})
