import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HostNodeTooltip } from './HostNodeTooltip'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('HostNodeTooltip', () => {
  it('renders host details and a no-cluster fallback', () => {
    render(
      <HostNodeTooltip
        nodeRef={createRef<HTMLElement>()}
        data={{ name: 'host-1', clusters: [], vmCount: 3 }}
      />,
    )
    expect(screen.getByText('host-1')).toBeInTheDocument()
    expect(screen.getByText('No cluster')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
