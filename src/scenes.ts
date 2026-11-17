const asset = (n: string, ext = 'webp') => new URL(`./assets/${n}.${ext}`, import.meta.url).href

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

export const PAGE_SCENES: SceneConfig[] = [
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
    text: 'Have a healthcare product or technology challenge to discuss? Email hello@stratascientific.com or call +1 215.776.7791. We are here to help.',
    threshold: 0.08,
    glyph: asset('mountain', 'png'),
    glyphScale: 1.2,
  },
]
