import { mkdir, copyFile, writeFile, access } from 'node:fs/promises'

await mkdir('public/vision', { recursive: true })
await mkdir('public/fonts', { recursive: true })
for (const name of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']) {
  await copyFile(`node_modules/@mediapipe/tasks-vision/wasm/${name}`, `public/vision/${name}`)
}
const modelPath = 'public/vision/face_landmarker.task'
try { await access(modelPath) }
catch {
  const response = await fetch('https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task')
  if (!response.ok) throw new Error(`Model download: ${response.status}`)
  await writeFile(modelPath, Buffer.from(await response.arrayBuffer()))
}
const response = await fetch('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap', {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' },
})
if (!response.ok) throw new Error(`Font download: ${response.status}`)
const css = await response.text()
const latin = [...css.matchAll(/\/\* latin \*\/\s*(@font-face\s*\{[^}]+\})/g)].map(match => match[1])
const blocks = latin.length ? latin : [...css.matchAll(/@font-face\s*\{[^}]+\}/g)].map(match => match[0])
if (!blocks.length) throw new Error('No font styles received')
let index = 0
const localCss = []
const cached = new Map()
for (const block of blocks) {
  const url = block.match(/url\(([^)]+)\)/)[1]
  let filename = cached.get(url)
  if (!filename) {
    filename = `river-font-${index++}.${url.includes('.woff2') ? 'woff2' : 'ttf'}`
    const font = await fetch(url)
    if (!font.ok) throw new Error(`Font: ${font.status}`)
    await writeFile(`public/fonts/${filename}`, Buffer.from(await font.arrayBuffer()))
    cached.set(url, filename)
  }
  localCss.push(block.replace(url, `/fonts/${filename}`))
}
await writeFile('src/fonts.css', localCss.join('\n'))
for (const family of ['dmsans', 'barlowcondensed']) {
  const license = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${family}/OFL.txt`)
  if (!license.ok) throw new Error(`Font license: ${license.status}`)
  await writeFile(`public/fonts/${family}-OFL.txt`, await license.text())
}
console.log('Local MediaPipe model, WASM, fonts, and font licenses prepared.')
