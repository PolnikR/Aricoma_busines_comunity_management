import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { resolveVmwareProviderFilter } from '../../helpers/vmwareProviderFilter'
import { VmwareProviderFilterSummary } from './VmwareProviderFilterSummary'

describe('VmwareProviderFilterSummary', () => {
  it('renders the fixed prefix and tag in compact chips', () => {
    render(
      <VmwareProviderFilterSummary
        filter={resolveVmwareProviderFilter({ vmPrefix: ' prod- ', vmTags: ['ABCO-managed'] })}
        label="Provider filter"
        nameLabel="VM name"
        tagLabel="VM tag"
      />,
    )

    expect(screen.getByRole('group', { name: 'Provider filter' })).toHaveTextContent('▼ Provider filter:')
    expect(screen.getByText('prod-*')).toBeInTheDocument()
    expect(screen.getByText('ABCO-managed')).toBeInTheDocument()
  })

  it('renders nothing when the provider has no fixed filter', () => {
    const { container } = render(
      <VmwareProviderFilterSummary
        filter={resolveVmwareProviderFilter(undefined)}
        label="Provider filter"
        nameLabel="VM name"
        tagLabel="VM tag"
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
