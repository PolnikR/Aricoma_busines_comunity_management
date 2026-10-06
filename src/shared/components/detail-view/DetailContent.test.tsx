import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DetailCode } from './DetailCode'
import { DetailField, DetailFieldGroup, DetailFieldLink, DetailTechnicalGroup } from './DetailField'
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
