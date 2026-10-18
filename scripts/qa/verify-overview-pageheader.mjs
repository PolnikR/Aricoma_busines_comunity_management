import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'

const runtime = process.env.PLAYWRIGHT_MODULE ?? 'node_modules/.cache/scroll-probe/node_modules/playwright-core/index.mjs'
const { chromium } = await import(pathToFileURL(resolve(runtime)).href)
const output = 'node_modules/.cache/overview-pageheader'
await mkdir(output, { recursive: true })

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const results = []
try {
  for (const [width, height] of [[1440, 1000], [1280, 600], [768, 1024], [390, 844], [320, 740]]) {
    const context = await browser.newContext({ viewport: { width, height } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (['warning', 'error'].includes(message.type())) errors.push(message.text()) })
    await page.goto(pathToFileURL(resolve('prototypes/dashboard-modern/overview-pageheader.html')).href)
    assert.equal(await page.getByRole('heading', { level: 1, name: 'Prehľad', exact: true }).count(), 1)
    assert.equal(await page.locator('.overall-kpi').count(), 4)
    assert.equal(await page.locator('.overall-panel').count(), 4)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow at ${width}`)
    await page.getByRole('button', { name: 'Hitachi VSP', exact: true }).click()
    assert.equal(await page.getByRole('button', { name: 'Hitachi VSP', exact: true }).getAttribute('aria-pressed'), 'true')
    assert.equal(await page.locator('.overall-donut').getAttribute('aria-label'), '92% pokrytie snímkami; 460 so snímkami, 40 bez snímok')
    assert.equal(await page.locator('.overall-kpi-value strong').nth(0).textContent(), '13')
    await page.getByRole('button', { name: 'Všetci', exact: true }).click()
    assert.equal(await page.locator('.overall-kpi-value strong').nth(1).textContent(), new Intl.NumberFormat('sk').format(1280))
    await page.screenshot({ path: `node_modules/.cache/overview-pageheader/light-${width}.png`, fullPage: true })
    await page.getByRole('button', { name: 'Tmavý režim' }).click()
    assert.equal(await page.locator('html').getAttribute('class'), 'dark')
    await page.screenshot({ path: `node_modules/.cache/overview-pageheader/dark-${width}.png`, fullPage: true })
    await page.getByRole('button', { name: 'Všetci', exact: true }).focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    assert.equal(await page.getByRole('button', { name: 'IBM FlashSystem', exact: true }).getAttribute('aria-pressed'), 'true')
    assert.deepEqual(errors, [])
    const clipped = await page.locator('.overall-resource-name strong, .overall-panel-header h2, .overall-kpi-title > span:first-child').evaluateAll(items => items.filter(item => item.scrollWidth > item.clientWidth + 1).map(item => item.textContent))
    assert.deepEqual(clipped, [], `clipped labels at ${width}`)
    results.push({ width, height, status: 'PASS', clipped })
    await context.close()
  }
  await writeFile(resolve(output, 'results.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
} finally { await browser.close() }
