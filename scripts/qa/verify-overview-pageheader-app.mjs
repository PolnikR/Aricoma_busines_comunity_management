import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

// Run from the repo root against the real app. CDP keeps the user's QA login in memory.
// QA_PHASE=baseline before integration; final is the default. No auth/config interception.
const phase = process.env.QA_PHASE ?? 'final'
assert(['baseline', 'final'].includes(phase), 'QA_PHASE must be baseline or final')
const appUrl = process.env.APP_URL ?? 'http://localhost:5173/'
const runtime = process.env.PLAYWRIGHT_MODULE ?? 'node_modules/.cache/scroll-probe/node_modules/playwright-core/index.mjs'
const output = resolve('node_modules/.cache/overview-pageheader-app')
const headersOnly = process.env.QA_HEADERS_ONLY === 'true'
const { chromium } = await import(pathToFileURL(resolve(runtime)).href)
const remote = process.env.PLAYWRIGHT_CDP_URL
const browser = remote
  ? await chromium.connectOverCDP(remote)
  : await chromium.launch({ channel: 'msedge', headless: true })
const context = remote ? browser.contexts()[0] : await browser.newContext({
  ...(process.env.PLAYWRIGHT_STORAGE_STATE ? { storageState: process.env.PLAYWRIGHT_STORAGE_STATE } : {}),
})
assert(context, 'No QA browser context available')
const page = remote
  ? context.pages().find(item => item.url().startsWith(appUrl)) ?? context.pages()[0]
  : await context.newPage()
assert(page, 'No QA browser page available')
page.setDefaultTimeout(10000)
const catalogs = Object.fromEntries(await Promise.all(['en', 'sk', 'cs'].map(async language => [language,
  JSON.parse(await readFile(resolve(`src/locales/${language}.json`), 'utf8')),
])))
const viewports = [[1920, 1080], [1440, 900], [1366, 768], [1100, 700], [1024, 768], [950, 640], [390, 844], [320, 700]]
const boundaries = [639, 640, 699, 700, 701, 949, 950, 1023, 1024, 1279, 1280]
const results = headersOnly
  ? JSON.parse(await readFile(`${output}/final-results.json`, 'utf8')).results.filter(item => ['matrix', 'boundary', 'collapsed-sidebar'].includes(item.label) || item.matchesBaseline === true)
  : []
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (['warning', 'error'].includes(message.type())) errors.push(message.text()) })
let documentRequests = 0
page.on('request', request => { if (request.resourceType() === 'document') documentRequests++ })

async function menu() {
  const trigger = page.locator('header button[aria-haspopup="true"]')
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click()
  await page.waitForFunction(() => document.querySelector('header button[aria-haspopup="true"]')?.getAttribute('aria-expanded') === 'true')
}

async function menuClosed() {
  await page.waitForFunction(() => document.querySelector('header button[aria-haspopup="true"]')?.getAttribute('aria-expanded') === 'false')
}

async function languageAndTheme(language, theme) {
  await menu()
  const languageNames = [...new Set(Object.values(catalogs).map(t => t[`language.${language}`]))]
  await page.getByRole('button', { name: new RegExp(`^(${languageNames.join('|')})$`) }).click()
  await menuClosed()
  await page.getByRole('group', { name: catalogs[language]['overview.storageVendor'], exact: true }).waitFor()
  await menu()
  await page.getByRole('button', { name: catalogs[language][`theme.${theme}`], exact: true }).click()
  await page.locator('header button[aria-haspopup="true"]').click()
  await menuClosed()
  assert.equal(await page.locator('html').getAttribute('data-theme'), theme)
}

