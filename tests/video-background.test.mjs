import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

// Exercise the actual component effect with a deterministic media clock.
const compiled = ts.transpileModule(
  readFileSync(new URL('../src/components/VideoBackground.tsx', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
).outputText

function setup({ paused = false, rejectPlay = false } = {}) {
  const listeners = new Map()
  const documentListeners = new Map()
  const frames = new Map()
  const timers = new Map()
  let id = 0
  let effect
  const video = {
    currentTime: 0, duration: 8, paused: true, ended: false,
    style: { opacity: '0' }, playCalls: 0,
    play() {
      this.playCalls++
      if (rejectPlay) return Promise.reject(new Error('Autoplay denied'))
      this.paused = false
      listeners.get('playing')?.()
      return Promise.resolve()
    },
    pause() { this.paused = true },
    addEventListener(name, callback) { listeners.set(name, callback) },
    removeEventListener(name) { listeners.delete(name) },
  }
  const document = {
    hidden: false,
    addEventListener(name, callback) { documentListeners.set(name, callback) },
    removeEventListener(name) { documentListeners.delete(name) },
  }
  const exports = {}
  vm.runInNewContext(compiled, {
    exports, document,
    require(name) {
      if (name === 'react') return {
        useRef: () => ({ current: video }),
        useEffect: (callback) => { effect = callback },
      }
      if (name === 'react/jsx-runtime') return { jsx: (_type, props) => props }
      throw new Error(`Unexpected import: ${name}`)
    },
    requestAnimationFrame(callback) { frames.set(++id, callback); return id },
    cancelAnimationFrame(key) { frames.delete(key) },
    setTimeout(callback, delay) { timers.set(++id, { callback, delay }); return id },
    clearTimeout(key) { timers.delete(key) },
  })
  const props = exports.VideoBackground({ paused })
  const cleanup = effect()
  return {
    video, document, listeners, documentListeners, frames, timers, cleanup, props,
    step(time) {
      video.currentTime = time
      const pending = [...frames.values()]
      frames.clear()
      pending.forEach((callback) => callback())
    },
    visibility(hidden) {
      document.hidden = hidden
      documentListeners.get('visibilitychange')()
    },
  }
}

test('fades in and out against the media clock, without native looping', () => {
  const player = setup()
  assert.equal(player.props.loop, undefined)
  for (const [time, opacity] of [[0, 0], [0.25, 0.5], [0.5, 1], [4, 1], [7.75, 0.5], [8, 0]]) {
    player.step(time)
    assert.equal(Number(player.video.style.opacity), opacity)
    assert.equal(player.frames.size, 1)
  }
  player.cleanup()
})

test('restarts after 100ms and repeats the fade cycle', () => {
  const player = setup()
  player.step(7.9)
  player.video.ended = true
  player.listeners.get('ended')()
  assert.equal(player.video.style.opacity, '0')
  assert.equal(player.video.currentTime, 0)
  assert.equal(player.frames.size, 0)
  const timer = [...player.timers.values()][0]
  assert.equal(timer.delay, 100)
  player.video.ended = false
  timer.callback()
  assert.equal(player.video.playCalls, 2)
  player.step(0.25)
  assert.equal(player.video.style.opacity, '0.5')
  player.cleanup()
})

test('pause preferences prevent playback and hidden tabs suspend the frame loop', () => {
  const paused = setup({ paused: true })
  assert.equal(paused.video.playCalls, 0)
  assert.equal(paused.props.preload, 'none')
  paused.visibility(false)
  assert.equal(paused.video.playCalls, 0)
  paused.cleanup()
  const player = setup()
  player.visibility(true)
  assert.equal(player.video.paused, true)
  assert.equal(player.frames.size, 0)
  player.visibility(false)
  assert.equal(player.video.playCalls, 2)
  player.cleanup()
})

test('unmount removes listeners, pending restart and frame work', () => {
  const player = setup()
  player.listeners.get('ended')()
  player.cleanup()
  assert.equal(player.video.paused, true)
  for (const collection of [player.frames, player.timers, player.listeners, player.documentListeners]) {
    assert.equal(collection.size, 0)
  }
})

test('autoplay rejection and media failure preserve a quiet fallback', async () => {
  const rejected = setup({ rejectPlay: true })
  await Promise.resolve()
  assert.equal(rejected.video.style.opacity, '0')
  assert.equal(rejected.frames.size, 0)
  rejected.cleanup()
  const player = setup()
  player.step(2)
  player.listeners.get('error')()
  assert.equal(player.video.style.opacity, '0')
  assert.equal(player.frames.size, 0)
  player.cleanup()
})
