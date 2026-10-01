import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)
export function loadTypeScript(filename, mocks = {}, cache = new Map(), globals = {}) {
  const path = resolve(filename)
  if (cache.has(path)) return cache.get(path)
  const exports = {}
  cache.set(path, exports)
  const source = readFileSync(path, 'utf8').replaceAll('import.meta.env.DEV', 'false').replaceAll('import.meta.env.VITE_API_BASE_URL', "'http://localhost:8000'")
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } })
  vm.runInNewContext(outputText, {
    exports, console, Error, Date, URL, URLSearchParams, setTimeout, clearTimeout, setInterval, clearInterval, AbortController, fetch, ...globals,
    require(name) {
      if (name in mocks) return mocks[name]
      if (name.startsWith('.')) {
        const target = resolve(dirname(path), name)
        let filename = `${target}.ts`
        try { readFileSync(filename) } catch { filename = `${target}.tsx` }
        return loadTypeScript(filename, mocks, cache, globals)
      }
      return require(name)
    },
  }, { filename: path })
  return exports
}
