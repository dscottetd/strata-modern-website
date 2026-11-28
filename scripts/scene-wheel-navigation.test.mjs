import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { setupSceneWheelNavigation } from '../src/sceneWheelNavigation.ts'

const originalGlobals = {
  window: globalThis.window,
  document: globalThis.document,
  Element: globalThis.Element,
  WheelEvent: globalThis.WheelEvent,
}

afterEach(() => {
  Object.assign(globalThis, originalGlobals)
})

function fixture() {
  class Element {
    parentElement = null
    scrollHeight = 0
    clientHeight = 0
    overflowY = 'visible'
    interactive = false
    closest() { return this.interactive ? this : null }
  }
  const body = new Element()
  const handlers = new Map()
  const win = {
    scrollY: 0,
    innerHeight: 800,
    addEventListener: (type, listener) => { handlers.set(type, listener) },
    removeEventListener: (type, listener) => { if (handlers.get(type) === listener) handlers.delete(type) },
    getComputedStyle: (element) => element,
    scrollTo: ({ top }) => { win.scrollY = top },
  }
  globalThis.window = win
  globalThis.document = { body }
  globalThis.Element = Element
  globalThis.WheelEvent = { DOM_DELTA_PIXEL: 0 }

  const sections = [0, 800, 1600].map((top) => ({
    offsetHeight: 800,
    getBoundingClientRect: () => ({ top: top + 68 - win.scrollY }),
  }))
  const track = {
    querySelectorAll: () => sections,
    getBoundingClientRect: () => ({ bottom: 2468 - win.scrollY }),
  }
  const header = { getBoundingClientRect: () => ({ height: 68 }) }
  const headline = { scrollHeight: 700, clientHeight: 700 }
  const cleanup = setupSceneWheelNavigation(track, header, headline)
  const wheel = (options = {}) => {
    const event = {
      deltaX: 0, deltaY: 100, deltaMode: 0, timeStamp: 0, cancelable: true,
      ctrlKey: false, metaKey: false, shiftKey: false, target: body,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true },
      ...options,
    }
    handlers.get('wheel')?.(event)
    return event
  }
  const touch = (type, options = {}) => {
    const event = {
      touches: [{ clientX: 100, clientY: 400 }],
      target: body,
      cancelable: true,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true },
      ...options,
    }
    handlers.get(type)?.(event)
    return event
  }
  const key = (type, options = {}) => {
    const event = {
      key: 'ArrowDown', repeat: false, cancelable: true,
      ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, target: body,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true },
      ...options,
    }
    handlers.get(type)?.(event)
    return event
  }
  const blur = () => handlers.get('blur')?.()
  return { win, sections, headline, Element, wheel, touch, key, blur, cleanup }
}

test('one pixel-wheel gesture advances one scene and a new gesture advances again', () => {
  const { win, wheel } = fixture()
  assert.equal(wheel().defaultPrevented, true)
  assert.equal(win.scrollY, 800)
  assert.equal(wheel({ timeStamp: 20 }).defaultPrevented, true)
  assert.equal(win.scrollY, 800)
  wheel({ timeStamp: 141 })
  assert.equal(win.scrollY, 1600)
  wheel({ timeStamp: 500, deltaY: -100 })
  assert.equal(win.scrollY, 800)
})

test('discrete wheel notches navigate independently and footer remains reachable', () => {
  const { win, wheel } = fixture()
  wheel({ deltaMode: 1 })
  wheel({ deltaMode: 1, timeStamp: 10 })
  assert.equal(win.scrollY, 1600)
  assert.equal(wheel({ deltaMode: 1, timeStamp: 20 }).defaultPrevented, false)
  win.scrollY = 1660
  wheel({ deltaMode: 1, timeStamp: 30, deltaY: -1 })
  assert.equal(win.scrollY, 1600)
  wheel({ deltaMode: 1, timeStamp: 40, deltaY: -1 })
  assert.equal(win.scrollY, 800)
})

test('scrolling up from the footer moves to the previous scene without repeating the gesture', () => {
  const { win, wheel } = fixture()
  win.scrollY = 1738
  wheel({ deltaY: -10 })
  assert.equal(win.scrollY, 800)
  for (let timeStamp = 100; timeStamp <= 1000; timeStamp += 100) {
    assert.equal(wheel({ deltaY: -10, timeStamp }).defaultPrevented, true)
    assert.equal(win.scrollY, 800)
  }
  wheel({ deltaY: -10, timeStamp: 1250 })
  assert.equal(win.scrollY, 0)
})

test('direction changes and native intermediate positions select the adjacent scene', () => {
  const { win, wheel } = fixture()
  assert.equal(wheel({ deltaY: -10 }).defaultPrevented, false)
  win.scrollY = 350
  wheel({ timeStamp: 200 })
  assert.equal(win.scrollY, 800)
  wheel({ timeStamp: 210, deltaY: -20 })
  assert.equal(win.scrollY, 0)
  win.scrollY = 350
  wheel({ timeStamp: 400, deltaY: -20 })
  assert.equal(win.scrollY, 0)
})

