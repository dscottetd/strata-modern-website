import react from '@vitejs/plugin-react'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer, defineConfig, type Plugin } from 'vite'

const prerenderApp = (): Plugin => ({
  name: 'prerender-app',
  apply: 'build',
  transformIndexHtml: {
    order: 'pre',
    async handler(html) {
      const server = await createServer({
        configFile: false,
        root: process.cwd(),
        plugins: [react()],
        appType: 'custom',
        logLevel: 'error',
        optimizeDeps: { noDiscovery: true },
        server: { middlewareMode: true },
      })

      try {
        const { default: App } = await server.ssrLoadModule('/src/App.tsx')
        const markup = renderToString(createElement(App))
        if (!html.includes('<!--app-html-->')) {
          throw new Error('Missing prerender mount marker in index.html')
        }
        return html.replace('<!--app-html-->', markup)
      } finally {
        await server.close()
      }
    },
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), prerenderApp()],
})
