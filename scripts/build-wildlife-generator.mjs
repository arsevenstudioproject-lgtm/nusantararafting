import { readFile, writeFile } from 'node:fs/promises'
import { build } from 'esbuild'
const path = 'public/generator-rusa-ikan.html'
const html = await readFile(path, 'utf8')
const source = await readFile('scripts/wildlife-generator.mjs', 'utf8')
const bundle = await build({ stdin: { contents: source, resolveDir: process.cwd(), loader: 'js' }, bundle: true, format: 'iife', minify: true, write: false, legalComments: 'inline' })
const updated = html.replace(/(<script type="module">)[\s\S]*?(<\/script>)/, (_, start, end) => start + '\n' + bundle.outputFiles[0].text.replaceAll('</script', '<\\/script') + '\n' + end)
if (updated === html) throw new Error('Generator script was not replaced')
await writeFile(path, updated)