test('native scrolling is preserved for zoom, nested scrollers and oversized layouts', () => {
  const { win, wheel, headline, sections, Element, cleanup } = fixture()
  assert.equal(wheel({ ctrlKey: true }).defaultPrevented, false)
  assert.equal(wheel({ deltaX: 120, deltaY: 10 }).defaultPrevented, false)
  assert.equal(wheel({ cancelable: false, timeStamp: 10 }).defaultPrevented, false)
  const nested = new Element()
  nested.overflowY = 'auto'
  nested.scrollHeight = 200
  nested.clientHeight = 100
  assert.equal(wheel({ target: nested, timeStamp: 200 }).defaultPrevented, false)
  headline.scrollHeight = 701
  headline.clientHeight = 699
  assert.equal(wheel({ timeStamp: 400 }).defaultPrevented, false)
  headline.scrollHeight = 700
  headline.clientHeight = 700
  sections[0].offsetHeight = 900
  assert.equal(wheel({ timeStamp: 600 }).defaultPrevented, false)
  assert.equal(win.scrollY, 0)
  cleanup()
  assert.equal(wheel({ timeStamp: 800 }).defaultPrevented, false)
})

test('one swipe moves one scene in either direction, including from the footer', () => {
  const { win, touch } = fixture()
  touch('touchstart')
  assert.equal(touch('touchmove', { touches: [{ clientX: 100, clientY: 395 }] }).defaultPrevented, true)
  assert.equal(win.scrollY, 0)
  touch('touchmove', { touches: [{ clientX: 100, clientY: 350 }] })
  touch('touchmove', { touches: [{ clientX: 100, clientY: 100 }] })
  assert.equal(win.scrollY, 800)
  touch('touchend', { touches: [] })
  win.scrollY = 1738
  touch('touchstart')
  touch('touchmove', { touches: [{ clientX: 100, clientY: 450 }] })
  assert.equal(win.scrollY, 800)
  touch('touchend', { touches: [] })
  touch('touchstart')
  touch('touchmove', { touches: [{ clientX: 100, clientY: 450 }] })
  assert.equal(win.scrollY, 0)
})

test('swipes leave pinch zoom, horizontal gestures, nested scrollers and oversized content native', () => {
  const { win, headline, Element, touch, cleanup } = fixture()
  const point = { clientX: 100, clientY: 400 }
  touch('touchstart')
  assert.equal(touch('touchmove', { touches: [point, point] }).defaultPrevented, false)
  assert.equal(touch('touchmove', { touches: [{ clientX: 100, clientY: 300 }] }).defaultPrevented, false)
  touch('touchstart')
  assert.equal(touch('touchmove', { touches: [{ clientX: 200, clientY: 390 }] }).defaultPrevented, false)
  const nested = new Element()
  nested.overflowY = 'auto'
  nested.scrollHeight = 200
  nested.clientHeight = 100
  touch('touchstart', { target: nested })
  assert.equal(touch('touchmove', { touches: [{ clientX: 100, clientY: 300 }] }).defaultPrevented, false)
  headline.scrollHeight = 800
  touch('touchstart')
  assert.equal(touch('touchmove', { touches: [{ clientX: 100, clientY: 300 }] }).defaultPrevented, false)
  headline.scrollHeight = 700
  const link = new Element()
  link.interactive = true
  touch('touchstart', { target: link })
  assert.equal(touch('touchmove', { touches: [{ clientX: 100, clientY: 300 }] }).defaultPrevented, false)
  win.scrollY = 1600
  touch('touchstart')
  assert.equal(touch('touchmove', { touches: [{ clientX: 100, clientY: 300 }] }).defaultPrevented, false)
  cleanup()
  touch('touchstart')
  assert.equal(touch('touchmove', { touches: [{ clientX: 100, clientY: 300 }] }).defaultPrevented, false)
  assert.equal(win.scrollY, 1600)
})

test('arrow presses navigate scenes once until release, including from the footer', () => {
  const { win, key } = fixture()
  assert.equal(key('keydown').defaultPrevented, true)
  assert.equal(win.scrollY, 800)
  assert.equal(key('keydown', { repeat: true }).defaultPrevented, true)
  assert.equal(win.scrollY, 800)
  key('keyup')
  key('keydown')
  assert.equal(win.scrollY, 1600)
  key('keyup')
  assert.equal(key('keydown').defaultPrevented, false)
  assert.equal(key('keydown', { repeat: true }).defaultPrevented, false)
  win.scrollY = 1738
  assert.equal(key('keydown', { key: 'ArrowUp' }).defaultPrevented, true)
  assert.equal(win.scrollY, 800)
  key('keyup', { key: 'ArrowUp' })
  key('keydown', { key: 'ArrowUp' })
  assert.equal(win.scrollY, 0)
  key('keyup', { key: 'ArrowUp' })
  assert.equal(key('keydown', { key: 'ArrowUp' }).defaultPrevented, false)
})

test('arrow navigation preserves native control and scrolling behavior', () => {
  const { win, sections, headline, Element, key, blur, cleanup } = fixture()
  const control = new Element()
  control.interactive = true
  assert.equal(key('keydown', { target: control }).defaultPrevented, false)
  const nested = new Element()
  nested.overflowY = 'auto'
  nested.scrollHeight = 200
  nested.clientHeight = 100
  assert.equal(key('keydown', { target: nested }).defaultPrevented, false)
  for (const options of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }, { key: 'PageDown' }, { cancelable: false }, { defaultPrevented: true }]) {
    key('keydown', options)
    assert.equal(win.scrollY, 0)
  }
  headline.scrollHeight = 702
  assert.equal(key('keydown').defaultPrevented, false)
  headline.scrollHeight = 700
  sections[0].offsetHeight = 900
  assert.equal(key('keydown').defaultPrevented, false)
  sections[0].offsetHeight = 800
  key('keydown')
  assert.equal(win.scrollY, 800)
  blur()
  assert.equal(key('keydown', { repeat: true }).defaultPrevented, false)
  cleanup()
  assert.equal(key('keydown').defaultPrevented, false)
  assert.equal(win.scrollY, 800)
})
