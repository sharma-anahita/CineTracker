export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Method Not Allowed' }))
    return
  }

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

  const query = body && body.query ? String(body.query) : ''
  const recentlyViewed = body && body.recentlyViewed ? body.recentlyViewed : null
  const selectedGenres = body && body.selectedGenres ? body.selectedGenres : null

  // Pools of sample titles by genre.
  const genrePools = {
    drama: ['Moonlight', 'Lady Bird', 'Marriage Story', 'Manchester by the Sea', 'The Florida Project'],
    comedy: ['The Grand Budapest Hotel', 'Little Miss Sunshine', 'The Big Sick', 'Napoleon Dynamite', 'What We Do in the Shadows'],
    thriller: ['Prisoners', 'Nocturnal Animals', 'Wind River', 'Zodiac', 'Sicario'],
    action: ['Mad Max: Fury Road', 'John Wick', 'The Raid', 'Skyfall', 'Logan'],
    romance: ['Before Sunrise', 'La La Land', 'Eternal Sunshine of the Spotless Mind', 'Her', 'Once'],
  }

  const generalPool = [
    'Parasite',
    'The Social Network',
    'Inception',
    'The Shawshank Redemption',
    'Spirited Away',
    'The Godfather',
    'Interstellar',
    'The Matrix',
    'Whiplash',
    'Get Out',
  ]

  // Helper to pick unique titles up to `count` from arrays
  function pickUnique(pools, count) {
    const out = []
    const seen = new Set()
    for (const pool of pools) {
      for (const t of pool) {
        if (out.length >= count) break
        if (!seen.has(t)) {
          out.push(t)
          seen.add(t)
        }
      }
      if (out.length >= count) break
    }
    // If still short, fill from generalPool
    for (const t of generalPool) {
      if (out.length >= count) break
      if (!seen.has(t)) {
        out.push(t)
        seen.add(t)
      }
    }
    return out.slice(0, count)
  }

  // Build pools based on context
  const pools = []
  if (Array.isArray(selectedGenres) && selectedGenres.length > 0) {
    for (const g of selectedGenres) {
      const key = String(g).toLowerCase()
      if (genrePools[key]) pools.push(genrePools[key])
    }
  }

  if (Array.isArray(recentlyViewed) && recentlyViewed.length > 0) {
    // Use recently viewed titles to influence selection: try to avoid repeats
    const recentTitles = recentlyViewed.map((m) => (m && m.title ? m.title : String(m))).filter(Boolean)
    // create a pool excluding recent titles
    const filteredGeneral = generalPool.filter((t) => !recentTitles.includes(t))
    pools.push(filteredGeneral)
  }

  if (query) {
    // Slight preference: include general pool but later annotate in frontend
    pools.push(generalPool)
  }

  if (pools.length === 0) {
    pools.push(generalPool)
  }

  const recommendations = pickUnique(pools, 5)
  // If an AI key is available, prefer generating recommendations via the AI
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    try {
      // Build a concise instruction for the AI.
      const moodPart = body && body.mood ? `Mood or tone: ${String(body.mood)}\n` : ''
      const genresPart = Array.isArray(selectedGenres) && selectedGenres.length > 0 ? `Preferred genres: ${selectedGenres.join(', ')}\n` : ''
      const recentPart = Array.isArray(recentlyViewed) && recentlyViewed.length > 0 ? `Recently viewed (titles): ${recentlyViewed.slice(0,3).map(m=> (m && m.title) ? m.title : String(m)).join(', ')}\n` : ''

      const systemPrompt = `You are an assistant that recommends popular, well-known movies. Produce exactly 5 movie titles only, with no explanations, commentary, numbering, or extra text. Prefer widely-known films and avoid obscure or very niche titles. Base choices on the provided context (mood, genres, recently viewed) when available.`

      const userPrompt = `${moodPart}${genresPart}${recentPart}If no context is given, provide a list of 5 generally appealing, non-obscure films across different moods and styles.`

      const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'

      const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 200,
          temperature: 0.7,
          n: 1,
        }),
      })

      if (!aiResp.ok) {
        const t = await aiResp.text().catch(() => aiResp.statusText || 'AI error')
        throw new Error(t || `AI responded ${aiResp.status}`)
      }

      const aiData = await aiResp.json()
      const raw = (aiData && aiData.choices && aiData.choices[0] && (aiData.choices[0].message?.content || aiData.choices[0].text)) || ''

      // Parse the AI output into up to 5 titles. Be permissive to handle
      // numbering, bullets, or JSON, but return only titles.
      function parseTitles(s) {
        if (!s) return []
        // If it's a JSON array, try to parse
        try {
          const j = JSON.parse(s)
          if (Array.isArray(j)) return j.map(String).slice(0,5)
        } catch (e) {
          // not JSON
        }

        // Split by newlines and commas as fallback
        const lines = s.split(/\r?\n|\t|;/).map(l => l.trim()).filter(Boolean)
        const titles = []
        for (const line of lines) {
          // remove numbering or bullets
          let t = line.replace(/^\d+\.|^[-*•]\s*/,'').trim()
          // sometimes AI includes extra text after a dash or colon — take left side if it looks like title
          // but prefer whole line otherwise
          t = t.replace(/^["'\u201C\u201D]?(.+?)["'\u201C\u201D]?\s*[-–:].*$/,'$1')
          // remove surrounding quotes
          t = t.replace(/^['"]|['"]$/g, '')
          if (t) titles.push(t)
          if (titles.length >= 5) break
        }
        // If still empty, fall back to earlier generated recommendations
        return titles.length > 0 ? titles.slice(0,5) : recommendations
      }

      const parsed = parseTitles(String(raw))

      const url = req.url || ''
      const isText = (req.headers && req.headers.accept && req.headers.accept.includes('text/plain')) || url.includes('format=text')
      if (isText) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.statusCode = 200
        res.end(parsed.join('\n'))
        return
      }

      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.statusCode = 200
      res.end(JSON.stringify({ recommendations: parsed }))
      return
    } catch (err) {
      console.error('AI recommend error:', err && err.message)
      // Fall back to non-AI recommendations below
    }
  }

  // Return non-AI recommendations as JSON or plain text
  const url = req.url || ''
  const isText = (req.headers && req.headers.accept && req.headers.accept.includes('text/plain')) || url.includes('format=text')
  if (isText) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.statusCode = 200
    res.end(recommendations.join('\n'))
    return
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.statusCode = 200
  res.end(JSON.stringify({ recommendations }))
}
