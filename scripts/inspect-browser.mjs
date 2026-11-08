import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
await mkdir('test-results', { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const errors = [], warnings = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); if (msg.type() === 'warning') warnings.push(msg.text()) })
await page.goto('http://127.0.0.1:5173')
try { await page.waitForFunction(() => window.__riverRush?.state.ready || document.querySelector('.error-overlay'), { timeout: 60000 }) } catch {}
await page.waitForTimeout(2500)
await page.screenshot({ path: 'test-results/menu.png' })
console.log(JSON.stringify({ errors, warnings, debug: await page.evaluate(() => window.__riverRush?.debug()), text: (await page.locator('body').innerText()).slice(-500) }, null, 2))
if (!errors.length && await page.getByRole('button', { name: 'MULAI PETUALANGAN' }).isEnabled()) {
  await page.getByRole('button', { name: 'MULAI PETUALANGAN' }).click()
  await page.waitForTimeout(3000)
  await page.screenshot({ path: 'test-results/gameplay.png' })
  console.log('Gameplay:', JSON.stringify(await page.evaluate(() => window.__riverRush.debug())))
}
await writeFile('test-results/initial-inspection.json', JSON.stringify({ errors, warnings }, null, 2))
await browser.close()
