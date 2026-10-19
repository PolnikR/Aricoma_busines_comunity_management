import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { LanguageProvider } from '@/contexts/LanguageProvider'
import { useLanguageContext } from '@/contexts/LanguageContext'
import { OverviewPage } from './OverviewPage'
import en from '@/locales/en.json'
import sk from '@/locales/sk.json'
import cs from '@/locales/cs.json'

vi.mock('@/features/discovery-inventory/resources/hooks/useInitialResourcePrefetch', () => ({
  useInitialResourcePrefetch: vi.fn(),
}))

function LanguageSwitch() {
  const { setLanguage } = useLanguageContext()
  return <><button onClick={() => { setLanguage('cs') }}>Čeština</button><button onClick={() => { setLanguage('en') }}>English</button></>
}

afterEach(() => { cleanup(); localStorage.removeItem('app-language') })

describe('Overview translations', () => {
  it('provides the dashboard description in all supported languages', () => {
    for (const catalog of [en, sk, cs]) {
      expect(catalog).toHaveProperty(['overview.description'], expect.stringMatching(/\S/))
    }
  })

  it('provides matching Overview keys and interpolation parameters in every catalog', () => {
    const entries = (catalog: Record<string, string>) => Object.entries(catalog).filter(([key]) => key.startsWith('overview.'))
    const keys = entries(en).map(([key]) => key).sort()
    expect(keys.length).toBeGreaterThan(0)
    for (const catalog of [sk, cs]) {
      expect(entries(catalog).map(([key]) => key).sort()).toEqual(keys)
      for (const [key, value] of entries(catalog)) {
        expect(value.trim(), key).not.toBe('')
        expect(value.match(/\{\{\w+\}\}/g)?.sort() ?? [], key).toEqual(
          en[key as keyof typeof en].match(/\{\{\w+\}\}/g)?.sort() ?? [],
        )
      }
    }
  })

  it('renders Slovak content and chart labels, preserving the vendor filter when switching to Czech', async () => {
    localStorage.setItem('app-language', 'sk')
    const user = userEvent.setup()
    const { container } = render(<MemoryRouter><LanguageProvider><LanguageSwitch /><OverviewPage /></LanguageProvider></MemoryRouter>)
    const protection = await screen.findByRole('region', { name: 'Prehľad ochrany' })
    const heading = screen.getByRole('heading', { level: 1, name: 'Prehľad' })
    expect(heading.parentElement?.parentElement).toContainElement(screen.getByRole('group', { name: 'Výrobca úložiska' }))
    expect(screen.getByText('Stav ochrany, infraštruktúry a obnovy')).toBeVisible()
    expect(screen.getByRole('group', { name: 'Výrobca úložiska' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Kľúčové štatistiky' })).toBeVisible()
    expect(within(screen.getByRole('region', { name: 'Kľúčové štatistiky' })).getByText('poskytovateľov')).toBeVisible()
    expect(container.querySelector('.overall-resource-count')).toHaveTextContent('6 poskytovateľov')
    expect(screen.getAllByText('SIMULOVANÉ')).toHaveLength(4)
    expect(within(protection).getByText(new Intl.NumberFormat('sk').format(1280), { normalizer: text => text.trim() })).toBeVisible()
    expect(within(protection).getByText('94,1%')).toBeVisible()
    expect(screen.getByRole('progressbar', { name: 'VMware odoslané do orchestrátora (ukážka)' })).toBeVisible()
    expect(screen.queryByText('STATICKÁ UKÁŽKA · DEMO ÚDAJE')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hitachi VSP' }))
    expect(within(protection).getByRole('img', { name: /460 so snímkami, 40 bez snímok/ })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Čeština' }))
    const czechProtection = await screen.findByRole('region', { name: 'Přehled ochrany' })
    expect(screen.getByRole('heading', { level: 1, name: 'Přehled' })).toBeVisible()
    expect(screen.getByText('Stav ochrany, infrastruktury a obnovy')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Hitachi VSP' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(czechProtection).getByRole('img', { name: /460 se snímky, 40 bez snímků/ })).toBeVisible()
    expect(screen.getByRole('group', { name: 'Výrobce úložiště' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Přehled obnovy' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Přehled infrastruktury' })).toBeVisible()
    expect(container.querySelector('.overall-resource-count')).toHaveTextContent('6 poskytovatelů')
    expect(screen.getByRole('region', { name: 'Pokrytí nasazení' })).toBeVisible()
    expect(screen.getByRole('progressbar', { name: 'VMware odeslané do orchestrátoru (ukázka)' })).toBeVisible()
    expect(container.textContent).not.toMatch(/overview\.|SIMULATED|COMPUTE PLATFORM|STORAGE SYSTEM|Demo inventory|without snapshot/)
    await user.click(screen.getByRole('button', { name: 'English' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
    expect(screen.getByText('Protection, infrastructure and recovery status')).toBeVisible()
    expect(screen.getByRole('group', { name: 'Storage vendor' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Hitachi VSP' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(protection).getByRole('img', { name: /460 with snapshots, 40 without snapshots/ })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Čeština' }))
    await user.click(screen.getByRole('button', { name: 'Všichni' }))
    expect(within(czechProtection).getByText(new Intl.NumberFormat('cs').format(1280), { normalizer: text => text.trim() })).toBeVisible()
  })
})
