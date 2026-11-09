import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { GlyphField, type Scene } from './GlyphField'

gsap.registerPlugin(ScrollTrigger)

const asset = (n: string, ext = 'webp') => new URL(`./assets/${n}.${ext}`, import.meta.url).href

const SRC_BULB = asset('light-bulb', 'png')
const BG = {
  field: asset('bg-meadow'),
  meadow: asset('bg-meadow'),
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

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(src))
    img.src = src
  })
}

/** the wordmark, typed white on black so it can be sampled like a photo */
function wordmark(lines: string[]) {
  const fs = 260
  const c = document.createElement('canvas')
  const m = c.getContext('2d')!
  m.font = `italic 400 ${fs}px "Instrument Serif", serif`
  const tw = Math.ceil(Math.max(...lines.map((l) => m.measureText(l).width)))
  const lh = fs * 0.92
  c.width = tw + 40
  c.height = Math.round(lh * lines.length + fs * 0.2)
  const x = c.getContext('2d')!
  x.fillStyle = '#000'
  x.fillRect(0, 0, c.width, c.height)
  x.fillStyle = '#fff'
  x.font = `italic 400 ${fs}px "Instrument Serif", serif`
  x.textBaseline = 'middle'
  x.textAlign = 'center'
  lines.forEach((l, i) => x.fillText(l, c.width / 2, fs * 0.1 + lh * (i + 0.55)))
  return c
}

