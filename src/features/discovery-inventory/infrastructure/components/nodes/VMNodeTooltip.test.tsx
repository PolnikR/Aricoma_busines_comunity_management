import { cleanup, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageProvider'
import { VMNodeTooltip, type VMNodeTooltipProps } from './VMNodeTooltip'

describe('VMNodeTooltip', () => {
  beforeEach(() => {
    localStorage.setItem('app-language', 'en')
  })

  afterEach(cleanup)

  const createNodeRef = () => {
    const ref = createRef<HTMLElement>()
    // Create a mock element with getBoundingClientRect
    const mockElement = document.createElement('div')
    mockElement.getBoundingClientRect = () => ({
      top: 100,
      left: 100,
      right: 200,
      bottom: 150,
      width: 100,
      height: 50,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    })
    Object.defineProperty(ref, 'current', { value: mockElement, writable: true })
    return ref
  }

  const defaultProps: VMNodeTooltipProps = {
    data: {
      name: 'app-server-01',
      status: 'powered on',
      cpu: 4,
      memory: 8,
      disk: 100,
      ipAddress: '10.0.0.10',
      host: 'esx-01',
      cluster: 'prod-cluster',
      tags: [],
    },
    nodeRef: createNodeRef(),
  }

  test('renders all label-value pairs when data is complete', async () => {
    render(
      <LanguageProvider>
        <VMNodeTooltip {...defaultProps} />
      </LanguageProvider>
    )
    expect(await screen.findByText('Name:')).toBeInTheDocument()
    expect(screen.getByText('app-server-01')).toBeInTheDocument()
    expect(screen.getByText('Status:')).toBeInTheDocument()
    expect(screen.getByText('powered on')).toBeInTheDocument()
    expect(screen.getByText('CPU:')).toBeInTheDocument()
    expect(screen.getByText('4 cores')).toBeInTheDocument()
    expect(screen.getByText('Memory:')).toBeInTheDocument()
    expect(screen.getByText('8 GB')).toBeInTheDocument()
  })

  test('renders — for missing optional fields', async () => {
    const props: VMNodeTooltipProps = {
      data: {
        name: 'simple-vm',
        status: 'powered off',
      },
      nodeRef: createNodeRef(),
    }
    render(
      <LanguageProvider>
        <VMNodeTooltip {...props} />
      </LanguageProvider>
    )
    expect(await screen.findByText('IP:')).toBeInTheDocument()
    // The next sibling of the IP label should be the em-dash
    const ipLabel = screen.getByText('IP:')
    expect(ipLabel.parentElement?.textContent).toContain('—')
  })

  test('renders tags as individual chip elements', async () => {
    const props: VMNodeTooltipProps = {
      data: {
        name: 'tagged-vm',
        status: 'powered on',
        tags: ['production', 'critical', 'monitored'],
      },
      nodeRef: createNodeRef(),
    }
    render(
      <LanguageProvider>
        <VMNodeTooltip {...props} />
      </LanguageProvider>
    )
    expect(await screen.findByText('Tags')).toBeInTheDocument()
    expect(screen.getByText('production')).toBeInTheDocument()
    expect(screen.getByText('critical')).toBeInTheDocument()
    expect(screen.getByText('monitored')).toBeInTheDocument()
  })

  test('does not render tags section when tags array is empty', () => {
    const props: VMNodeTooltipProps = {
      data: {
        name: 'no-tags-vm',
        status: 'powered on',
        tags: [],
      },
      nodeRef: createNodeRef(),
    }
    render(
      <LanguageProvider>
        <VMNodeTooltip {...props} />
      </LanguageProvider>
    )
    // The parent div that would contain "Tags" label should not exist
    expect(screen.queryByText('Tags')).not.toBeInTheDocument()
  })

  test('does not render tags section when tags is undefined', () => {
    const props: VMNodeTooltipProps = {
      data: {
        name: 'no-tags-vm',
        status: 'powered on',
      },
      nodeRef: createNodeRef(),
    }
    render(
      <LanguageProvider>
        <VMNodeTooltip {...props} />
      </LanguageProvider>
    )
    expect(screen.queryByText('Tags')).not.toBeInTheDocument()
  })

  test('exposes the floating content as a tooltip', () => {
    render(
      <LanguageProvider>
        <VMNodeTooltip {...defaultProps} />
      </LanguageProvider>
    )
    // The tooltip renders in a portal on document.body, not inside container.
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })
})
