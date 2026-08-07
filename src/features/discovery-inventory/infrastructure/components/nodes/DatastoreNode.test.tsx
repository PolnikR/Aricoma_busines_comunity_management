import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps, ReactNode } from 'react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { DatastoreNode } from './DatastoreNode'

vi.mock('./TopologyNodeShell', () => ({
  TopologyNodeShell: ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => (
    <div><span>{title}</span><span>{subtitle}</span>{children}</div>
  ),
}))

describe('DatastoreNode', () => {
  it('renders connected VMs and allocated capacity', () => {
    const props = {
      data: {
        id: 'd1', kind: 'datastore', label: 'datastore-1',
        virtualMachineCount: 3, allocatedCapacityGb: 1024,
      },
      selected: false,
    } as unknown as ComponentProps<typeof DatastoreNode>
    render(
      <LanguageProvider>
        <DatastoreNode {...props} />
      </LanguageProvider>,
    )
    expect(screen.getByText('3 connected VMs')).toBeInTheDocument()
    expect(screen.getByText(/1.?024 GB allocated/)).toBeInTheDocument()
  })
})
