import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { GlyphImage, type Scene } from './GlyphImage'
import './App.css'

gsap.registerPlugin(ScrollTrigger)

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const asset = (n: string, ext = 'webp') => new URL(`./assets/${n}.${ext}`, import.meta.url).href

const loadImageSource = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) resolve(img)
      else reject(new Error(`Invalid image dimensions: ${src}`))
    }
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })

type SceneConfig = {
  label: string
  headline?: string[] | string
  text: string
  threshold: number
  glyph: string | null
  background?: string | { blur?: string; window?: string } | null
}

// const BG = {
//   windowBlur: asset('bg-window-blur'),
//   window: asset('bg-window'),
// }

const PAGE_SCENES: SceneConfig[] = [
  {
    label: 'ABOUT US',
    headline: ['Guiding Healthcare', 'Solutions'],
    text: 'Strata Scientific helps digital health, medical device, and life sciences teams turn ideas into results by aligning strategy, execution, and growth.',
    threshold: 0.08,
    glyph: asset('anonymous', 'png'),
    background: null,
  },
  {
    label: 'EARLY\nINNOVATION',
    headline: ['Guiding Healthcare', 'Innovation.'],
    text: 'We help teams frame the right product opportunity, identify unmet needs, and turn early ideas into a stronger strategic direction.',
    threshold: 0.08,
    glyph: asset('light-bulb', 'png'),
    background: null,
  },
  {
    label: 'ROADMAP\nALIGNMENT',
    headline: ['Guiding Healthcare', 'Products.'],
    text: 'We align product priorities, technology choices, and corporate strategy so the roadmap is focused on the highest-value bets.',
    threshold: 0.08,
    glyph: asset('cat', 'png'),
    background: null,
  },
  {
    label: 'ENGINEERING\nOPTIMIZATION',
    headline: ['Guiding Healthcare', 'Engineering.'],
    text: 'We identify the process, capability, and execution gaps that slow delivery so engineering teams can move faster without sacrificing quality.',
    threshold: 0.03,
    glyph: asset('racecar', 'png'),
    background: null,
  },
  {
    label: 'TARGET\nSCREENING',
    headline: ['Guiding Healthcare', 'Investments.'],
    text: 'We evaluate acquisition, partnership, and licensing opportunities through the lens of technology, market fit, and strategic value.',
    threshold: 0.08,
    glyph: asset('galaxy', 'png'),
    background: null,
  },
  {
    label: 'TECHNICAL\nDUE DILIGENCE',
    headline: ['Guiding Healthcare', 'Technology.'],
    text: 'We pressure test the product, technology, and engineering organization to expose risks and reveal the real value behind the deal.',
    threshold: 0.08,
    glyph: asset('light-bulb', 'png'),
    background: null,
  },
  {
    label: 'POST MERGER\nINTEGRATION',
    headline: ['Guiding Healthcare', 'Integration.'],
    text: 'We help combine teams, product plans, and technical systems so the integration creates real operational and commercial momentum.',
    threshold: 0.08,
    glyph: asset('brain', 'png'),
    background: null,
  },
  {
    label: 'CONTACT US',
    headline: ['Guiding Healthcare', 'Outcomes.'],
    text: 'Have a healthcare product or technology challenge to discuss? Email hello@stratascientific.com or call +1 215.776.7791.',
    threshold: 0.08,
     glyph: asset('light-bulb', 'png'),
    background: null,
  },
]

function makeGlyphCanvas(label: string, variation: number) {
  const c = document.createElement('canvas')
  c.width = 1200
  c.height = 1400
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#02070b'
  ctx.fillRect(0, 0, c.width, c.height)

  ctx.fillStyle = '#f5f1e8'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 178px "IBM Plex Mono", monospace'
  const lines = label.split('\n')
  lines.forEach((line, index) => {
    const y = 600 + index * 180
    ctx.fillText(line, 600, y)
  })

  const glyphs = ['.', '-', ':', '+', '1', '0', '#', '*']
  for (let y = 260; y < 1140; y += 42) {
    for (let x = 140; x < 1060; x += 38) {
      const idx = ((x + y + variation * 17) / 25) % glyphs.length
      const g = glyphs[Math.floor(idx)]
      ctx.font = `${26 + ((x + y) % 18)}px "IBM Plex Mono", monospace`
      ctx.fillText(g, x + ((variation * 11) % 20), y)
    }
  }

  return c
}

const resolveBackground = (scene: SceneConfig | undefined) => {
  if (!scene?.background) return { blur: null, window: null }
  if (typeof scene.background === 'string') return { blur: scene.background, window: scene.background }
  return {
    blur: scene.background.blur ?? null,
    window: scene.background.window ?? null,
  }
}

