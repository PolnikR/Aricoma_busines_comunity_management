// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageProvider'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import en from './en.json'
import sk from './sk.json'
import cs from './cs.json'

const catalogs: Record<string, Record<string, string>> = { en, sk, cs }
const parameters = [
  'url', 'notificationEmail', 'cacheRefreshSeconds', 'ipAddress', 'port',
  'credentialId', 'dagDir', 'fromEmail', 'disableSsl', 'disableTls',
  'loggingEnabled', 'jwtEnabled', 'realm', 'clientId',
]
const prefix = 'platformProviders.fieldHelp.'
const expectedKeys = parameters.flatMap(parameter => ['trigger', 'title', 'intro'].map(suffix => `${prefix}${parameter}.${suffix}`)).sort()

afterEach(() => {
  cleanup()
  localStorage.removeItem('app-language')
})

describe('platform provider field help translations', () => {
  it.each(Object.keys(catalogs))('provides exactly 42 non-empty field help keys in %s', language => {
    const catalog = catalogs[language] ?? {}
    expect(Object.keys(catalog).filter(key => key.startsWith(prefix)).sort()).toEqual(expectedKeys)
    for (const key of expectedKeys) expect(catalog[key]?.trim(), key).toBeTruthy()
  })

  it.each(Object.keys(catalogs))('preserves the complete English key set in %s', language => {
    expect(Object.keys(catalogs[language] ?? {}).sort()).toEqual(Object.keys(en).sort())
  })

  it.each(Object.keys(catalogs))('retains operational caveats in %s', language => {
    const catalog = catalogs[language] ?? {}
    expect(catalog[`${prefix}port.intro`]).toMatch(/22/)
    expect(catalog[`${prefix}disableSsl.intro`]).toMatch(/SSL/)
    expect(catalog[`${prefix}disableTls.intro`]).toMatch(/STARTTLS/)
    for (const field of ['fromEmail', 'disableSsl', 'disableTls']) expect(catalog[`${prefix}${field}.intro`]).toMatch(/smtp_default/)
    expect(catalog[`${prefix}jwtEnabled.intro`]).toMatch(/JWT.*Keycloak/)
    expect(catalog[`${prefix}jwtEnabled.intro`]).toMatch(/X-User/)
    expect(catalog[`${prefix}loggingEnabled.intro`]).toMatch(/planned|plánovan|plánován/)
    expect(catalog[`${prefix}cacheRefreshSeconds.intro`]).toMatch(/default|predvolen|výchozí/)
  })

  it.each(['en', 'sk', 'cs'])('loads translated trigger, title and intro through LanguageProvider in %s', async language => {
    const catalog = catalogs[language] ?? {}
    const helpKey = `${prefix}dagDir`
    localStorage.setItem('app-language', language)
    render(createElement(LanguageProvider, null, createElement(KeyedHelpPopover, { helpKey, sections: [] })))
    const user = userEvent.setup()
    const trigger = await screen.findByRole('button', { name: catalog[`${helpKey}.trigger`] ?? 'missing translation' })
    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: catalog[`${helpKey}.title`] ?? 'missing translation' })
    expect(dialog).toHaveTextContent(catalog[`${helpKey}.intro`] ?? 'missing translation')
    expect(dialog.textContent).not.toContain(prefix)
  })
})
