import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

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
    // Not implemented yet — return a placeholder string for now.
    return 'AI summary not implemented yet.'
  }

  if (isLoading)
    return (
      <div>
        <div className="skeleton-details" style={{display: 'flex', gap: 16}}>
          <div className="skeleton-poster" style={{width: 200, height: 300, backgroundColor: '#e5e7eb'}} />
          <div className="skeleton-meta" style={{flex: 1}}>
            <div className="skeleton-title" style={{width: '60%', height: 24, backgroundColor: '#e5e7eb', marginBottom: 12}} />
            <div className="skeleton-overview" style={{width: '100%', height: 72, backgroundColor: '#e5e7eb', marginBottom: 12}} />
            <div className="skeleton-providers" style={{display: 'flex', gap: 8}}>
              <div style={{width: 56, height: 32, backgroundColor: '#e5e7eb'}} />
              <div style={{width: 56, height: 32, backgroundColor: '#e5e7eb'}} />
              <div style={{width: 56, height: 32, backgroundColor: '#e5e7eb'}} />
            </div>
          </div>
        </div>

        <section style={{marginTop: 24}}>
          <h2>Cast</h2>
          <div className="cast-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginTop: 12}}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div className="cast-card" key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <div style={{width: 100, height: 140, backgroundColor: '#e5e7eb'}} />
                <div style={{width: 80, height: 12, backgroundColor: '#e5e7eb', marginTop: 8}} />
                <div style={{width: 100, height: 10, backgroundColor: '#e5e7eb', marginTop: 6}} />
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  if (error)
    return (
      <div>
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
  if (!movie) return <div>No movie data</div>

  return (
    <div>
      <h1>{movie.title || movie.name}</h1>

      <div>
        {movie.poster_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w500/${movie.poster_path}`}
            alt={movie.title || movie.name}
          />
        ) : (
          <p>No poster available.</p>
        )}
      </div>

      <p>{movie.overview}</p>

      <div>
        <strong>Release date:</strong> {movie.release_date || 'N/A'}
      </div>

      <div>
        <strong>Rating:</strong> {movie.vote_average != null ? movie.vote_average.toFixed(1) : 'N/A'}
      </div>

      <section>
        <h2>Available On</h2>
        {providers && providers.length > 0 ? (
          <div>
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
        ) : (
          <p>No streaming providers available in your region ({countryCode}).</p>
        )}
      </section>

      <section>
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
    </div>
  )
}