async function measure() {
  return page.locator('.overall-page').evaluate(root => {
    const box = element => {
      const rect = element.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom,
        clientHeight: element.clientHeight, scrollHeight: element.scrollHeight,
        clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }
    }
    const clipped = []
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode
      if (!node.textContent.trim() || !node.parentElement.getClientRects().length) continue
      const range = document.createRange()
      range.selectNodeContents(node)
      for (const rect of range.getClientRects()) {
        if (!rect.width || !rect.height) continue
        for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor)
          const bounds = ancestor.getBoundingClientRect()
          const clipsX = ['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX)
          const clipsY = ['hidden', 'clip'].includes(style.overflowY)
          if ((clipsX && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)) ||
              (clipsY && (rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1))) {
            clipped.push(node.textContent.trim().slice(0, 90))
            break
          }
          // The mobile page intentionally scrolls inside the clipped shell.
          if (ancestor === root) break
        }
      }
    }
    const elements = selectors => [...root.querySelectorAll(selectors)].map(box)
    return { root: box(root), main: box(document.querySelector('main')), document: box(document.documentElement),
      header: box(root.firstElementChild), kpis: elements('.overall-kpi'), panels: elements('.overall-panel'),
      footer: root.querySelector('footer') ? box(root.querySelector('footer')) : null,
      end: box(root.querySelector('.overall-deployment')), gaps: root.children.length - 1,
      gap: getComputedStyle(root).gap, clipped: [...new Set(clipped)] }
  })
}

async function inspect(width, height, language, theme, label = 'matrix', screenshot = false) {
  console.log(`${phase}: ${width}x${height} ${language} ${theme} ${label}`)
  const screenshotName = `${phase}${label === 'matrix' ? '' : `-${label}`}-${width}-${height}-${language}-${theme}`
  await page.setViewportSize({ width, height })
  await languageAndTheme(language, theme)
  const t = catalogs[language]
  await page.evaluate(() => document.fonts.ready)
  const group = page.getByRole('group', { name: t['overview.storageVendor'], exact: true })
  assert.equal(await group.count(), 1)
  assert.equal(await page.locator('.overall-kpi').count(), 4)
  assert.equal(await page.locator('.overall-panel').count(), 4)
  if (phase === 'final') {
    const heading = page.getByRole('heading', { level: 1, name: t['nav.overview'], exact: true })
    assert.equal(await heading.count(), 1)
    assert.equal(await page.locator('h1').count(), 1)
    assert(await heading.locator('../..').getByRole('group', { name: t['overview.storageVendor'] }).count())
    assert.equal(await page.getByText(t['overview.description'], { exact: true }).count(), 1)
    assert.equal(await page.locator('.overall-toolbar').count(), 0)
    assert.equal(await page.locator('.overall-footer').count(), 0)
  }
  const invariant = await page.locator('.overall-recovery, .overall-infrastructure, .overall-deployment').allTextContents()
  for (const [name, count] of [['IBM FlashSystem', '820'], ['Hitachi VSP', '460'], [t['overview.all'], '1' + (language === 'en' ? ',' : '\u00a0') + '280']]) {
    const button = group.getByRole('button', { name, exact: true })
    await button.click()
    assert.equal(await button.getAttribute('aria-pressed'), 'true')
    const chart = await page.locator('.overall-donut').getAttribute('aria-label')
    assert(chart.replaceAll(/\s/g, '').includes(count.replaceAll(/\s/g, '')), chart)
    assert.deepEqual(await page.locator('.overall-recovery, .overall-infrastructure, .overall-deployment').allTextContents(), invariant)
  }
  const geometry = await measure()
  const failures = []
  if (phase === 'final' && Math.max(...geometry.kpis.map(item => item.height)) - Math.min(...geometry.kpis.map(item => item.height)) > 1) failures.push('unequal KPI height')
  if (geometry.root.scrollWidth > geometry.root.clientWidth + 1 || geometry.document.scrollWidth > width + 1) failures.push('horizontal overflow')
  if (geometry.clipped.length) failures.push('clipped text')
  if (width >= 950) {
    for (const key of ['root', 'main', 'document']) {
      if (geometry[key].scrollHeight > geometry[key].clientHeight + 1) failures.push(`${key} vertical overflow`)
    }
    if (geometry.end.bottom > height + 1) failures.push('last panel outside viewport')
    if (phase === 'final' && label === 'matrix') {
      const baseline = JSON.parse(await readFile(`${output}/baseline-results.json`, 'utf8')).results.find(item => item.label === label && item.width === width && item.height === height && item.language === language && item.theme === theme)
      assert(baseline, 'Missing matching baseline measurement')
      if (geometry.header.height + geometry.gaps * parseFloat(geometry.gap) + (geometry.footer?.height ?? 0) > baseline.header.height + (baseline.gaps ?? 3) * parseFloat(baseline.gap) + (baseline.footer?.height ?? 0) + 1) failures.push('increased header/spacing budget')
    }
  } else {
    await page.locator('.overall-page').evaluate(root => { root.scrollTop = root.scrollHeight })
    const lastPanel = await page.locator('.overall-deployment').boundingBox()
    if (!lastPanel || lastPanel.y + lastPanel.height > height + 1) failures.push('last panel bottom unreachable')
    if (screenshot) await page.screenshot({ path: `${output}/${screenshotName}-bottom.png` })
    await page.locator('.overall-page').evaluate(root => { root.scrollTop = 0 })
  }
  if (screenshot || failures.length) await page.screenshot({ path: `${output}/${screenshotName}.png` })
  results.push({ label, width, height, language, theme, failures, ...geometry })
}

