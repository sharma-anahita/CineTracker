import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import HomeButton from './HomeButton'
import './MovieDetails.css'

const API_BASE_URL = 'https://api.themoviedb.org/3'
const API_KEY = import.meta.env.VITE_TMDB_API_KEY

export default function MovieDetails() {
  const { movieId } = useParams()

  const [movie, setMovie] = useState(null)
  const [providers, setProviders] = useState(null)
  const [countryCode, setCountryCode] = useState('US')
  const [cast, setCast] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [aiSummary, setAiSummary] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)

  useEffect(() => {
    if (!movieId) return

    // Detect user's country code from browser locale, fallback to 'US'
    function detectCountryCode() {
      try {
        const nav = typeof navigator !== 'undefined' ? navigator : null
        const locale = (nav && ((nav.languages && nav.languages[0]) || nav.language)) || (Intl && Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions && Intl.DateTimeFormat().resolvedOptions().locale) || ''
        if (!locale) return 'US'
        const normalized = locale.replace('_', '-').toUpperCase()
        const parts = normalized.split('-')
        // region is usually the second part: en-US -> US
        if (parts.length > 1 && parts[1].length === 2) return parts[1]
        // sometimes locale is just the language; try to extract trailing 2 letters
        const match = parts[0].match(/[A-Z]{2}$/)
        return match ? match[0] : 'US'
      } catch (e) {
        return 'US'
      }
    }

    const detectedCountry = detectCountryCode()
    setCountryCode(detectedCountry)

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const detailsUrl = `${API_BASE_URL}/movie/${movieId}?api_key=${API_KEY}`
        const providersUrl = `${API_BASE_URL}/movie/${movieId}/watch/providers?api_key=${API_KEY}`
        const creditsUrl = `${API_BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`

        const urls = [detailsUrl, providersUrl, creditsUrl]
        const responses = await Promise.all(urls.map((u) => fetch(u)))

        const names = ['details', 'providers', 'credits']
        for (let i = 0; i < responses.length; i++) {
          if (!responses[i].ok) {
            const statusText = responses[i].statusText || responses[i].status
            throw new Error(`Failed to fetch ${names[i]}: ${statusText}`)
          }
        }

        const [detailsData, providersData, creditsData] = await Promise.all(
          responses.map((r) => r.json())
        )

        if (cancelled) return

        setMovie(detailsData)
        // pick flatrate providers for the detected country
        const regional = providersData.results && providersData.results[detectedCountry]
        const flatrate = regional && Array.isArray(regional.flatrate) ? regional.flatrate : []
        setProviders(flatrate)
        // store top 8 cast members with required fields
        const rawCast = Array.isArray(creditsData.cast) ? creditsData.cast.slice(0, 8) : []
        const shaped = rawCast.map((person) => ({
          name: person.name,
          character: person.character,
          profile_path: person.profile_path,
          // prefer the TMDb person id for linking to person pages
          id: person.id || person.cast_id || person.credit_id,
        }))
        setCast(shaped)
      } catch (err) {
        // Log error for diagnostics and show a friendly message
        console.error('MovieDetails load error:', err)
        if (!cancelled) setError(err.message || 'Unable to load movie data')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [movieId, reloadKey])

  // Placeholder for AI-generated movie summary.
  // TODO: implement AI integration to generate a concise summary from `movie`.
  // This function should eventually call an AI service and return a string.
  async function generateAISummary(movieData) {
    // Send movie title and overview to backend AI endpoint.
    const payload = {
      title: movieData?.title || movieData?.name || '',
      overview: movieData?.overview || '',
    }

    const resp = await fetch('/api/ai/movie-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText || 'Unknown error')
      throw new Error(text || `AI service responded with ${resp.status}`)
    }

    const contentType = (resp.headers.get('content-type') || '').toLowerCase()
    if (contentType.includes('application/json')) {
      const data = await resp.json()
      return data.summary || data.text || data.result || JSON.stringify(data)
    }

    return await resp.text()
  }

  async function handleGenerateAISummary() {
    setAiError(null)
    setAiLoading(true)
    setAiSummary(null)
    try {
      const summary = await generateAISummary(movie)
      setAiSummary(summary)
    } catch (err) {
      console.error('AI summary generation failed', err)
      setAiError('Failed to generate AI summary')
    } finally {
      setAiLoading(false)
    }
  }

  if (isLoading)
    return (
      <div className="movie-details-container">
        <div className="skeleton-details">
          <div className="skeleton-poster" />
          <div className="skeleton-meta">
            <div className="skeleton-title" />
            <div className="skeleton-overview" />
            <div className="skeleton-providers">
              <div className="skeleton-provider" />
              <div className="skeleton-provider" />
              <div className="skeleton-provider" />
            </div>
          </div>
        </div>

        <section style={{ marginTop: 24 }}>
          <h2>Cast</h2>
          <div className="skeleton-cast-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div className="skeleton-cast-card" key={i}>
                <div className="box" />
                <div className="line-1" />
                <div className="line-2" />
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  if (error)
    return (
      <div className="movie-details-container">
        <h2>Something went wrong</h2>
        <p>We couldn't load the movie details. Please try again.</p>
        <p style={{ color: '#666', fontSize: 12 }}>Technical: {error}</p>
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => {
              setError(null)
              setReloadKey((k) => k + 1)
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  if (!movie) return <div className="movie-details-container">No movie data</div>

  return (
    <div className="movie-details-container">
      <div className="home-button-outer">
        <HomeButton />
      </div>
      <div className="movie-details-grid">
        {/* Left column: poster and providers */}
        <aside className="left-col">
          <div className="poster-wrap">
            {movie.poster_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w500/${movie.poster_path}`}
                alt={movie.title || movie.name}
              />
            ) : (
              <p>No poster available.</p>
            )}
          </div>

          {providers && providers.length > 0 && (
            <section className="providers-section">
              <h2>Available On</h2>
              <div className="providers-list">
                {providers.map((p) => (
                  p.logo_path ? (
                    <img
                      key={p.provider_id}
                      src={`https://image.tmdb.org/t/p/w92${p.logo_path}`}
                      alt={p.provider_name}
                    />
                  ) : (
                    <span key={p.provider_id}>{p.provider_name}</span>
                  )
                ))}
              </div>
            </section>
          )}
        </aside>

        {/* Right column: title, meta, and cast */}
        <main className="right-col">
          <header>
            <h1>{movie.title || movie.name}</h1>
            <div>
              <strong>Release date:</strong> {movie.release_date || 'N/A'}
            </div>
            <div>
              <strong>Rating:</strong> {movie.vote_average != null ? movie.vote_average.toFixed(1) : 'N/A'}
            </div>
          </header>

          <section className="overview">
            <p>{movie.overview}</p>
          </section>

          <section className="ai-summary-section">
            <h2>AI Summary</h2>
            {aiSummary ? (
              <p>{aiSummary}</p>
            ) : (
              <p style={{ color: '#666' }}>No AI summary generated yet.</p>
            )}
            {aiError && <p style={{ color: 'red', fontSize: 12 }}>{aiError}</p>}
            <div style={{ marginTop: 8 }}>
              <button onClick={handleGenerateAISummary} disabled={aiLoading}>
                {aiLoading ? 'Generating...' : 'Generate AI Summary'}
              </button>
            </div>
          </section>

          <section className="cast-section">
            <h2>Cast</h2>
            {cast.length > 0 ? (
              <div className="cast-grid">
                {cast.map((c) => (
                  <Link to={`/person/${c.id}`} key={c.id}>
                    <div className="cast-card">
                      {c.profile_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${c.profile_path}`}
                          alt={c.name}
                        />
                      ) : (
                        <img src="/no-profile.png" alt="No profile" />
                      )}
                      <div className="cast-info">
                        <div className="cast-name">{c.name}</div>
                        <div className="cast-character">as {c.character}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p>No cast information available.</p>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
