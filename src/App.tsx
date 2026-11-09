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

const PAGE_SCENES = [
  {
    label: 'HOME',
    text: 'Strata Scientific helps digital health, medical device, and life sciences teams turn ideas into results by aligning strategy, execution, and growth.',
    threshold: 0.08,
    source: null,
  },
  {
    label: 'EARLY\nINNOVATION',
    text: 'We help teams frame the right product opportunity, identify unmet needs, and turn early ideas into a stronger strategic direction.',
    threshold: 0.1,
    source: asset('light-bulb', 'png'),
  },
  {
    label: 'ROADMAP\nALIGNMENT',
    text: 'We align product priorities, technology choices, and corporate strategy so the roadmap is focused on the highest-value bets.',
    threshold: 0.11,
    source: asset('light-bulb', 'png'),
  },
  {
    label: 'ENGINEERING\nOPTIMIZATION',
    text: 'We identify the process, capability, and execution gaps that slow delivery so engineering teams can move faster without sacrificing quality.',
    threshold: .4,
    source: asset('light-bulb', 'png'),
  },
  {
    label: 'TARGET\nSCREENING',
    text: 'We evaluate acquisition, partnership, and licensing opportunities through the lens of technology, market fit, and strategic value.',
    threshold: 0.13,
    source: asset('light-bulb', 'png'),
  },
  {
    label: 'TECHNICAL\nDUE DILIGENCE',
    text: 'We pressure-test the product, technology, and engineering organization to expose risks and reveal the real value behind the deal.',
    threshold: 0.11,
    source: asset('light-bulb', 'png'),
  },
  {
    label: 'POST MERGER\nINTEGRATION',
    text: 'We help combine teams, product plans, and technical systems so the integration creates real operational and commercial momentum.',
    threshold: 0.2,
    source: asset('light-bulb', 'png'),
  },
] as const

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

const BG = {
  windowBlur: asset('bg-window-blur'),
  window: asset('bg-window'),
}

const smooth = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

