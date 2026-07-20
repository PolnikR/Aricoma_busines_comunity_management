import type { ComponentProps, ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactFlow } from '@xyflow/react'
import type { PositionedInfrastructureTopology } from '../layout/layoutInfrastructureTopology'
import { InfrastructureTopologyCanvas } from './InfrastructureTopologyCanvas'

const reactFlowProps = vi.hoisted(() => ({
  current: null as ComponentProps<typeof ReactFlow> | null,
}))

vi.mock('@xyflow/react', () => ({
  Background: () => null,
  BackgroundVariant: { Dots: 'dots' },
  Controls: () => null,
  MiniMap: () => null,
  ReactFlow: (props: ComponentProps<typeof ReactFlow> & { children?: ReactNode }) => {
    reactFlowProps.current = props
    return <div>{props.children}</div>
  },
  ReactFlowProvider: ({ children }: { children: ReactNode }) => children,
  useEdgesState: <Edge,>(initial: Edge[]) => [initial, vi.fn(), vi.fn()],
  useNodesState: <Node,>(initial: Node[]) => [initial, vi.fn(), vi.fn()],
  useReactFlow: () => ({ fitView: vi.fn().mockResolvedValue(true) }),
}))

const topology: PositionedInfrastructureTopology = {
  nodes: [],
  edges: [],
  size: { width: 0, height: 0 },
}

describe('InfrastructureTopologyCanvas', () => {
  it('owns mobile touch gestures while preserving native React Flow navigation', () => {
    render(<InfrastructureTopologyCanvas topology={topology} />)

    expect(screen.getByLabelText('Infrastructure topology canvas')).toHaveClass(
      'min-h-0',
      'touch-none',
      'lg:touch-auto',
    )
    expect(reactFlowProps.current).toMatchObject({
      panOnDrag: true,
      preventScrolling: true,
      zoomOnPinch: true,
    })
  })
})
