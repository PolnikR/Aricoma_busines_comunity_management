import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { DiskIcon } from '@/shared/icons/Icons'
import { DetailDrawerSection } from './DetailDrawerSection'

afterEach(cleanup)

describe('DetailDrawerSection', () => {
  it('is collapsed by default and mounts its content only once opened', async () => {
    const user = userEvent.setup()
    render(<DetailDrawerSection title="Inventory"><p>Lazy content</p></DetailDrawerSection>)
    const toggle = screen.getByRole('button', { name: 'Inventory' })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).not.toHaveAttribute('aria-controls')
    expect(screen.queryByText('Lazy content')).not.toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Lazy content')).toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Lazy content')).not.toBeInTheDocument()
  })

  it('points aria-controls at a labelled region while expanded', () => {
    render(<DetailDrawerSection title="Overview" defaultOpen><p>Rows</p></DetailDrawerSection>)
    const toggle = screen.getByRole('button', { name: 'Overview' })
    const region = screen.getByRole('region', { name: 'Overview' })

    expect(toggle).toHaveAttribute('aria-controls', region.id)
    expect(region).toHaveTextContent('Rows')
  })

  it('renders the toggle as a button inside an h3', () => {
    render(<DetailDrawerSection title="Overview"><p>Rows</p></DetailDrawerSection>)
    const heading = screen.getByRole('heading', { level: 3, name: 'Overview' })
    expect(heading).toContainElement(screen.getByRole('button', { name: 'Overview' }))
  })

  it('toggles with Enter and Space', async () => {
    const user = userEvent.setup()
    render(<DetailDrawerSection title="Overview"><p>Rows</p></DetailDrawerSection>)
    const toggle = screen.getByRole('button', { name: 'Overview' })

    toggle.focus()
    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard(' ')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders summary and badge, names the button by the title and describes it by the summary', () => {
    render(
      <DetailDrawerSection title="Overview" summary="VMware VM" badge={<span>3</span>}>
        <p>Rows</p>
      </DetailDrawerSection>,
    )
    const toggle = screen.getByRole('button', { name: 'Overview' })

    expect(toggle).toHaveAccessibleName('Overview')
    expect(toggle).toHaveAccessibleDescription('VMware VM')
    expect(toggle).toHaveTextContent('Overview3VMware VM')
  })

  it('has no description without a summary', () => {
    render(<DetailDrawerSection title="Overview"><p>Rows</p></DetailDrawerSection>)
    expect(screen.getByRole('button', { name: 'Overview' })).not.toHaveAttribute('aria-describedby')
  })

  it('pads the body unless flush', () => {
    const { rerender } = render(<DetailDrawerSection title="Overview" defaultOpen><p>Rows</p></DetailDrawerSection>)
    expect(screen.getByRole('region', { name: 'Overview' })).toHaveClass('px-5', 'pb-4')

    rerender(<DetailDrawerSection title="Overview" defaultOpen flush><p>Rows</p></DetailDrawerSection>)
    expect(screen.getByRole('region', { name: 'Overview' })).not.toHaveClass('px-5')
  })

  it('opens with defaultOpen and then keeps its own state', async () => {
    const user = userEvent.setup()
    render(<DetailDrawerSection title="Overview" defaultOpen><p>Rows</p></DetailDrawerSection>)
    expect(screen.getByText('Rows')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Overview' }))
    expect(screen.queryByText('Rows')).not.toBeInTheDocument()
  })

  it('keeps several sections open independently', async () => {
    const user = userEvent.setup()
    render(
      <>
        <DetailDrawerSection title="Overview" defaultOpen><p>Overview rows</p></DetailDrawerSection>
        <DetailDrawerSection title="Orchestration"><p>Orchestration rows</p></DetailDrawerSection>
      </>,
    )

    await user.click(screen.getByRole('button', { name: 'Orchestration' }))
    expect(screen.getByText('Overview rows')).toBeInTheDocument()
    expect(screen.getByText('Orchestration rows')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Overview' }))
    expect(screen.queryByText('Overview rows')).not.toBeInTheDocument()
    expect(screen.getByText('Orchestration rows')).toBeInTheDocument()
  })

  it('keeps the header sticky and the chevron reduced-motion safe', () => {
    render(<DetailDrawerSection title="Overview"><p>Rows</p></DetailDrawerSection>)
    expect(screen.getByRole('heading', { level: 3 })).toHaveClass('sticky', 'top-0', 'bg-surface')
    expect(screen.getByRole('button', { name: 'Overview' }).querySelector('svg')).toHaveClass('motion-reduce:transition-none')
  })

  it('marks the section with its accent and shows the icon in a decorative chip', () => {
    render(<DetailDrawerSection title="Disks" accent="storage" icon={DiskIcon} defaultOpen><p>Rows</p></DetailDrawerSection>)
    const toggle = screen.getByRole('button', { name: 'Disks' })
    const chip = toggle.querySelector('[data-section-icon]')

    expect(toggle.closest('section')).toHaveAttribute('data-accent', 'storage')
    expect(toggle).toHaveClass('before:bg-theme-purple-500', 'before:opacity-100')
    expect(chip).toHaveClass('text-theme-purple-500')
    expect(chip?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(toggle).toHaveAccessibleName('Disks')
  })

  it('dims the accent stripe while the section is closed', () => {
    render(<DetailDrawerSection title="Disks" accent="storage"><p>Rows</p></DetailDrawerSection>)
    expect(screen.getByRole('button', { name: 'Disks' })).toHaveClass('before:opacity-35')
  })

  it('keeps orange a structural accent without warning tokens', () => {
    render(<DetailDrawerSection title="Orchestration" accent="configuration" icon={DiskIcon}><p>Rows</p></DetailDrawerSection>)
    const toggle = screen.getByRole('button', { name: 'Orchestration' })

    expect(toggle.querySelector('[data-section-icon]')).toHaveClass('text-orange-500')
    expect(toggle.closest('section')?.outerHTML).not.toMatch(/warning-/)
    expect(screen.getByText('Orchestration')).not.toHaveClass('text-orange-500')
  })

  it('renders without stripe or chip when no accent or icon is given', () => {
    render(<DetailDrawerSection title="Overview"><p>Rows</p></DetailDrawerSection>)
    const toggle = screen.getByRole('button', { name: 'Overview' })

    expect(toggle.closest('section')).not.toHaveAttribute('data-accent')
    expect(toggle.querySelector('[data-section-icon]')).toBeNull()
    expect(toggle.className).not.toMatch(/before:/)
  })

  it('gives an icon without accent a neutral chip', () => {
    render(<DetailDrawerSection title="Overview" icon={DiskIcon}><p>Rows</p></DetailDrawerSection>)
    expect(screen.getByRole('button', { name: 'Overview' }).querySelector('[data-section-icon]')).toHaveClass('bg-surface-muted', 'text-text-muted')
  })

  it('keeps the header fixed and lets only the open panel scroll', async () => {
    const user = userEvent.setup()
    render(<DetailDrawerSection title="Overview"><p>Rows</p></DetailDrawerSection>)
    const section = screen.getByRole('heading', { level: 3 }).closest('section')

    expect(section).toHaveClass('flex', 'min-h-0', 'flex-col', 'shrink-0')
    expect(screen.getByRole('heading', { level: 3 })).toHaveClass('shrink-0')

    await user.click(screen.getByRole('button', { name: 'Overview' }))
    expect(section).toHaveClass('flex-1', 'max-h-fit')
    expect(section).not.toHaveClass('shrink-0')
    expect(screen.getByRole('region', { name: 'Overview' })).toHaveClass('flex-1', 'min-h-0', 'overflow-y-auto')
  })

  it('offers no controlled open API', () => {
    // @ts-expect-error The section is uncontrolled only; `open` is not a prop.
    render(<DetailDrawerSection title="Overview" open><p>Rows</p></DetailDrawerSection>)
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-expanded', 'false')
  })
})
