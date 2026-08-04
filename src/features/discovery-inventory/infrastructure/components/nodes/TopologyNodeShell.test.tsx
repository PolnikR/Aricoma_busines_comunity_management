import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TopologyNodeShell } from './TopologyNodeShell'

vi.mock('@xyflow/react', () => ({
  Handle: ({ type }: { type: string }) => <span data-testid={`${type}-handle`} />,
  Position: { Top: 'top', Bottom: 'bottom' },
}))

describe('TopologyNodeShell', () => {
  it('renders labels, content, selection, and optional handles', () => {
    render(
      <TopologyNodeShell
        kindLabel="Host"
        title="host-1"
        subtitle="cluster-1"
        icon={<span>icon</span>}
        iconClassName="icon-class"
        selected
        showTargetHandle
        showSourceHandle
      >
        3 VMs
      </TopologyNodeShell>,
    )
    const shell = screen.getByRole('group', { name: 'Host: host-1' })
    expect(shell).toHaveClass('ring-4')
    expect(screen.getByText('3 VMs')).toBeInTheDocument()
    expect(screen.getByTestId('target-handle')).toBeInTheDocument()
    expect(screen.getByTestId('source-handle')).toBeInTheDocument()
  })
})
