import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
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
  slug: string
  label: string
  headline: string[]
  text: string
  threshold: number
  glyph: string
  /** glyph size multiplier; defaults to 1.0 */
  glyphScale?: number
}

const PAGE_SCENES: SceneConfig[] = [
  {
    slug: 'about-us',
    label: 'WHAT WE DO',
    headline: ['Guiding Healthcare', 'Solutions'],
    text: 'Strata Scientific helps digital health, medical device, and life sciences teams turn ideas into results by aligning strategy, execution, and growth.',
    threshold: 0.05,
    glyph: asset('spiral', 'png'),
    glyphScale: 1.0,
  },
  {
    slug: 'early-innovation',
    label: 'EARLY\nINNOVATION',
    headline: ['Guiding Healthcare', 'Innovation'],
    text: 'We help teams frame the right product opportunity, identify unmet needs, and turn early ideas into a stronger strategic direction with a clear path forward.',
    threshold: 0.08,
    glyph: asset('light-bulb', 'png'),
    glyphScale: 0.95,
  },
  {
    slug: 'roadmap-alignment',
    label: 'ROADMAP\nALIGNMENT',
    headline: ['Guiding Healthcare', 'Products'],
    text: 'We align product priorities, technology choices, and corporate strategy so the roadmap is focused on the highest-value bets and teams stay focused.',
    threshold: 0.1,
    glyph: asset('hexagon', 'png'),
    glyphScale: 1.1,
  },
  {
    slug: 'engineering-optimization',
    label: 'ENGINEERING\nOPTIMIZATION',
    headline: ['Guiding Healthcare', 'Engineering'],
    text: 'We identify the process, capability, and execution gaps that slow delivery so engineering teams can move faster without sacrificing quality.',
    threshold: 0.08,
    glyph: asset('gears', 'png'),
    glyphScale: 0.9,
  },
  {
    slug: 'target-screening',
    label: 'TARGET\nSCREENING',
    headline: ['Guiding Healthcare', 'Investments'],
    text: 'We evaluate acquisition, partnership, and licensing opportunities through the lens of technology, market fit, and strategic value to inform confident decisions.',
    threshold: 0.08,
    glyph: asset('bull', 'png'),
    glyphScale: 0.9,
  },
  {
    slug: 'technical-due-diligence',
    label: 'TECHNICAL\nDUE DILIGENCE',
    headline: ['Guiding Healthcare', 'Technology'],
    text: 'We pressure test the product, technology, and engineering organization to expose risks, reveal the real value behind the deal, and clarify the path forward.',
    threshold: 0.04,
    glyph: asset('science', 'png'),
    glyphScale: 1.0,
  },
  {
    slug: 'post-merger-integration',
    label: 'POST MERGER\nINTEGRATION',
    headline: ['Guiding Healthcare', 'Integration'],
    text: 'We help combine teams, product plans, and technical systems so the integration creates real operational and commercial momentum with clear ownership.',
    threshold: 0.25,
    glyph: asset('puzzle', 'png'),
    glyphScale: 1.0,
  },
  {
    slug: 'contact-us',
    label: 'CONTACT US',
    headline: ['Guiding Healthcare', 'Outcomes'],
    text: 'Have a healthcare product or technology challenge to discuss? Email hello@stratascientific.com or call +1 215.776.7791. We would be glad to talk.',
    threshold: 0.08,
    glyph: asset('mountain', 'png'),
    glyphScale: 1.2,
  },
]

function TypedHeadingWord({ word, reduced }: { word: string; reduced: boolean }) {
  const [visibleLength, setVisibleLength] = useState(reduced ? word.length : 0)

  useEffect(() => {
    if (reduced) {
      setVisibleLength(word.length)
      return
    }

    setVisibleLength(0)
    let length = 0
    const interval = window.setInterval(() => {
      length += 1
      setVisibleLength(length)
      if (length >= word.length) window.clearInterval(interval)
    }, 75)

    return () => window.clearInterval(interval)
  }, [reduced, word])

  return (
    <em>
      <span className={!reduced && visibleLength < word.length ? 'sg-head__typed' : undefined} aria-hidden="true">
        {word.slice(0, visibleLength)}
      </span>
    </em>
  )
}