const smooth = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export default function App() {
  const trackRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fieldRef = useRef<GlyphImage | null>(null)
  const chapterRef = useRef(0)
  const reduced = usePrefersReducedMotion()
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [activeSceneIndex, setActiveSceneIndex] = useState(0)

  const visibleBackground = resolveBackground(PAGE_SCENES[activeSceneIndex])

  useEffect(() => {
    let alive = true
    let cleanup = () => {}

    Promise.all([
      document.fonts?.load('italic 100px "Instrument Serif"').catch(() => null),
      document.fonts?.load('500 12px "IBM Plex Mono"').catch(() => null),
    ])
      .then(async () => {
        const stage = stageRef.current
        const canvas = canvasRef.current
        if (!alive || !stage || !canvas) return

        const scenes: Scene[] = await Promise.all(PAGE_SCENES.map(async ({ label, threshold, glyph }, index) => {
          const sceneSource = glyph
            ? await loadImageSource(glyph).catch(() => makeGlyphCanvas(label, index))
            : makeGlyphCanvas(label, index)

          return {
            source: sceneSource,
            threshold,
            rect: (w, h) => {
              const mobile = window.matchMedia('(max-width: 760px)').matches
              const hh = mobile ? Math.min(h * 0.86, w * 0.9 / 0.7) : Math.min(h * 0.7, w * 0.4 / 0.7)
              return {
                cx: mobile ? w * 0.5 : w * 0.75,
                cy: h * 0.5,
                w: hh * 0.7,
                h: hh,
              }
            },
          }
        }))

        if (!alive) return
        const field = new GlyphImage(canvas, scenes)
        field.reduced = reduced
        fieldRef.current = field
        field.resize(stage.clientWidth, stage.clientHeight)
        field.setStory(chapterRef.current, 0)
        setState('ready')

        let running = false
        let inView = true
        const tick = (_t: number, dtMs: number) => field.step(dtMs / 1000)
        const sync = () => {
          const want = inView && !document.hidden
          if (want && !running) gsap.ticker.add(tick)
          if (!want && running) gsap.ticker.remove(tick)
          running = want
        }

        const io = new IntersectionObserver(([e]) => {
          inView = e.isIntersecting
          sync()
        })
        if (trackRef.current) io.observe(trackRef.current)
        document.addEventListener('visibilitychange', sync)
        sync()

        let rw = stage.clientWidth
        let rh = stage.clientHeight
        const ro = new ResizeObserver(() => {
          if (Math.abs(stage.clientWidth - rw) < 2 && Math.abs(stage.clientHeight - rh) < 2) return
          rw = stage.clientWidth
          rh = stage.clientHeight
          field.resize(rw, rh)
        })
        ro.observe(stage)

        cleanup = () => {
          gsap.ticker.remove(tick)
          io.disconnect()
          ro.disconnect()
          document.removeEventListener('visibilitychange', sync)
          fieldRef.current = null
        }
      })
      .catch((err) => {
        console.warn('[landing-page]', err)
        if (alive) setState('error')
      })

    return () => {
      alive = false
      cleanup()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (fieldRef.current) fieldRef.current.reduced = reduced
  }, [reduced, state])

  useEffect(() => {
    const track = trackRef.current
    const stage = stageRef.current
    if (!track || !stage) return

    const local = (x: number, y: number) => {
      const r = stage.getBoundingClientRect()
      return { x: x - r.left, y: y - r.top }
    }

    const onUi = (t: EventTarget | null) => t instanceof Element && !!t.closest('button, a')

    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const p = local(e.clientX, e.clientY)
      fieldRef.current?.pointer(p.x, p.y)
    }

    const down = (e: PointerEvent) => {
      if (onUi(e.target)) return
      const p = local(e.clientX, e.clientY)
      fieldRef.current?.pulse(p.x, p.y)
    }

    const touch = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t || onUi(e.target)) return
      const p = local(t.clientX, t.clientY)
      fieldRef.current?.pointer(p.x, p.y)
    }

    const leave = (e: PointerEvent) => e.pointerType !== 'touch' && fieldRef.current?.leave()

    track.addEventListener('pointermove', move)
    track.addEventListener('pointerdown', down)
    track.addEventListener('pointerleave', leave)
    track.addEventListener('touchstart', touch, { passive: true })
    track.addEventListener('touchmove', touch, { passive: true })

    return () => {
      track.removeEventListener('pointermove', move)
      track.removeEventListener('pointerdown', down)
      track.removeEventListener('pointerleave', leave)
      track.removeEventListener('touchstart', touch)
      track.removeEventListener('touchmove', touch)
    }
  }, [])

  useEffect(() => {
    if (reduced) return
    const lenis = new Lenis({ lerp: 0.085 })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [reduced])

  useIsomorphicLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return

    const ctx = gsap.context(() => {
      const sections = Array.from(track.querySelectorAll<HTMLElement>('.sg-scene'))
      const apply = () => {
        const header = document.querySelector<HTMLElement>('.sg-top')
        const top = header?.getBoundingClientRect().height ?? 0
        const positions = sections.map((section) => section.getBoundingClientRect().top - top)
        let index = 0
        while (index < positions.length - 1 && positions[index + 1] <= 0) index += 1
        const next = positions[index + 1]
        const distance = next === undefined ? 0 : next - positions[index]
        const local = distance > 0 ? Math.max(0, Math.min(1, -positions[index] / distance)) : 0
        const chapter = index + (reduced ? 0 : smooth(0.65, 1, local))
        chapterRef.current = chapter
        setActiveSceneIndex((current) => (current === index ? current : index))
        fieldRef.current?.setStory(chapter, 0)
      }

      ScrollTrigger.create({
        trigger: track,
        start: 'top bottom',
        end: 'bottom bottom',
        onUpdate: apply,
        onRefresh: apply,
      })

      apply()
    }, stageRef)

    return () => {
      ctx.revert()
    }
  }, [reduced])

  return (
    <main id="top" className="sg-root" data-state={state} data-active-scene={activeSceneIndex}>
      <a className="sg-skip" href="#scene-1">Skip to content</a>
      <header className="sg-top">
        <a className="sg-top__brand" href="#top">Strata Scientific</a>
        <nav className="sg-top__r" aria-label="Contact">
          <a href="mailto:hello@stratascientific.com" aria-label="Email Strata Scientific">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            <span className="sg-top__label">hello@stratascientific.com</span>
          </a>
          <a href="tel:+12157767791" aria-label="Call Strata Scientific">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.2-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.8 2.1Z" />
            </svg>
            <span className="sg-top__label">+1 215.776.7791</span>
          </a>
        </nav>
      </header>
      <section ref={trackRef} className="sg-track" aria-label="Strata Scientific services">
        <div ref={stageRef} className="sg-stage" aria-hidden="true">
          <div className="sg-bg" aria-hidden="true">
            <div className="sg-bg__in">
              {visibleBackground.blur && (
                <img className="sg-bg__img sg-bg--wblur" src={visibleBackground.blur} alt="" />
              )}
              {visibleBackground.window && (
                <img className="sg-bg__img sg-bg--window" src={visibleBackground.window} alt="" />
              )}
            </div>
          </div>
          <div className="sg-shade" aria-hidden="true" />
          <canvas ref={canvasRef} className="sg-glyphs" />
          <div className="sg-grain" aria-hidden="true" />
        </div>
        <div className="sg-scenes">
          {PAGE_SCENES.map((scene, index) => {
            const headlineLines = Array.isArray(scene.headline)
              ? scene.headline
              : (typeof scene.headline === 'string' && scene.headline.trim().length > 0
                ? scene.headline.split(/\s*\|\s*/)
                : [])
            const Heading = index === 0 ? 'h1' : 'h2'

            return (
              <article
                id={`scene-${index + 1}`}
                key={scene.label}
                className="sg-scene"
                aria-labelledby={`scene-${index + 1}-heading`}
              >
                <div className="sg-scene__content">
                  {headlineLines.length > 0 && (
                    <Heading id={`scene-${index + 1}-heading`} className="sg-head">
                      {headlineLines.map((line, lineIndex) => (
                        <span key={`${line}-${lineIndex}`} className="sg-head__line">
                          {lineIndex === 1 ? <em>{line}</em> : line}
                          {lineIndex < headlineLines.length - 1 ? ' ' : null}
                        </span>
                      ))}
                    </Heading>
                  )}
                  <p className="sg-ch">{scene.label.replace(/\n/g, ' ')}</p>
                  <p className="sg-copy">
                    {scene.text.split(/(hello@stratascientific\.com|\+1 215\.776\.7791)/).map((part, partIndex) => {
                      if (part === 'hello@stratascientific.com') {
                        return <a key={partIndex} href="mailto:hello@stratascientific.com">{part}</a>
                      }
                      if (part === '+1 215.776.7791') {
                        return <a key={partIndex} href="tel:+12157767791">{part}</a>
                      }
                      return part
                    })}
                  </p>
                  {index < PAGE_SCENES.length - 1 && (
                    <a className="sg-scene__next" href={`#scene-${index + 2}`}>
                      Explore {PAGE_SCENES[index + 1].label.replace(/\n/g, ' ').toLowerCase()}
                      <span aria-hidden="true">↓</span>
                    </a>
                  )}
                </div>
                <span className="sg-scene__index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')} / {String(PAGE_SCENES.length).padStart(2, '0')}
                </span>
              </article>
            )
          })}
        </div>
      </section>
      {state === 'error' && (
        <p className="sg-status" role="status">
          The animation is unavailable, but all page content is still available.
        </p>
      )}
      <footer className="sg-footer">
        <div className="sg-footer__content">
          <div className="sg-footer__left">&copy; 2027 Strata Scientific LLC</div>
          <div className="sg-footer__right">All Rights Reserved.</div>
        </div>
      </footer>
    </main>
  )
}
