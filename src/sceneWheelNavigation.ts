const GESTURE_PAUSE_MS = 120
const POSITION_TOLERANCE = 2
const SWIPE_THRESHOLD = 30

export function setupSceneWheelNavigation(track: HTMLElement, header: HTMLElement, headline: HTMLElement) {
  const sections = Array.from(track.querySelectorAll<HTMLElement>('.sg-scene'))
  let lastWheelTime = -Infinity
  let gestureDirection = 0
  let handledGesture = false
  let touch: { x: number; y: number; target: EventTarget | null; direction: number; destination: number | null; moved: boolean } | null = null

  const sceneDestination = (direction: number, target: EventTarget | null): number | null => {
    if (sections.length === 0) return null

    for (let element = target instanceof Element ? target : null; element && element !== document.body; element = element.parentElement) {
      const style = window.getComputedStyle(element)
      if (/(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight) return null
    }

    if (headline.scrollHeight > headline.clientHeight + 1 || sections.some((section) => section.offsetHeight > window.innerHeight + 1)) return null

    const headerHeight = header.getBoundingClientRect().height
    const positions = sections.map((section) => Math.max(0, section.getBoundingClientRect().top + window.scrollY - headerHeight))
    const scrollY = window.scrollY
    if (scrollY < positions[0] - POSITION_TOLERANCE) return null

    let index = 0
    while (index < positions.length - 1 && positions[index + 1] <= scrollY + POSITION_TOLERANCE) index += 1

    const footerVisible = index === positions.length - 1
      && track.getBoundingClientRect().bottom < window.innerHeight - POSITION_TOLERANCE
    const targetIndex = direction > 0
      ? index + 1
      : scrollY > positions[index] + POSITION_TOLERANCE && !footerVisible ? index : index - 1
    if (targetIndex < 0 || targetIndex >= positions.length) return null
    return positions[targetIndex]
  }

  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.deltaY === 0 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return

    const direction = Math.sign(event.deltaY)
    const isNewGesture = event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL
      || event.timeStamp - lastWheelTime > GESTURE_PAUSE_MS
      || direction !== gestureDirection
    lastWheelTime = event.timeStamp
    gestureDirection = direction

    if (!isNewGesture) {
      if (handledGesture && event.cancelable) event.preventDefault()
      return
    }
    handledGesture = false

    if (!event.cancelable) return
    const destination = sceneDestination(direction, event.target)
    if (destination === null) return

    event.preventDefault()
    handledGesture = true
    window.scrollTo({ top: destination, behavior: 'instant' })
  }

  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1 || (event.target instanceof Element && event.target.closest('a, button, input, select, textarea, [contenteditable]'))) {
      touch = null
      return
    }
    const point = event.touches[0]
    touch = { x: point.clientX, y: point.clientY, target: event.target, direction: 0, destination: null, moved: false }
  }

  const onTouchMove = (event: TouchEvent) => {
    if (!touch) return
    if (event.touches.length !== 1 || !event.cancelable) {
      touch = null
      return
    }

    const dx = event.touches[0].clientX - touch.x
    const dy = touch.y - event.touches[0].clientY
    if (touch.direction === 0) {
      if (dy === 0) return
      if (Math.abs(dx) >= Math.abs(dy)) {
        touch = null
        return
      }
      touch.direction = Math.sign(dy)
      touch.destination = sceneDestination(touch.direction, touch.target)
      if (touch.destination === null) {
        touch = null
        return
      }
    }

    event.preventDefault()
    if (!touch.moved && touch.destination !== null && dy * touch.direction >= SWIPE_THRESHOLD) {
      touch.moved = true
      window.scrollTo({ top: touch.destination, behavior: 'instant' })
    }
  }

  const onTouchEnd = () => { touch = null }

  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd)
  window.addEventListener('touchcancel', onTouchEnd)
  return () => {
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', onTouchEnd)
    window.removeEventListener('touchcancel', onTouchEnd)
  }
}
