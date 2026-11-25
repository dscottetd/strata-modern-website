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
    text: 'Strata Scientific helps digital health, medical device, and life sciences teams align product strategy and execution to turn ideas into products for growth.',
    threshold: 0.05,
    glyph: asset('spiral', 'png'),
    glyphScale: 0.95,
  },
  {
    slug: 'early-innovation',
    label: 'EARLY\nINNOVATION',
    headline: ['Guiding Healthcare', 'Innovation'],
    text: 'We help teams explore product ideas, business models, and intellectual property, identify unmet needs, and build teams and processes to bring ideas to life.',
    threshold: 0.08,
    glyph: asset('light-bulb', 'png'),
    glyphScale: 0.95,
  },
  {
    slug: 'roadmap-alignment',
    label: 'ROADMAP\nALIGNMENT',
    headline: ['Guiding Healthcare', 'Products'],
    text: 'We help teams align product plans and technology choices with company goals, then set development priorities for the short and long term.',
    threshold: 0.1,
    glyph: asset('hexagon', 'png'),
    glyphScale: 1.1,
  },
  {
    slug: 'engineering-optimization',
    label: 'ENGINEERING\nOPTIMIZATION',
    headline: ['Guiding Healthcare', 'Engineering'],
    text: 'We assess the people, processes, and tools behind product development, then identify changes that can improve engineering effectiveness.',
    threshold: 0.2,
    glyph: asset('circuit', 'png'),
    glyphScale: 0.9,
  },
  {
    slug: 'target-screening',
    label: 'TARGET\nSCREENING',
    headline: ['Guiding Healthcare', 'Investments'],
    text: 'We assess products, technology, and market position to help you identify and prioritize companies for acquisition, partnership, or licensing.',
    threshold: 0.08,
    glyph: asset('bull', 'png'),
    glyphScale: 0.9,
  },
  {
    slug: 'technical-due-diligence',
    label: 'TECHNICAL\nDUE DILIGENCE',
    headline: ['Guiding Healthcare', 'Technology'],
    text: 'We examine products, technology, and engineering teams, test assumptions, and surface technical risks and opportunities for the deal and post-close plans.',
    threshold: 0.04,
    glyph: asset('science', 'png'),
    glyphScale: 1.0,
  },
  {
    slug: 'post-merger-integration',
    label: 'POST-MERGER\nINTEGRATION',
    headline: ['Guiding Healthcare', 'Integration'],
    text: 'We help bring teams, product plans, and technology together after a merger, with a focus on supporting growth and reducing costs.',
    threshold: 0.25,
    glyph: asset('pieces', 'png'),
    glyphScale: 1.0,
  },
  {
    slug: 'contact-us',
    label: 'CONTACT US',
    headline: ['Guiding Healthcare', 'Outcomes'],
    text: 'Have a healthcare product or technology challenge? Email hello@stratascientific.com or call +1 215.776.7791 to discuss next steps.',
    threshold: 0.08,
    glyph: asset('mountain', 'png'),
    glyphScale: 1.2,
  },
]
