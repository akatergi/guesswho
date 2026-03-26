import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'image-search-proxy',
      configureServer(server) {
        server.middlewares.use('/api/search-image', async (req, res) => {
          try {
            const url = new URL(req.url, 'http://localhost')
            const query = url.searchParams.get('q')
            if (!query) {
              res.statusCode = 400
              res.end(JSON.stringify({ image: null }))
              return
            }

            const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC3&first=1`
            const response = await fetch(searchUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
              }
            })
            const html = await response.text()

            const decoded = html.replaceAll('&quot;', '"').replaceAll('&amp;', '&')
            const matches = []
            const regex = /"murl"\s*:\s*"(https?:\/\/[^"]+)"/g
            let match
            while ((match = regex.exec(decoded)) !== null) {
              matches.push(match[1])
            }

            let validUrl = null
            for (const imgUrl of matches.slice(0, 8)) {
              try {
                const check = await fetch(imgUrl, {
                  method: 'HEAD',
                  headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
                  redirect: 'follow',
                  signal: AbortSignal.timeout(3000),
                })
                const contentType = check.headers.get('content-type') || ''
                if (check.ok && contentType.startsWith('image/')) {
                  validUrl = imgUrl
                  break
                }
              } catch {}
            }

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ image: validUrl }))
          } catch {
            res.statusCode = 500
            res.end(JSON.stringify({ image: null }))
          }
        })
      }
    }
  ],
})
