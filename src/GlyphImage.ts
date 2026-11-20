// Strata Scientific — figures typed out of glyph particles.
// Each scene is sampled into a grid of cells; every
// particle owns one cell per scene, springs toward it, and can be blown about.

export type Scene = {
  /** source drawn white-on-black; brightness decides whether a cell is typed and which glyph */
  source: HTMLCanvasElement | HTMLImageElement
  /** size multiplier applied after fitting to the box; 1 (default) is the normal size */
  scale?: number
  threshold: number
  /** figure box in stage px */
  rect: (w: number, h: number, mobile: boolean) => { cx: number; cy: number; w: number; h: number }
}

type Cell = { x: number; y: number; g: number; a: number }
type P = {
  x: number
  y: number
  vx: number
  vy: number
  t: (Cell | null)[]
  fold: Cell[]
  seed: number
  alpha: number
  glyph: number
  startX: number
  startY: number
  startAlpha: number
  startGlyph: number
}

const GLYPHS = ['.', '·', '-', ':', '+', '=', '/', '\\', '#', '%', '*', '<', '>', '0', '1', '?', '2']
const RAMP = [0, 1, 2, 3, 4, 5, 6, 7]
const SCRAMBLE = [7, 8, 9, 10, 11, 12, 13, 14, 15]
const INK = '#477ecb'

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const smooth = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export class GlyphImage {
  reduced = false

  private ctx: CanvasRenderingContext2D
  private atlas = document.createElement('canvas')
  private cellW = 10
  private cellH = 13
  private tile = 20
  private w = 1
  private h = 1
  private dpr = 1
  private ps: P[] = []
  private chapter = 0
  private transition = 1
  private time = 0
  private ptr = { x: -9999, y: -9999, vx: 0, vy: 0, t: -99 }

  canvas: HTMLCanvasElement
  scenes: Scene[]

  constructor(canvas: HTMLCanvasElement, scenes: Scene[]) {
    this.canvas = canvas
    this.scenes = scenes
    this.ctx = canvas.getContext('2d')!
  }

  get mobile() {
    return this.w < 700
  }

  resize(w: number, h: number) {
    this.w = Math.max(1, w)
    this.h = Math.max(1, h)
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(this.w * this.dpr)
    this.canvas.height = Math.round(this.h * this.dpr)
    this.cellW = this.mobile ? 6.4 : Math.max(8, Math.min(11, this.w / 150))
    this.cellH = this.cellW * 1.32
    this.makeAtlas()
    this.build()
  }

  /** glyphs pre-drawn once, with their glow baked in */
  private makeAtlas() {
    const fs = this.cellW * 1.4 * this.dpr
    const T = Math.ceil(fs * 1.9)
    this.tile = T
    this.atlas.width = T * GLYPHS.length
    this.atlas.height = T
    const a = this.atlas.getContext('2d')!
    a.clearRect(0, 0, this.atlas.width, T)
    a.font = `500 ${fs}px "IBM Plex Mono", ui-monospace, monospace`
    a.textAlign = 'center'
    a.textBaseline = 'middle'
    a.fillStyle = INK
    GLYPHS.forEach((g, i) => {
      a.shadowColor = 'rgba(255, 236, 200, 0.75)'
      a.shadowBlur = fs * 0.45
      a.fillText(g, i * T + T / 2, T / 2)
      a.shadowBlur = 0
      a.fillText(g, i * T + T / 2, T / 2)
    })
  }

  private bounds(s: Scene) {
    const src = s.source
    const W0 = 'naturalWidth' in src ? src.naturalWidth : src.width
    const H0 = 'naturalHeight' in src ? src.naturalHeight : src.height
    if (!Number.isFinite(W0) || !Number.isFinite(H0) || W0 <= 0 || H0 <= 0) {
      return { x: 0, y: 0, w: 1, h: 1 }
    }
    const pw = 240
    const ph = Math.max(1, Math.round((pw * H0) / W0))
    const c = document.createElement('canvas')
    c.width = pw
    c.height = ph
    const x = c.getContext('2d', { willReadFrequently: true })!
    x.drawImage(src, 0, 0, pw, ph)
    const d = x.getImageData(0, 0, pw, ph).data
    const lum = (k: number) => d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11
    const all: number[] = []
    for (let k = 0; k < d.length; k += 4) all.push(lum(k))
    all.sort((p, q) => p - q)
    const top = all[Math.floor(all.length * 0.985)]
    const lim = Math.max(top * s.threshold, 8)
    // ignore stray specks: a row/column only counts if enough of it is lit
    const rows = new Array(ph).fill(0), cols = new Array(pw).fill(0)
    for (let j = 0; j < ph; j++)
      for (let i = 0; i < pw; i++)
        if (lum((j * pw + i) * 4) >= lim) {
          rows[j]++
          cols[i]++
        }
    const minR = Math.max(2, pw * 0.015), minC = Math.max(2, ph * 0.015)
    const x0 = cols.findIndex((n) => n >= minC)
    const x1 = pw - 1 - [...cols].reverse().findIndex((n) => n >= minC)
    const y0 = rows.findIndex((n) => n >= minR)
    const y1 = ph - 1 - [...rows].reverse().findIndex((n) => n >= minR)
    if (x0 < 0 || y0 < 0) return { x: 0, y: 0, w: W0, h: H0 }
    if (x1 <= x0 || y1 <= y0) return { x: 0, y: 0, w: W0, h: H0 }
    const sx = W0 / pw, sy = H0 / ph
    const pad = 2
    const bx = Math.max(0, x0 - pad), by = Math.max(0, y0 - pad)
    const bw = Math.min(pw, x1 + pad + 1) - bx, bh = Math.min(ph, y1 + pad + 1) - by
    return { x: bx * sx, y: by * sy, w: bw * sx, h: bh * sy }
  }

  /** sample each scene into cells, then deal every particle one cell per scene */
  private build() {
    const sceneCells: Cell[][] = this.scenes.map((s, si) => {
      const crop = this.bounds(s)
      const box = s.rect(this.w, this.h, this.mobile)
      const ar = crop.w / crop.h
      // normalise by area so wide and tall figures read at a similar size, still capped to the box
      const areaW = Math.sqrt(box.w * box.h * 0.6 * ar)
      const fitW = Math.min(areaW, box.w, box.h * ar) * (s.scale ?? 1)
      const r = { cx: box.cx, cy: box.cy, w: fitW, h: fitW / ar }
      const cols = Math.max(4, Math.round(r.w / this.cellW))
      const rows = Math.max(4, Math.round(r.h / this.cellH))
      const c = document.createElement('canvas')
      c.width = cols
      c.height = rows
      const cx = c.getContext('2d', { willReadFrequently: true })!
      cx.imageSmoothingEnabled = true
      cx.imageSmoothingQuality = 'high'
      cx.drawImage(s.source, crop.x, crop.y, crop.w, crop.h, 0, 0, cols, rows)
      const d = cx.getImageData(0, 0, cols, rows).data
      const lums: number[] = []
      for (let k = 0; k < d.length; k += 4) lums.push((d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11) / 255)
      const sorted = lums.slice().sort((x, y) => x - y)
      const top = Math.max(0.05, sorted[Math.floor(sorted.length * 0.985)])
      const rnd = rng(17 + si * 101)
      const x0 = r.cx - (cols * this.cellW) / 2
      const y0 = r.cy - (rows * this.cellH) / 2
      const out: Cell[] = []
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          const k = (j * cols + i) * 4
          const lum = Math.min(1, lums[k / 4] / top)
          if (lum < s.threshold) continue
          const v = (lum - s.threshold) / (1 - s.threshold)
          if (v < 0.12 && rnd() < 0.55) continue
          const level = Math.min(RAMP.length - 1, Math.floor(Math.pow(v, 0.45) * RAMP.length + (rnd() - 0.5) * 1.4))
          out.push({ x: x0 + (i + 0.5) * this.cellW, y: y0 + (j + 0.5) * this.cellH, g: RAMP[Math.max(0, level)], a: 0.55 + 0.45 * Math.min(1, v * 1.6) })
        }
      out.sort((p, q) => Math.atan2(p.y - r.cy, p.x - r.cx) - Math.atan2(q.y - r.cy, q.x - r.cx))
      return out
    })

    const N = Math.max(...sceneCells.map((c) => c.length))
    const rnd = rng(5)
    const old = this.ps
    this.ps = []

    for (let n = 0; n < N; n++) {
      const t = sceneCells.map((cells) => {
        const idx = Math.floor((n / N) * cells.length)
        return (n * cells.length) % N < cells.length ? cells[idx] ?? null : null
      })
      const fold = sceneCells.map((cells) => cells[Math.floor((n / N) * cells.length)] ?? { x: this.w / 2, y: this.h / 2, g: 0, a: 0 })
      const prev = old[n]
      const start = t[0] ?? fold[0]
      const x = prev ? prev.x : start.x + (rnd() - 0.5) * this.w * 0.6
      const y = prev ? prev.y : start.y + this.h * (0.3 + rnd() * 0.5)
      this.ps.push({
        x,
        y,
        vx: 0,
        vy: 0,
        t,
        fold,
        seed: rnd(),
        alpha: prev?.alpha ?? 0,
        glyph: prev?.glyph ?? start.g,
        startX: x,
        startY: y,
        startAlpha: prev?.alpha ?? 0,
        startGlyph: prev?.glyph ?? start.g,
      })
    }
    if (this.transition < 1) this.transition = 0
  }

  setStory(chapter: number) {
    const next = Math.max(0, Math.min(this.scenes.length - 1, chapter))
    if (next === this.chapter) return
    this.chapter = next
    this.transition = 0
    for (const p of this.ps) {
      p.startX = p.x
      p.startY = p.y
      p.startAlpha = p.alpha
      p.startGlyph = p.glyph
      p.vx = 0
      p.vy = 0
    }
  }

  pointer(x: number, y: number) {
    const dt = Math.max(0.008, this.time - this.ptr.t)
    if (this.time - this.ptr.t < 0.2) {
      this.ptr.vx = (x - this.ptr.x) / dt
      this.ptr.vy = (y - this.ptr.y) / dt
    }
    this.ptr.x = x
    this.ptr.y = y
    this.ptr.t = this.time
  }

  leave() {
    this.ptr.x = this.ptr.y = -9999
  }

  /** a ring-shaped shove outward from (x, y) */
  pulse(x: number, y: number, strength = 1) {
    for (const p of this.ps) {
      const dx = p.x - x
      const dy = p.y - y
      const d = Math.hypot(dx, dy) + 1
      const f = strength * 1300 * Math.exp(-d / 220)
      p.vx += (dx / d) * f
      p.vy += (dy / d) * f
    }
  }

  step(dt: number) {
    dt = Math.min(dt, 1 / 30)
    this.time += dt

    if (this.reduced && this.transition < 1) {
      for (const p of this.ps) {
        const target = p.t[this.chapter] ?? p.fold[this.chapter]
        p.x = target.x
        p.y = target.y
        p.vx = p.vy = 0
      }
      this.transition = 1
    }
    else this.transition = Math.min(1, this.transition + dt / 1.15)
    const transitioning = this.transition < 1
    const scatter = smooth(0, 0.45, this.transition)
    const assemble = smooth(0.45, 1, this.transition)
    const blend = smooth(0.25, 0.75, this.transition)
    const box = this.scenes[this.chapter].rect(this.w, this.h, this.mobile)
    const ptrLive = this.time - this.ptr.t < 1.5
    const R = this.mobile ? 70 : 110
    const k = this.reduced ? 120 : 55
    const damp = this.reduced ? 18 : 9
    const ctx = this.ctx

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    const T = this.tile
    const half = T / 2 / this.dpr
    const size = T / this.dpr

    for (const p of this.ps) {
      const target = p.t[this.chapter] ?? p.fold[this.chapter]
      const targetAlpha = p.t[this.chapter] ? target.a : 0
      let tx = target.x
      let ty = target.y

      if (!this.reduced) {
        tx += Math.sin(this.time * 0.8 + p.seed * 40) * 0.9
        ty += Math.cos(this.time * 0.7 + p.seed * 30) * 0.9
      }

      if (transitioning) {
        p.vx = p.vy = 0
        const angle = Math.atan2(p.startY - box.cy, p.startX - box.cx) + (p.seed - 0.5) * 1.4
        const distance = Math.min(this.w, this.h) * (0.05 + p.seed * 0.06)
        const burstX = p.startX + Math.cos(angle) * distance * scatter
        const burstY = p.startY + Math.sin(angle) * distance * scatter
        p.x = burstX + (tx - burstX) * assemble
        p.y = burstY + (ty - burstY) * assemble
      } else {
        p.vx += ((tx - p.x) * k - p.vx * damp) * dt
        p.vy += ((ty - p.y) * k - p.vy * damp) * dt

        if (ptrLive) {
          const dx = p.x - this.ptr.x
          const dy = p.y - this.ptr.y
          const d2 = dx * dx + dy * dy
          if (d2 < R * R) {
            const d = Math.sqrt(d2) + 0.001
            const f = Math.pow(1 - d / R, 2)
            p.vx += (dx / d) * f * 5200 * dt + this.ptr.vx * f * 3 * dt
            p.vy += (dy / d) * f * 5200 * dt + this.ptr.vy * f * 3 * dt
          }
        }

        p.x += p.vx * dt
        p.y += p.vy * dt
      }

      p.alpha = transitioning ? p.startAlpha + (targetAlpha - p.startAlpha) * blend : targetAlpha
      p.glyph = transitioning && blend < 0.5 ? p.startGlyph : target.g
      if (p.alpha < 0.02) continue

      const speed = Math.abs(p.vx) + Math.abs(p.vy)
      let alpha = p.alpha
      let g = p.glyph
      if ((transitioning || speed > 260) && !this.reduced) {
        g = SCRAMBLE[Math.floor((p.seed * 97 + this.time * 14) % SCRAMBLE.length)]
        alpha = Math.min(1, alpha * 1.1)
      }

      ctx.globalAlpha = alpha
      ctx.drawImage(this.atlas, g * T, 0, T, T, (p.x - half) * this.dpr, (p.y - half) * this.dpr, size * this.dpr, size * this.dpr)
    }

    ctx.globalAlpha = 1
    this.ptr.vx *= Math.exp(-dt * 6)
    this.ptr.vy *= Math.exp(-dt * 6)
  }
}