try {
  await mkdir(output, { recursive: true })
  if (!remote || new URL(page.url()).origin === new URL(appUrl).origin) await page.goto(appUrl)
  // Do not reset a login form while the user is completing it in the QA window.
  await page.locator('.overall-page').waitFor({ timeout: Number(process.env.QA_LOGIN_TIMEOUT ?? 15000) })
  for (const [width, height] of headersOnly ? [] : viewports) {
    for (const language of ['en', 'sk', 'cs']) {
      for (const theme of ['light', 'dark']) {
        const screenshot = language === 'sk' && [1366, 1024, 950, 390, 320].includes(width)
        await inspect(width, height, language, theme, 'matrix', screenshot)
      }
    }
  }
  if (phase === 'final' && !headersOnly) {
    for (const width of boundaries) await inspect(width, 700, 'cs', 'light', 'boundary')
    await page.setViewportSize({ width: 1366, height: 768 })
    await languageAndTheme('sk', 'light')
    const collapse = page.getByRole('button', { name: catalogs.sk['nav.collapse'], exact: true })
    await collapse.click()
    await inspect(1366, 768, 'sk', 'light', 'collapsed-sidebar', true)
    await page.getByRole('button', { name: catalogs.sk['nav.expand'], exact: true }).click()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Toggle sidebar', exact: true }).click()
    await page.getByRole('button', { name: 'Close sidebar backdrop', exact: true }).click()
    const allButton = page.getByRole('group', { name: catalogs.sk['overview.storageVendor'] }).getByRole('button', { name: 'Všetci', exact: true })
    await allButton.focus()
    await page.keyboard.press('Tab')
    assert(await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement).outlineWidth) >= 2), 'Keyboard focus must be visible')
    await page.keyboard.press('Enter')
    assert.equal(await page.getByRole('button', { name: 'IBM FlashSystem', exact: true }).getAttribute('aria-pressed'), 'true')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Space')
    assert.equal(await page.getByRole('button', { name: 'Hitachi VSP', exact: true }).getAttribute('aria-pressed'), 'true')
    await languageAndTheme('en', 'dark')
    assert.equal(await page.getByRole('button', { name: 'Hitachi VSP', exact: true }).getAttribute('aria-pressed'), 'true')
    for (const [key, path] of [['overview.viewRecoveryGroups', '/recovery-plans/recovery-groups'], ['overview.viewRecoveryApplications', '/recovery-plans/recovery-applications']]) {
      // KPI navigation belongs to an independent change and may not be installed.
      if (!catalogs.en[key]) continue
      const before = documentRequests
      await page.getByRole('link', { name: catalogs.en[key], exact: true }).click()
      await page.waitForURL(url => url.pathname === path)
      assert.equal(documentRequests, before, 'KPI navigation must not reload the document')
      await page.goto(appUrl)
      await page.locator('.overall-page').waitFor()
    }
  }
  await languageAndTheme('cs', 'dark')
  // Compare the original shared header and its current default in the same live app/session.
  // Only this UI module is intercepted; auth, API, shell and feature pages remain real.
  const headerPattern = /\/src\/shared\/components\/page\/PageHeader\.tsx(?:\?.*)?$/
  const originalHeader = phase === 'final' ? ts.transpileModule(await readFile(`${output}/PageHeader-before.tsx`, 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext },
  }).outputText.replace('import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";', 'import jsxRuntime from "/node_modules/.vite/deps/react_jsx-runtime.js"; const { jsx: _jsx, jsxs: _jsxs } = jsxRuntime;') : null
  async function captureHeader(path, width, height, theme, file) {
    await page.setViewportSize({ width, height })
    await page.goto(new URL(path, appUrl).href)
    await page.locator('h1').waitFor()
    await menu()
    await page.getByRole('button', { name: catalogs.cs[`theme.${theme}`], exact: true }).click()
    await page.locator('header button[aria-haspopup="true"]').click()
    await menuClosed()
    await page.waitForFunction(() => innerWidth >= 1024 || document.querySelector('aside').getBoundingClientRect().right <= 1)
    if (path === '/discovery-inventory/infrastructure') {
      // The header appears before provider discovery creates the refresh action.
      await page.locator('h1').locator('../..').getByRole('button', { name: catalogs.cs['buttons.refreshInventory'], exact: true }).waitFor()
    }
    await page.waitForFunction(() => [...document.querySelector('h1').parentElement.parentElement.querySelectorAll('button')].every(button => !button.disabled))
    return page.locator('h1').locator('../..').screenshot({ path: `${output}/${file}.png` })
  }
  for (const [name, path] of [['providers', '/platform-administration/platform-providers'], ['infrastructure', '/discovery-inventory/infrastructure'], ['resources', '/discovery-inventory/resources']]) {
    for (const [width, height] of [[1366, 768], [390, 844]]) {
      for (const theme of ['light', 'dark']) {
        if (headersOnly && results.some(item => item.label === 'default-header' && item.name === name && item.width === width && item.theme === theme && item.matchesBaseline)) continue
        console.log(`${phase}: default header ${name} ${width} ${theme}`)
        const file = `${name}-${width}-${theme}`
        let reference
        if (phase === 'final') {
          await page.route(headerPattern, route => route.fulfill({ contentType: 'application/javascript', body: originalHeader }))
          reference = await captureHeader(path, width, height, theme, `reference-${file}`)
          await page.unroute(headerPattern)
        }
        const image = await captureHeader(path, width, height, theme, `${phase}-${file}`)
        const matchesBaseline = phase === 'final' ? image.equals(reference) : null
        results.push({ label: 'default-header', name, width, height, theme, matchesBaseline })
      }
    }
  }
} catch (error) {
  results.push({ label: 'execution-error', message: error.message })
  process.exitCode = 1
} finally {
  await writeFile(`${output}/${phase}-results.json`, JSON.stringify({ phase, results, consoleErrors: [...new Set(errors)] }, null, 2))
  const failures = results.filter(item => item.failures?.length || item.matchesBaseline === false || item.label === 'execution-error')
  if (phase === 'final' && failures.length) process.exitCode = 1
  await new Promise(resolve => process.stdout.write(JSON.stringify({ phase, cases: results.length, failures }, null, 2) + '\n', resolve))
  // Exiting the CDP client leaves the independently launched QA browser/session open.
  if (remote) process.exit(process.exitCode ?? 0)
  await browser.close()
}
