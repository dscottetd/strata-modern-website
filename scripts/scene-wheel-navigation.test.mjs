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
  }
  const body = new Element()
  let handler
  const win = {
    scrollY: 0,
    innerHeight: 800,
    addEventListener: (_type, listener) => { handler = listener },
    removeEventListener: (_type, listener) => { if (handler === listener) handler = undefined },
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
  const track = { querySelectorAll: () => sections }
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
    handler?.(event)
    return event
  }
  return { win, sections, headline, Element, wheel, cleanup }
}

test('one pixel-wheel gesture advances one scene and a new gesture advances again', () => {
  const { win, wheel } = fixture()
  assert.equal(wheel().defaultPrevented, true)
  assert.equal(win.scrollY, 800)
  assert.equal(wheel({ timeStamp: 20 }).defaultPrevented, true)
  assert.equal(win.scrollY, 800)
  wheel({ timeStamp: 250 })
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