function ActiveHeading({ lines, reduced }: { lines: string[]; reduced: boolean }) {
  return (
    <h1 className="sg-head" aria-label={lines.join(' ')}>
      {lines.map((line, lineIndex) => (
        <span key={lineIndex} className="sg-head__line">
          {lineIndex === 1 ? <TypedHeadingWord key={line} word={line} reduced={reduced} /> : line}
          {lineIndex < lines.length - 1 ? ' ' : null}
        </span>
      ))}
    </h1>
  )
}

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

  const active = PAGE_SCENES[activeSceneIndex]

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

        const scenes: Scene[] = await Promise.all(PAGE_SCENES.map(async ({ label, threshold, glyph, glyphScale = 1 }, index) => {
          const sceneSource = glyph
            ? await loadImageSource(glyph).catch(() => makeGlyphCanvas(label, index))
            : makeGlyphCanvas(label, index)

          return {
            source: sceneSource,
            scale: glyphScale,
            threshold,
            rect: (w, h) => {
              const mobile = window.matchMedia('(max-width: 760px)').matches
              const hh = mobile ? Math.min(h * 0.96, w * 0.9 / 0.7) : Math.min(h * 0.7, w * 0.4 / 0.7)
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
        field.resize(canvas.clientWidth, stage.clientHeight)
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

        let rw = canvas.clientWidth
        let rh = stage.clientHeight
        const ro = new ResizeObserver(() => {
          if (Math.abs(canvas.clientWidth - rw) < 2 && Math.abs(stage.clientHeight - rh) < 2) return
          rw = canvas.clientWidth
          rh = stage.clientHeight
          field.resize(rw, rh)
        })
        ro.observe(stage)
        ro.observe(canvas)

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
    const canvas = canvasRef.current
    if (!track || !canvas) return

    const local = (x: number, y: number) => {
      const r = canvas.getBoundingClientRect()
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
        end: 'bottom top',
        onUpdate: apply,
        onRefresh: apply,
      })

      apply()
    }, stageRef)

    return () => {
      ctx.revert()
    }
  }, [reduced])

  const isLastScene = activeSceneIndex === PAGE_SCENES.length - 1

  return (
    <main id="top" className="sg-root" data-state={state} data-active-scene={activeSceneIndex}>
      <a className="sg-skip" href={`#${PAGE_SCENES[0].slug}`}>Skip to content</a>
      <header className="sg-top">
        <div className="sg-top__content">
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
        </div>
      </header>
      <section ref={trackRef} className="sg-track" aria-label="Strata Scientific services">
        <div ref={stageRef} className="sg-stage" aria-hidden="true">
          <div className="sg-shade" aria-hidden="true" />
          <canvas ref={canvasRef} className="sg-glyphs" />
          <div className="sg-grain" aria-hidden="true" />
        </div>
        <div className="sg-headline">
          <ActiveHeading lines={active.headline} reduced={reduced} />
          <p className="sg-ch">{active.label.replace(/\n/g, ' ')}</p>
          <p className="sg-copy">
            {active.text.split(/(hello@stratascientific\.com|\+1 215\.776\.7791)/).map((part, partIndex) => {
              if (part === 'hello@stratascientific.com') {
                return <a key={partIndex} href="mailto:hello@stratascientific.com">{part}</a>
              }
              if (part === '+1 215.776.7791') {
                return <a key={partIndex} href="tel:+12157767791">{part}</a>
              }
              return part
            })}
          </p>
          <a
            className="sg-scene__next"
            href={`#${PAGE_SCENES[isLastScene ? 0 : activeSceneIndex + 1].slug}`}
          >
            {isLastScene ? (
              <>
                Home
                <span aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7" />
                  </svg>
                </span>
              </>
            ) : (
              <>
                Next <span aria-hidden="true">↓</span>
              </>
            )}
          </a>
        </div>
        <div className="sg-scenes">
          {PAGE_SCENES.map((scene) => (
            <article
              id={scene.slug}
              key={scene.label}
              className="sg-scene"
              aria-hidden="true"
            >
            </article>
          ))}
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
