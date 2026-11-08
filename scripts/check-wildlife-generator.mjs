import { chromium } from 'playwright'
import { readFile, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('dialog', async dialog => { errors.push(dialog.message()); await dialog.dismiss() })
  // The generator must work with every network request blocked.
  await page.route(/^https?:/, route => route.abort())
  await page.goto('file:///D:/Project%20Game/RiverRush/public/generator-rusa-ikan.html')
  await page.waitForFunction(() => document.querySelector('#poly-counter').textContent !== 'Segitiga: 0 tris')
  const cases = []
  async function download(species, animation) {
    await page.locator(`[data-${species}-anim="${animation}"]`).click()
    const downloaded = page.waitForEvent('download')
    await page.locator('#btn-export').click()
    const file = await downloaded
    const bytes = await readFile(await file.path())
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF')
    assert.equal(bytes.readUInt32LE(4), 2)
    assert.equal(bytes.readUInt32LE(8), bytes.length)
    const json = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)))
    assert.equal(json.animations[0].name, animation)
    assert.ok(json.meshes.length > 0)
    assert.ok(json.animations[0].channels.length >= (species === 'deer' ? 5 : 3))
    assert.ok(json.accessors.every(a => !a.min || a.min.every(Number.isFinite)))
    if (species === 'deer') {
      const binaryOffset = 28 + bytes.readUInt32LE(12)
      function readAccessor(index, vertex, component = 0) {
        const accessor = json.accessors[index]
        const view = json.bufferViews[accessor.bufferView]
        const size = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType]
        const width = accessor.type === 'VEC3' ? 3 : 1
        const offset = binaryOffset + (view.byteOffset || 0) + (accessor.byteOffset || 0) + vertex * (view.byteStride || width * size) + component * size
        return accessor.componentType === 5126 ? bytes.readFloatLE(offset) : size === 4 ? bytes.readUInt32LE(offset) : size === 2 ? bytes.readUInt16LE(offset) : bytes.readUInt8(offset)
      }
      const antlers = json.nodes.find(n => n.name === 'Sepasang_Tanduk')
      function checkAntler(node) {
        if (node.mesh !== undefined) for (const primitive of json.meshes[node.mesh].primitives) {
          const count = json.accessors[primitive.indices ?? primitive.attributes.POSITION].count
          let area = 0
          for (let t = 0; t < count; t += 3) {
            const vertices = [0, 1, 2].map(k => {
              const index = primitive.indices === undefined ? t + k : readAccessor(primitive.indices, t + k)
              return [0, 1, 2].map(c => readAccessor(primitive.attributes.POSITION, index, c))
            })
            const a = vertices[1].map((v, i) => v - vertices[0][i])
            const b = vertices[2].map((v, i) => v - vertices[0][i])
            area += Math.hypot(a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]) / 2
          }
          assert.ok(area > 0.00001, 'Antler mesh must have surface area')
        }
        for (const child of node.children || []) checkAntler(json.nodes[child])
      }
      checkAntler(antlers)
    }
    await file.saveAs('test-results/' + file.suggestedFilename())
    cases.push({ species, animation, bytes: bytes.length, channels: json.animations[0].channels.length })
    await page.waitForFunction(() => !document.querySelector('#btn-export').disabled)
  }
  for (const variant of ['royal', 'palmate', 'spike', 'doe']) {
    await page.locator(`[data-antler="${variant}"]`).click()
    await download('deer', 'walk')
  }
  await page.locator('[data-antler="royal"]').click()
  for (const mode of ['graze', 'walk', 'run']) await download('deer', mode)
  await page.locator('#tab-fish').click()
  for (const variant of ['trout', 'mahseer', 'koi']) await page.locator(`[data-fish="${variant}"]`).click()
  for (const mode of ['swim', 'dart', 'jump']) await download('fish', mode)
  for (const id of ['slider-fish-size', 'slider-fin-scale', 'slider-anim-speed']) {
    await page.locator('#' + id).evaluate(el => { el.value = el.max; el.dispatchEvent(new Event('input', { bubbles: true })) })
  }
  await page.locator('#btn-randomize').click()
  await page.screenshot({ path: 'test-results/wildlife-fish.png' })
  await page.locator('#tab-deer').click()
  for (const id of ['slider-spots', 'slider-antler-scale']) {
    await page.locator('#' + id).evaluate(el => { el.value = el.max; el.dispatchEvent(new Event('input', { bubbles: true })) })
  }
  await page.screenshot({ path: 'test-results/wildlife-deer.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'test-results/wildlife-mobile.png' })
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ cases, errors }, null, 2))
  await writeFile('test-results/wildlife-report.json', JSON.stringify({ cases, errors }, null, 2))
} finally { await browser.close() }
