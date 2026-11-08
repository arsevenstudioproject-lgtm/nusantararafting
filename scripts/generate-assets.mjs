import { mkdir, writeFile } from 'node:fs/promises'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { createRaft } from '../src/game/raft.ts'

// GLTFExporter expects the browser FileReader API; Node's Blob supplies the data.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.() }) }
  readAsDataURL(blob) { blob.arrayBuffer().then(value => { this.result = `data:${blob.type};base64,${Buffer.from(value).toString('base64')}`; this.onloadend?.() }) }
}
await mkdir('public/models', { recursive: true })
const buffer = await new GLTFExporter().parseAsync(createRaft(), { binary: true })
await writeFile('public/models/expedition-raft.glb', Buffer.from(buffer))
console.log(`Generated original expedition raft: ${Math.round(buffer.byteLength / 1024)} KB`)
