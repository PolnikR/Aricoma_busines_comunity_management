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
const parameters = ['snapshot_policy_id', 'recovery_app_policy_id', 'clean_room_policy_id']
const prefix = 'policySets.fieldHelp.'
const expectedKeys = parameters.flatMap(parameter => ['trigger', 'title', 'intro'].map(suffix => `${prefix}${parameter}.${suffix}`)).sort()

afterEach(() => {
  cleanup()
  localStorage.removeItem('app-language')
})

describe('policy set field help translations', () => {
  it.each(Object.keys(catalogs))('provides exactly nine non-empty keys in %s', language => {
    const catalog = catalogs[language] ?? {}
    expect(Object.keys(catalog).filter(key => key.startsWith(prefix)).sort()).toEqual(expectedKeys)
    for (const key of expectedKeys) expect(catalog[key]?.trim(), key).toBeTruthy()
    expect(catalog[`${prefix}clean_room_policy_id.intro`]).toMatch(/IBM Power.*DAG/)
  })

  it.each(Object.keys(catalogs))('renders all three translated popovers in %s', async language => {
    const catalog = catalogs[language] ?? {}
    localStorage.setItem('app-language', language)
    const user = userEvent.setup()
    for (const parameter of parameters) {
      const helpKey = `${prefix}${parameter}`
      const view = render(createElement(LanguageProvider, null, createElement(KeyedHelpPopover, { helpKey, sections: [] })))
      await user.click(await screen.findByRole('button', { name: catalog[`${helpKey}.trigger`] ?? 'missing translation' }))
      const dialog = screen.getByRole('dialog', { name: catalog[`${helpKey}.title`] ?? 'missing translation' })
      expect(dialog).toHaveTextContent(catalog[`${helpKey}.intro`] ?? 'missing translation')
      expect(dialog.textContent).not.toContain(prefix)
      await user.keyboard('{Escape}')
      view.unmount()
    }
  })
})
