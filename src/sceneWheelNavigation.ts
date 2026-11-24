const GESTURE_PAUSE_MS = 180
const POSITION_TOLERANCE = 2

export function setupSceneWheelNavigation(track: HTMLElement, header: HTMLElement, headline: HTMLElement) {
  const sections = Array.from(track.querySelectorAll<HTMLElement>('.sg-scene'))
  let lastWheelTime = -Infinity
  let gestureDirection = 0
  let handledGesture = false

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

    if (!event.cancelable || sections.length === 0) return

    for (let element = event.target instanceof Element ? event.target : null; element && element !== document.body; element = element.parentElement) {
      const style = window.getComputedStyle(element)
      if (/(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight) return
    }

    if (headline.scrollHeight > headline.clientHeight + 1 || sections.some((section) => section.offsetHeight > window.innerHeight + 1)) return

    const headerHeight = header.getBoundingClientRect().height
    const positions = sections.map((section) => Math.max(0, section.getBoundingClientRect().top + window.scrollY - headerHeight))
    const scrollY = window.scrollY
    if (scrollY < positions[0] - POSITION_TOLERANCE) return

    let index = 0
    while (index < positions.length - 1 && positions[index + 1] <= scrollY + POSITION_TOLERANCE) index += 1

    const targetIndex = direction > 0
      ? index + 1
      : scrollY > positions[index] + POSITION_TOLERANCE ? index : index - 1
    if (targetIndex < 0 || targetIndex >= positions.length) return

    event.preventDefault()
    handledGesture = true
    window.scrollTo({ top: positions[targetIndex], behavior: 'instant' })
  }

  window.addEventListener('wheel', onWheel, { passive: false })
  return () => window.removeEventListener('wheel', onWheel)
}
