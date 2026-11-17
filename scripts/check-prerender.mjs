import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const expectedIds = [
  'about-us',
  'early-innovation',
  'roadmap-alignment',
  'engineering-optimization',
  'target-screening',
  'technical-due-diligence',
  'post-merger-integration',
  'contact-us',
]

const server = await createServer({
  configFile: false,
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
})

try {
  const { PAGE_SCENES } = await server.ssrLoadModule('/src/scenes.ts')
  const html = await readFile('dist/index.html', 'utf8')
  const articles = [...html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)].map((match) => match[0])

  assert.deepEqual(PAGE_SCENES.map((scene) => scene.slug), expectedIds, 'Unexpected scene IDs or order')
  assert.equal(articles.length, expectedIds.length, 'Expected exactly eight prerendered articles')
  assert.match(html, /<main id="top" class="sg-root" data-state="loading" data-active-scene="0">/)
  assert.ok(html.includes('<section class="sg-track" aria-label="Strata Scientific services">'))
  assert.ok(html.includes('<div class="sg-scenes">'))

  for (const [index, scene] of PAGE_SCENES.entries()) {
    const expected = renderToStaticMarkup(
      createElement(
        'article',
        { id: scene.slug, className: 'sg-scene' },
        createElement(
          'div',
          { className: 'sg-scene__content' },
          createElement(index === 0 ? 'h1' : 'h2', null, scene.headline.join(' ')),
          createElement('p', null, scene.label.replace(/\n/g, ' ')),
          createElement('p', null, scene.text),
        ),
      ),
    )
    assert.equal(articles[index], expected, `Missing or inaccessible prerendered content for ${scene.slug}`)
  }

  console.log('Verified all eight accessible scene articles in dist/index.html.')
} finally {
  await server.close()
}