export default function SignalHero() {
  const trackRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const countRef = useRef<HTMLElement>(null)
  const fieldRef = useRef<GlyphField | null>(null)
  const lenisRef = useRef<Lenis | null>(null)
  const stRef = useRef<ScrollTrigger | null>(null)
  const progressRef = useRef(0)
  const reduced = usePrefersReducedMotion()
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [isTouch] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches)

  /* ------------------------------------------------ load + engine */
  useEffect(() => {
    let alive = true
    let cleanup = () => {}

    Promise.all([
      loadImage(SRC_BULB),
      loadImage(SRC_BULB),
      document.fonts?.load('italic 100px "Instrument Serif"').catch(() => null),
      document.fonts?.load('500 12px "IBM Plex Mono"').catch(() => null),
    ])
      .then(([bulb]) => {
        const stage = stageRef.current
        const canvas = canvasRef.current
        if (!alive || !stage || !canvas) return

        const wordDesk = wordmark(['Oversight'])
        const wordMob = wordmark(['Over', 'sight'])

        const scenes: Scene[] = [
          {
            source: bulb,
            threshold: 0.12,
            rect: (w, h, m) => {
              const hh = m ? Math.min(h * 0.7, (w * 0.96) / 0.7) : h * 0.9
              return { cx: m ? w * 0.5 : w * 0.58, cy: h * (m ? 0.56 : 0.54), w: hh * 0.7, h: hh }
            },
          },
          {
            source: bulb,
            threshold: 0.18,
            rect: (w, h, m) => {
              const hh = m ? Math.min(h * 0.68, (w * 0.96) / 0.72) : h * 0.82
              return { cx: m ? w * 0.5 : w * 0.6, cy: h * (m ? 0.56 : 0.53), w: hh * 0.72, h: hh }
            },
          },
          {
            source: (m) => (m ? wordMob : wordDesk),
            threshold: 0.45,
            rect: (w, h, m) => {
              return m ? { cx: w * 0.5, cy: h * 0.5, w: w * 0.94, h: h * 0.5 } : { cx: w * 0.5, cy: h * 0.47, w: w * 0.86, h: h * 0.6 }
            },
          },
        ]

        const field = new GlyphField(canvas, scenes)
        field.reduced = reduced
        field.onCount = (n) => {
          if (countRef.current) countRef.current.textContent = n.toLocaleString('en-US').padStart(5, '0')
        }
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
        console.warn('[signal]', err)
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

  /* ------------------------------------------------ pointer: wind + pulses */
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

  /* ------------------------------------------------ smooth scroll */
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

  /* ------------------------------------------------ intro + scroll story */
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
        fieldRef.current?.setStory(chapterOf(p), releaseOf(p))
      }

      const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
      tl
        .to(target, { p: 1, duration: 1, onUpdate: () => apply(target.p) }, 0)
        .to('.sg-head, .sg-sub, .sg-dock', { opacity: 0, y: -20, duration: 0.05, stagger: 0.012 }, 0.04)
        .to('.sg-bg--meadow', { opacity: 1, duration: 0.1 }, 0.18)
        .to('.sg-bg--wblur', { opacity: 1, duration: 0.1 }, 0.48)
        .to('.sg-bg--window', { opacity: 1, duration: 0.14 }, 0.74)
        .fromTo('.sg-bg', { scale: 1.08 }, { scale: 1, duration: 1 }, 0)
        .to('.sg-ch--1', { opacity: 0, y: -12, duration: 0.05 }, 0.12)
        .fromTo('.sg-ch--2', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.05 }, 0.27)
        .to('.sg-ch--2', { opacity: 0, y: -12, duration: 0.05 }, 0.42)
        .fromTo('.sg-ch--3', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.05 }, 0.57)
        .to('.sg-ch--3', { opacity: 0, y: -12, duration: 0.05 }, 0.7)
        .to('.sg-shade', { opacity: 0.15, duration: 0.14 }, 0.74)
        .fromTo('.sg-final', { opacity: 0, y: 30, pointerEvents: 'none' }, { opacity: 1, y: 0, pointerEvents: 'auto', duration: 0.07 }, 0.9)

      stRef.current = ScrollTrigger.create({
        trigger: track,
        start: 'top top',
        end: 'bottom bottom',
        animation: reduced ? undefined : tl,
        scrub: reduced ? false : 0.7,
        onUpdate(self) {
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
      <section ref={trackRef} className="sg-track" aria-label="Signal and Soil — old figures typed in new glyphs">
        <div ref={stageRef} className="sg-stage">
          <div className="sg-bg" aria-hidden="true">
            <div className="sg-bg__in">
              <img className="sg-bg__img sg-bg--field" src={BG.field} alt="" />
              <img className="sg-bg__img sg-bg--meadow" src={BG.meadow} alt="" />
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
            <span>Oversight Supply</span>
            <span className="sg-top__c">Signal &amp; Soil</span>
            <span className="sg-top__r">
              Glyphs <b ref={countRef}>00000</b>
            </span>
          </header>
          <h1 className="sg-head">
            <span className="ln"><span className="li">Old ground,</span></span>
            <span className="ln"><span className="li"><em>new signal.</em></span></span>
          </h1>
          <div className="sg-sub">
            <p className="sg-sub__in">
              {state === 'error'
                ? 'Some images didn’t load. Check your connection and reload.'
                : isTouch
                  ? 'Heirloom seeds, sent by modern means. Drag through the glyphs to scatter them; tap to send a pulse.'
                  : 'Heirloom seeds, sent by modern means. Move through the glyphs to scatter them; click to send a pulse.'}
            </p>
          </div>
          <p className="sg-ch sg-ch--1"><span className="sg-ch__in">I — The horse that ploughed it</span></p>
          <p className="sg-ch sg-ch--2" aria-hidden="true">II — The poppies that came back</p>
          <p className="sg-ch sg-ch--3" aria-hidden="true">III — The name on the packet</p>
          <div className="sg-dock">
            <div className="sg-dock__in">
              <button type="button" onClick={pulseCentre} disabled={state !== 'ready'}>Pulse</button>
              <button type="button" onClick={next}>Next figure ↓</button>
            </div>
          </div>
          <div className="sg-final">
            <p className="sg-final__kicker">Oversight Supply · heirloom seeds</p>
            <h2 className="sg-final__title">
              The past, <br />
              <em>in focus.</em>
            </h2>
            <p className="sg-final__body">Seed saved by hand for a hundred summers, catalogued and sent out by people who still read the old notebooks.</p>
            <button type="button" className="sg-final__btn" onClick={() => scrollToProgress(0)}>
              Scatter again <span aria-hidden="true">↑</span>
            </button>
          </div>
          {state === 'loading' && (
            <div className="sg-loader" role="status">
              Typing…
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
