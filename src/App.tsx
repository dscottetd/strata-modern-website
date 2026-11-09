import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { GlyphImage, type Scene } from './GlyphImage'
import './App.css'

gsap.registerPlugin(ScrollTrigger)

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

const BG = {
  windowBlur: asset('bg-window-blur'),
  window: asset('bg-window'),
}

const PAGE_SCENES: SceneConfig[] = [
  {
    label: 'ABOUT US',
    headline: ['Product strategy,', 'engineering growth.'],
    text: 'Strata Scientific helps digital health, medical device, and life sciences teams turn ideas into results by aligning strategy, execution, and growth.',
    threshold: 0.08,
    glyph: asset('light-bulb', 'png'),
    background: BG.windowBlur,
  },
  {
    label: 'EARLY\nINNOVATION',
    headline: [''],
    text: 'We help teams frame the right product opportunity, identify unmet needs, and turn early ideas into a stronger strategic direction.',
    threshold: 0.08,
    glyph: asset('light-bulb', 'png'),
    background: BG.windowBlur,
  },
  {
    label: 'ROADMAP\nALIGNMENT',
    headline: ['Product strategy,', 'engineering growth.'],
    text: 'We align product priorities, technology choices, and corporate strategy so the roadmap is focused on the highest-value bets.',
    threshold: 0.08,
    glyph: asset('roadmap', 'png'),
    background: BG.windowBlur,
  },
  {
    label: 'ENGINEERING\nOPTIMIZATION',
    headline: ['Product strategy,', 'engineering growth.'],
    text: 'We identify the process, capability, and execution gaps that slow delivery so engineering teams can move faster without sacrificing quality.',
    threshold: 0.08,
    glyph: asset('light-bulb', 'png'),
    background: BG.windowBlur,
  },
  {
    label: 'TARGET\nSCREENING',
    headline: ['Product strategy,', 'engineering growth.'],
    text: 'We evaluate acquisition, partnership, and licensing opportunities through the lens of technology, market fit, and strategic value.',
    threshold: 0.08,
    glyph: asset('light-bulb', 'png'),
    background: BG.windowBlur,
  },
  {
    label: 'TECHNICAL\nDUE DILIGENCE',
    headline: ['Product strategy,', 'engineering growth.'],
    text: 'We pressure-test the product, technology, and engineering organization to expose risks and reveal the real value behind the deal.',
    threshold: 0.08,
    glyph: asset('light-bulb', 'png'),
    background: BG.windowBlur,
  },
  {
    label: 'POST MERGER\nINTEGRATION',
    headline: ['Product strategy,', 'engineering growth.'],
    text: 'We help combine teams, product plans, and technical systems so the integration creates real operational and commercial momentum.',
    threshold: 0.08,
    glyph: asset('light-bulb', 'png'),
    background: BG.windowBlur,
  },
  {
    label: 'CONTACT US',
    headline: ['From concept to', 'clinical momentum.'],
    text: 'We help teams align strategy, execution, and delivery across the product lifecycle so innovation turns into measurable outcomes.',
    threshold: 1,
    glyph: null,
    background: BG.window,
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

const SCENE_STOPS = [0, 0.12, 0.25, 0.42, 0.58, 0.72, 0.86, 1]

const sceneProgressForIndex = (index: number) => SCENE_STOPS[Math.min(Math.max(index, 0), SCENE_STOPS.length - 1)]

const sceneIndexForProgress = (p: number) => {
  const clamped = Math.min(1, Math.max(0, p))
  for (let i = SCENE_STOPS.length - 1; i >= 0; i -= 1) {
    if (clamped >= SCENE_STOPS[i]) return i
  }
  return 0
}

const chapterOf = (p: number) => {
  const index = sceneIndexForProgress(p)
  const start = SCENE_STOPS[index]
  const end = SCENE_STOPS[Math.min(index + 1, SCENE_STOPS.length - 1)]
  const local = end <= start ? 0 : (p - start) / (end - start)
  return index + smooth(0, 1, local)
}

const releaseOf = (p: number) => {
  const index = sceneIndexForProgress(p)
  if (index < PAGE_SCENES.length - 1) return 0
  if (p < 0.94) return 0
  return smooth(0.94, 1, p)
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
  const lenisRef = useRef<Lenis | null>(null)
  const stRef = useRef<ScrollTrigger | null>(null)
  const progressRef = useRef(0)
  const reduced = usePrefersReducedMotion()
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [activeSceneIndex, setActiveSceneIndex] = useState(0)

  const visibleScene = PAGE_SCENES[Math.min(activeSceneIndex, PAGE_SCENES.length - 1)]
  const visibleBackground = resolveBackground(visibleScene)
  const headlineLines = Array.isArray(visibleScene.headline)
    ? visibleScene.headline
    : (typeof visibleScene.headline === 'string' && visibleScene.headline.trim().length > 0
      ? visibleScene.headline.split(/\s*\|\s*/)
      : [])
  const shouldDisplaySceneText = activeSceneIndex === PAGE_SCENES.length - 1 || progressRef.current < 0.95

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
            rect: (w, h, m) => {
              const hh = m ? Math.min(h * 0.72, (w * 0.96) / 0.7) : h * 0.9
              const scale = 0.64
              return {
                cx: m ? w * 0.5 : w * 0.58,
                cy: h * (m ? 0.49 : 0.46),
                w: hh * 0.7 * scale,
                h: hh * scale,
              }
            },
          }
        }))

        const field = new GlyphImage(canvas, scenes)
        field.reduced = reduced
        fieldRef.current = field
        field.resize(stage.clientWidth, stage.clientHeight)
        field.setStory(chapterOf(progressRef.current), releaseOf(progressRef.current))
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
        const ro = new ResizeObserver(() => {
          if (Math.abs(stage.clientWidth - rw) < 2 && field.mobile) return
          rw = stage.clientWidth
          field.resize(stage.clientWidth, stage.clientHeight)
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
    const stage = stageRef.current
    if (!stage) return

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

    stage.addEventListener('pointermove', move)
    stage.addEventListener('pointerdown', down)
    stage.addEventListener('pointerleave', leave)
    stage.addEventListener('touchstart', touch, { passive: true })
    stage.addEventListener('touchmove', touch, { passive: true })

    return () => {
      stage.removeEventListener('pointermove', move)
      stage.removeEventListener('pointerdown', down)
      stage.removeEventListener('pointerleave', leave)
      stage.removeEventListener('touchstart', touch)
      stage.removeEventListener('touchmove', touch)
    }
  }, [])

  useEffect(() => {
    if (reduced) return
    const lenis = new Lenis({ lerp: 0.085 })
    lenisRef.current = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [reduced])

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return

    const ctx = gsap.context(() => {
      if (!reduced) {
        gsap
          .timeline({ defaults: { ease: 'expo.out' }, delay: 0.15 })
          .from('.sg-bg__in', { scale: 1.12, opacity: 0, duration: 2.4 }, 0)
          .from('.sg-top > *', { opacity: 0, y: -8, duration: 1, stagger: 0.08 }, 0.2)
          .from('.sg-head .li', { yPercent: 110, duration: 1.6, stagger: 0.1 }, 0.35)
          .from('.sg-sub__in, .sg-dock__in, .sg-ch__in', { opacity: 0, y: 10, duration: 1.2, stagger: 0.1 }, 0.9)
      }

      const target = { p: 0 }
      const apply = (p: number) => {
        progressRef.current = p
        const nextIndex = sceneIndexForProgress(p)
        setActiveSceneIndex((current) => (current === nextIndex ? current : nextIndex))
        fieldRef.current?.setStory(chapterOf(p), releaseOf(p))
      }

      const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
      tl
        .to(target, { p: 1, duration: 1, onUpdate: () => apply(target.p) }, 0)
        .to('.sg-bg--wblur', { opacity: 1, duration: 0.1 }, 0.48)
        .to('.sg-bg--window', { opacity: 1, duration: 0.14 }, 0.74)
        .fromTo('.sg-bg', { scale: 1.08 }, { scale: 1, duration: 1 }, 0)
        .to('.sg-shade', { opacity: 0.15, duration: 0.14 }, 0.74)
        .to('.sg-dock', { opacity: 0, y: -12, duration: 0.05 }, 0.98)

      stRef.current = ScrollTrigger.create({
        trigger: track,
        start: 'top top',
        end: 'bottom bottom',
        animation: reduced ? undefined : tl,
        scrub: reduced ? false : 0.7,
        onUpdate(self) {
          if (!reduced) return
          const p = SCENE_STOPS[sceneIndexForProgress(self.progress)]
          tl.progress(p)
          apply(p)
        },
      })

      apply(0)
    }, stageRef)

    return () => {
      stRef.current = null
      ctx.revert()
    }
  }, [reduced])

  const scrollToProgress = (p: number) => {
    const st = stRef.current
    if (!st) return
    const y = st.start + (st.end - st.start) * p
    if (lenisRef.current) lenisRef.current.scrollTo(y, { duration: p === 0 ? 2.6 : 1.8 })
    else window.scrollTo({ top: y, behavior: 'auto' })
  }

  const next = () => {
    const currentIndex = sceneIndexForProgress(progressRef.current)
    const nextIndex = Math.min(currentIndex + 1, PAGE_SCENES.length - 1)
    setActiveSceneIndex(nextIndex)
    scrollToProgress(sceneProgressForIndex(nextIndex))
  }

  const goHome = () => {
    setActiveSceneIndex(0)
    scrollToProgress(0)
  }

  const isFinalScene = activeSceneIndex === PAGE_SCENES.length - 1 || progressRef.current >= 0.99

  return (
    <main className="sg-root" data-state={state}>
      <section ref={trackRef} className="sg-track" aria-label="Strata Scientific — strategy and science in motion">
        <div ref={stageRef} className="sg-stage">
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
          <canvas
            ref={canvasRef}
            className="sg-glyphs"
            role="img"
            aria-label="A horse, then poppies, then the word Oversight, each typed out of glowing text characters"
          />
          <div className="sg-grain" aria-hidden="true" />
          <header className="sg-top">
            <span>Strata Scientific</span>
            <span className="sg-top__r" style={{ color: '#fff', justifySelf: 'end' }}>hello@stratascientific.com</span>
          </header>
          {headlineLines.length > 0 && (
            <h1 className="sg-head">
              {headlineLines.map((line, index) => (
                <span key={`${line}-${index}`} className="ln">
                  <span className="li">{index === 1 ? <em>{line}</em> : line}</span>
                </span>
              ))}
            </h1>
          )}
          <div className="sg-copy">
            <p
              key={visibleScene.label}
              className="sg-ch sg-ch--active"
              aria-live="polite"
            >
              <span className="sg-ch__in">{visibleScene.label}</span>
            </p>
            <div className={`sg-sub ${shouldDisplaySceneText ? 'sg-sub--visible' : 'sg-sub--hidden'}`}>
              <p className="sg-sub__in">
                {state === 'error'
                  ? 'Some images didn’t load. Check your connection and reload.'
                  : visibleScene.text}
              </p>
            </div>
          </div>
          <div className="sg-dock">
            <div className="sg-dock__in">
              {isFinalScene ? (
                <button type="button" onClick={goHome} disabled={state !== 'ready'}>Home</button>
              ) : (
                <button type="button" onClick={next}>Next ↓</button>
              )}
            </div>
          </div>
          {state === 'loading' && (
            <div className="sg-loader" role="status">
              Loading…
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