const chapterOf = (p: number) => smooth(0.12, 0.3, p) + smooth(0.42, 0.6, p)
const releaseOf = (p: number) => smooth(0.7, 0.9, p)
const STOPS = [0, 0.36, 0.64, 1]

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

  const sceneIndexForProgress = (p: number) => {
    if (p >= 0.9) return 6
    if (p >= 0.7) return 5
    if (p >= 0.55) return 4
    if (p >= 0.38) return 3
    if (p >= 0.22) return 2
    if (p >= 0.1) return 1
    return 0
  }

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

        const scenes: Scene[] = await Promise.all(PAGE_SCENES.map(async ({ label, threshold, source }, index) => {
          const sceneSource = source
            ? await loadImageSource(source).catch(() => makeGlyphCanvas(label, index))
            : makeGlyphCanvas(label, index)

          return {
            source: sceneSource,
            threshold,
            rect: (w, h, m) => {
              const hh = m ? Math.min(h * 0.72, (w * 0.96) / 0.7) : h * 0.9
              const scale = 0.8
              return {
                cx: m ? w * 0.5 : w * 0.58,
                cy: h * (m ? 0.56 : 0.54),
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
        .to('.sg-head', { opacity: 0, y: -20, duration: 0.05 }, 0.04)
        .to('.sg-bg--wblur', { opacity: 1, duration: 0.1 }, 0.48)
        .to('.sg-bg--window', { opacity: 1, duration: 0.14 }, 0.74)
        .fromTo('.sg-bg', { scale: 1.08 }, { scale: 1, duration: 1 }, 0)
        .to('.sg-ch--1', { opacity: 0, y: -12, duration: 0.05 }, 0.12)
        .fromTo('.sg-ch--2', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.05 }, 0.22)
        .to('.sg-ch--2', { opacity: 0, y: -12, duration: 0.05 }, 0.34)
        .fromTo('.sg-ch--3', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.05 }, 0.38)
        .to('.sg-ch--3', { opacity: 0, y: -12, duration: 0.05 }, 0.52)
        .fromTo('.sg-ch--4', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.05 }, 0.58)
        .to('.sg-ch--4', { opacity: 0, y: -12, duration: 0.05 }, 0.69)
        .fromTo('.sg-ch--5', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.05 }, 0.75)
        .to('.sg-ch--5', { opacity: 0, y: -12, duration: 0.05 }, 0.84)
        .fromTo('.sg-ch--6', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.05 }, 0.9)
        .to('.sg-ch--6', { opacity: 0, y: -12, duration: 0.05 }, 0.94)
        .fromTo('.sg-ch--7', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.05 }, 0.96)
        .to('.sg-ch--7', { opacity: 0, y: -12, duration: 0.05 }, 0.9)
        .to('.sg-shade', { opacity: 0.15, duration: 0.14 }, 0.74)
        .to('.sg-dock', { opacity: 0, y: -12, duration: 0.05 }, 0.98)
        .fromTo('.sg-final', { opacity: 0, y: 30, pointerEvents: 'none' }, { opacity: 1, y: 0, pointerEvents: 'auto', duration: 0.07 }, 0.95)

      stRef.current = ScrollTrigger.create({
        trigger: track,
        start: 'top top',
        end: 'bottom bottom',
        animation: reduced ? undefined : tl,
        scrub: reduced ? false : 0.7,
        onUpdate(self) {
          if (self.progress >= 0.8) {
            gsap.set('.sg-ch--7', { opacity: 0, y: -12 })
          }
          if (!reduced) return
          const p = self.progress > 0.85 ? 1 : self.progress > 0.55 ? STOPS[2] : self.progress > 0.2 ? STOPS[1] : 0
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
    const p = progressRef.current
    const n = STOPS.find((s) => s > p + 0.02) ?? 1
    scrollToProgress(n)
  }

  const pulseCentre = () => {
    const s = stageRef.current
    if (s) fieldRef.current?.pulse(s.clientWidth * (s.clientWidth < 700 ? 0.5 : 0.62), s.clientHeight * 0.55, 1.2)
  }

  return (
    <main className="sg-root" data-state={state}>
      <section ref={trackRef} className="sg-track" aria-label="Strata Scientific — strategy and science in motion">
        <div ref={stageRef} className="sg-stage">
          <div className="sg-bg" aria-hidden="true">
            <div className="sg-bg__in">
              <img className="sg-bg__img sg-bg--wblur" src={BG.windowBlur} alt="" />
              <img className="sg-bg__img sg-bg--window" src={BG.window} alt="" />
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
          <h1 className="sg-head">
            <span className="ln"><span className="li">Product strategy,</span></span>
            <span className="ln"><span className="li"><em>engineering growth.</em></span></span>
          </h1>
          <div className="sg-sub" style={{ opacity: progressRef.current >= 0.95 ? 0 : 1 }}>
            <p className="sg-sub__in">
              {state === 'error'
                ? 'Some images didn’t load. Check your connection and reload.'
                : PAGE_SCENES[activeSceneIndex].text}
            </p>
          </div>
          {PAGE_SCENES.map((scene, index) => (
            <p
              key={scene.label}
              className={`sg-ch sg-ch--${index + 1}`}
              aria-hidden={index !== activeSceneIndex}
              style={index === 0 ? undefined : undefined}
            >
              <span className="sg-ch__in">{scene.label}</span>
            </p>
          ))}
          <div className="sg-dock">
            <div className="sg-dock__in">
              <button type="button" onClick={pulseCentre} disabled={state !== 'ready'}>Pulse</button>
              <button type="button" onClick={next}>Next service ↓</button>
            </div>
          </div>
          <div className="sg-final">
            <p className="sg-final__kicker">Strata Scientific</p>
            <h2 className="sg-final__title">
              From concept to <br />
              <em>clinical momentum.</em>
            </h2>
            <p className="sg-final__body">We help teams align strategy, execution, and delivery across the product lifecycle so innovation turns into measurable outcomes.</p>
            <button type="button" className="sg-final__btn" onClick={() => scrollToProgress(0)}>
              Restart <span aria-hidden="true">↑</span>
            </button>
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
