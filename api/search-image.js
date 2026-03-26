export default async function handler(req, res) {
  const query = req.query.q
  if (!query) {
    return res.status(400).json({ image: null })
  }

  try {
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

    return res.status(200).json({ image: validUrl })
  } catch {
    return res.status(500).json({ image: null })
  }
}
