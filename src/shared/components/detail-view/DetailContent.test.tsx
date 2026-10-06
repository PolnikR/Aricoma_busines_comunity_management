import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DetailCode } from './DetailCode'
import { DetailField, DetailFieldGroup, DetailFieldLink, DetailOverview, DetailTechnicalGroup } from './DetailField'
import { DetailStatusBlock } from './DetailStatusBlock'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

// userEvent.setup() installs a clipboard stub; assertions read it back.
const clipboardText = () => navigator.clipboard.readText()

describe('DetailField', () => {
  it('pairs the label and value as dt + dd and shows the secondary line', () => {
    render(<dl><DetailField label="Policy set" value="test_1_hour_ps" secondary="Snapshot every 1 h" emphasis /></dl>)
    const term = screen.getByRole('term')
    expect(term).toHaveTextContent('Policy set')
    expect(term.nextElementSibling).toHaveTextContent('test_1_hour_psSnapshot every 1 h')
    expect(screen.getByText('test_1_hour_ps').closest('div')).toHaveClass('font-semibold', 'wrap-anywhere')
  })

  it.each([undefined, null, '', '   '])('shows "Not set" for an empty value (%j)', (value) => {
    render(<dl><DetailField label="Description" value={value} copyValue="x" /></dl>)
    expect(screen.getByRole('definition')).toHaveTextContent('Not set')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it.each([
    [false, 'false'],
    [true, 'true'],
    [0, '0'],
  ])('keeps %j as a visible value, not "Not set"', (value, text) => {
    render(<dl><DetailField label="Flag" value={value} /></dl>)
    expect(screen.getByRole('definition')).toHaveTextContent(new RegExp(`^${text}$`))
    expect(screen.getByRole('definition')).not.toHaveTextContent('Not set')
  })

  it('renders node values such as badges and links, and spans the row when wide', () => {
    const { container } = render(
      <dl>
        <DetailField label="State" value={<span data-testid="badge">Active</span>} />
        <DetailField label="URL" value={<DetailFieldLink href="https://airflow.test" external>https://airflow.test</DetailFieldLink>} wide />
      </dl>,
    )
    expect(screen.getByTestId('badge')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'https://airflow.test' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(container.querySelectorAll('dl > div')[1]).toHaveClass('col-span-full')
  })

  it('renders an internal link as a button when it has no URL', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<dl><DetailField label="Resources" value={<DetailFieldLink onClick={onClick}>4 VMs</DetailFieldLink>} /></dl>)
    await user.click(screen.getByRole('button', { name: '4 VMs' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('copies the copy value and confirms it', async () => {
    const user = userEvent.setup()
    render(<dl><DetailField label="Path" value="/get_volumes" mono copyValue="/get_volumes" /></dl>)
    expect(screen.getByText('/get_volumes').closest('div')).toHaveClass('font-mono')
    await user.click(screen.getByRole('button', { name: 'Copy Path' }))
    expect(await clipboardText()).toBe('/get_volumes')
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('keeps very long values inside the field', () => {
    const long = 'rg_db_and_app_production_tier2_critical_brno_primary_datacenter_7f3a9c2e41d0'.repeat(3)
    render(<dl><DetailField label="Group ID" value={long} /></dl>)
    expect(screen.getByText(long).closest('div')).toHaveClass('min-w-0', 'wrap-anywhere')
  })
})

describe('DetailFieldGroup', () => {
  it('renders a titled responsive grid of fields', () => {
    render(
      <DetailFieldGroup title="Workload" description="What is protected">
        <DetailField label="Workload type" value="VMware virtual machines" />
      </DetailFieldGroup>,
    )
    expect(screen.getByRole('heading', { level: 4, name: 'Workload' })).toBeInTheDocument()
    expect(screen.getByText('What is protected')).toBeInTheDocument()
    expect(screen.getByRole('term').closest('dl')).toHaveClass('grid-cols-1', '@min-[520px]/detail-content:grid-cols-2', '@min-[860px]/detail-content:grid-cols-3')
  })
})

describe('DetailOverview', () => {
  const cellOf = (label: string) => screen.getByText(label).parentElement

  it('renders an auto-fill grid with a row rule and last-row clip, without columns, borders or surface', () => {
    render(
      <DetailOverview>
        <DetailField label="Type" value="Airflow" emphasis />
        {null}
        <>
          <DetailField label="Port" value="8080" mono />
        </>
      </DetailOverview>,
    )
    const grid = screen.getAllByRole('term')[0]?.closest('dl')
    expect(grid).toHaveClass('grid-cols-[repeat(auto-fill,minmax(min(12.75rem,100%),1fr))]', 'grid-flow-row', '[clip-path:inset(-0.5rem_0_2px_-0.5rem)]')
    expect(grid?.className).not.toMatch(/grid-cols-\d|:grid-cols-|dense|rounded|(^|\s)(bg-|ring|border)/)
    expect(screen.getAllByRole('term')).toHaveLength(2)
    for (const label of ['Type', 'Port']) {
      const cell = cellOf(label)
      expect(cell).toHaveClass('relative', 'py-2', 'pe-7', 'after:bottom-0', 'after:h-px', 'after:bg-(--overview-rule)')
      expect(cell?.className).not.toMatch(/col-span|(^|\s)(bg-|ring|border)/)
    }
  })

  it('spans cells by the footprint: wide is full, plain text by length, nodes one track', () => {
    render(
      <DetailOverview>
        <DetailField label="Short" value={'x'.repeat(28)} />
        <DetailField label="Short wide" value={'y'.repeat(18)} mono wide />
        <DetailField label="Medium" value={'x'.repeat(29)} />
        <DetailField label="Long" value={'x'.repeat(65)} />
        <DetailField label="Link" value={<DetailFieldLink href="https://airflow.test" external>https://airflow.test</DetailFieldLink>} />
        <DetailField label="Wide link" value={<DetailFieldLink href="https://airflow.test" external>https://airflow.test</DetailFieldLink>} wide />
        <DetailField label="Empty" value={null} wide />
      </DetailOverview>,
    )
    for (const label of ['Short', 'Link', 'Empty']) expect(cellOf(label)?.className).not.toMatch(/col-span/)
    expect(cellOf('Medium')).toHaveClass('@min-[24rem]/detail-content:col-span-2')
    expect(cellOf('Long')).toHaveClass('col-span-full')
    expect(screen.getByText('x'.repeat(65))).toHaveClass('max-w-[88ch]')
    expect(cellOf('Wide link')).toHaveClass('col-span-full')
    expect(cellOf('Short wide')).toHaveClass('col-span-full')
  })

  it('uses the A4 typography: 11.5px medium label and mono at primary contrast', () => {
    render(
      <DetailOverview>
        <DetailField label="IP address" value="10.20.30.40" mono />
      </DetailOverview>,
    )
    const term = screen.getByRole('term')
    expect(term).toHaveClass('text-[11.5px]', 'font-medium', 'text-text-muted')
    expect(term).not.toHaveClass('uppercase')
    expect(term.nextElementSibling).toHaveClass('mt-0.5')
    const value = screen.getByText('10.20.30.40')
    expect(value).toHaveClass('font-mono', 'text-[12.5px]', 'text-text-primary')
    expect(value).not.toHaveClass('text-text-secondary')
  })

  it('keeps Not set, secondary lines, copy, external links and badges', async () => {
    const user = userEvent.setup()
    render(
      <DetailOverview>
        <DetailField label="Description" value="  " copyValue="x" />
        <DetailField label="Cluster" value="cl-brno-01" secondary="esx-07" />
        <DetailField label="Provider ID" value="airflow-01" mono copyValue="airflow-01" />
        <DetailField label="URL" value={<DetailFieldLink href="https://airflow.test" external>https://airflow.test</DetailFieldLink>} wide />
        <DetailField label="State" value={<span data-testid="badge">Active</span>} />
      </DetailOverview>,
    )
    const definitions = screen.getAllByRole('definition')
    expect(screen.getAllByRole('term').map(term => term.nextElementSibling)).toEqual(definitions)
    expect(definitions[0]).toHaveTextContent('Not set')
    expect(screen.queryByRole('button', { name: 'Copy Description' })).not.toBeInTheDocument()
    expect(definitions[1]).toHaveTextContent('cl-brno-01esx-07')
    const link = screen.getByRole('link', { name: 'https://airflow.test' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByTestId('badge')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Copy Provider ID' }))
    expect(await clipboardText()).toBe('airflow-01')
  })

  it('leaves fields outside an Overview unchanged', () => {
    render(
      <>
        <DetailFieldGroup><DetailField label="In group" value="a" mono /></DetailFieldGroup>
        <DetailTechnicalGroup><DetailField label="In technical" value="b" /></DetailTechnicalGroup>
        <DetailStatusBlock title="Latest run" status="ok" tone="success"><DetailField label="In status" value="c" /></DetailStatusBlock>
      </>,
    )
    expect(screen.getByText('In group')).toHaveClass('text-xs', 'leading-4', 'text-text-muted')
    expect(screen.getByText('a')).toHaveClass('font-mono', 'text-text-secondary')
    expect(screen.getByText('In group').parentElement?.className).toBe('min-w-0')
    expect(screen.getByText('b')).toHaveClass('font-mono', 'text-text-secondary')
    expect(screen.getByText('In status')).toHaveClass('text-xs')
    expect(screen.getByText('In status')).not.toHaveClass('font-medium')
  })
})

describe('DetailTechnicalGroup', () => {
  it('renders fields as mono identifier rows with copy on a recessed surface', async () => {
    const user = userEvent.setup()
    render(
      <DetailTechnicalGroup title="Providers">
        <DetailField label="Provider ID" value="vmware-vcenter-03" copyValue="vmware-vcenter-03" />
        <DetailField label="Volume provider ID" value={null} />
      </DetailTechnicalGroup>,
    )
    const [first, second] = screen.getAllByRole('definition')
    expect(first).toHaveClass('font-mono', 'wrap-anywhere')
    expect(second).toHaveTextContent('Not set')
    expect(first?.closest('dl')).toHaveClass('bg-surface-muted/70')
    await user.click(screen.getByRole('button', { name: 'Copy Provider ID' }))
    expect(await clipboardText()).toBe('vmware-vcenter-03')
  })
})

describe('DetailStatusBlock', () => {
  it('orders status, timestamp, facts, reference and action', () => {
    render(
      <DetailStatusBlock
        title="Latest run"
        status="success"
        tone="success"
        timestamp="6 Oct 2026, 09:30"
        reference={{ label: 'Airflow run ID', value: <a href="#run">dag_1</a>, copyValue: 'dag_1' }}
        action={<button type="button">View recovery runs</button>}
      >
        <DetailField label="Duration" value="10 s" />
      </DetailStatusBlock>,
    )
    const block = screen.getByRole('heading', { level: 4, name: 'Latest run' }).closest('section')
    if (!block) throw new Error('Expected the status block')
    expect(block).toHaveAttribute('data-tone', 'success')
    expect(block).toHaveTextContent(/^Latest runsuccess6 Oct 2026, 09:30Duration10 sAirflow run IDdag_1View recovery runs$/)
    expect(within(block).getByRole('button', { name: 'Copy Airflow run ID' })).toBeInTheDocument()
  })

  it('renders no facts row when every fact is conditional and absent', () => {
    render(<DetailStatusBlock title="Latest run" status="No runs yet" tone="neutral">{null}{false}</DetailStatusBlock>)
    expect(screen.queryByRole('term')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Latest run' }).closest('section')?.children).toHaveLength(1)
  })

  it('renders only the status when nothing else is given', () => {
    render(<DetailStatusBlock title="Orchestration" status="Not configured" tone="neutral" />)
    const block = screen.getByRole('heading', { name: 'Orchestration' }).closest('section')
    expect(block?.children).toHaveLength(1)
    expect(block).toHaveTextContent('OrchestrationNot configured')
  })
})

describe('DetailCode', () => {
  const json = '{\n  "detail": "Bad gateway",\n  "retryable": true,\n  "attempts": 3\n}'

  it('shows the caption, keeps the exact text and copies it', async () => {
    const user = userEvent.setup()
    render(<DetailCode label="JSON" meta="214 B" value={json} language="json" />)
    const figure = screen.getByRole('figure')
    expect(figure).toHaveTextContent('JSON· 214 B')
    expect(figure.querySelector('pre')?.textContent).toBe(json)
    expect(within(figure).getByText('true')).toHaveClass('text-accent')
    await user.click(within(figure).getByRole('button', { name: 'Copy' }))
    expect(await clipboardText()).toBe(json)
  })

  it('shows the empty state without a copy action', () => {
    render(<DetailCode label="Request body" value="" emptyLabel="No body was recorded for this request." />)
    expect(screen.getByText('No body was recorded for this request.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
