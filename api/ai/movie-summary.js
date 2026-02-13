export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.statusCode = 405
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('Method Not Allowed')
    return
  }

  // Read JSON body (Vercel usually provides parsed `req.body`). Fall back
  // to manual parsing if necessary.
  let body = req.body
  if (!body) {
    body = await new Promise((resolve) => {
      let data = ''
      req.on('data', (chunk) => (data += chunk))
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {})
        } catch (e) {
          resolve({})
        }
      })
      req.on('error', () => resolve({}))
    })
  }

  const title = body && body.title ? String(body.title) : ''
  const overview = body && body.overview ? String(body.overview) : ''

  // Helper fallback summary (used when AI is unavailable or fails).
  function fallbackSummary() {
    const maxLen = 800
    const trimmedOverview = overview.length > maxLen ? overview.slice(0, maxLen - 3) + '...' : overview
    if (title && overview) return `${title} — ${trimmedOverview}`
    if (overview) return trimmedOverview || 'No overview provided.'
    if (title) return title
    return 'No title or overview provided.'
  }

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    // Return fallback plain text if no API key configured.
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.statusCode = 200
    res.end(fallbackSummary())
    return
  }

  // Compose instructions for the AI model to ensure constraints are followed.
  const instructions = [
    {
      role: 'system',
      content:
        'You are an assistant that writes concise, spoiler-free movie summaries in simple language. Do not mention plot twists, spoilers, or endings. Keep the summary under 120 words. Focus on themes, tone, and general atmosphere. Output only the summary text, no labels or additional commentary.'
    },
    {
      role: 'user',
      content: `Title: ${title || 'Unknown'}\nOverview: ${overview || 'No overview provided.'}`
    }
  ]

  const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: instructions,
        max_tokens: 250,
        temperature: 0.6,
        n: 1,
      }),
    })

    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText || 'AI service error')
      throw new Error(text || `AI service responded ${resp.status}`)
    }

    const data = await resp.json()
    const content = (data && data.choices && data.choices[0] && (data.choices[0].message?.content || data.choices[0].text)) || ''
    const summary = String(content).trim()

    // As a safety net, enforce the plain-text requirement and a reasonable length.
    const final = summary || fallbackSummary()
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.statusCode = 200
    res.end(final)
  } catch (err) {
    console.error('AI generation error:', err && err.message)
    // On error, return fallback summary as plain text.
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.statusCode = 200
    res.end(fallbackSummary())
  }
}
