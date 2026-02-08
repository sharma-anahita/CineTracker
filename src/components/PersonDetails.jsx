import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import './PersonDetails.css'

const API_BASE_URL = 'https://api.themoviedb.org/3'
const API_KEY = import.meta.env.VITE_TMDB_API_KEY

export default function PersonDetails() {
  const { personId } = useParams()

  const [person, setPerson] = useState(null)
  const [credits, setCredits] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const imgRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!personId) return

    // Clear previous data immediately to avoid showing stale content and scroll to top
    setPerson(null)
    setCredits([])
    setError(null)
    setIsLoading(true)
    if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo({ top: 0 })

    let cancelled = false

    async function load() {
      try {
        const detailsUrl = `${API_BASE_URL}/person/${personId}?api_key=${API_KEY}`
        const creditsUrl = `${API_BASE_URL}/person/${personId}/movie_credits?api_key=${API_KEY}`

        const [detailsRes, creditsRes] = await Promise.all([
          fetch(detailsUrl),
          fetch(creditsUrl),
        ])

        if (!detailsRes.ok) throw new Error('Failed to fetch person details')
        if (!creditsRes.ok) throw new Error('Failed to fetch person credits')

        const detailsData = await detailsRes.json()
        const creditsData = await creditsRes.json()

        if (cancelled) return

        // Shape and store only the requested person fields
        const shapedPerson = {
          name: detailsData.name || null,
          profile_path: detailsData.profile_path || null,
          biography: detailsData.biography || null,
          birthday: detailsData.birthday || null,
          place_of_birth: detailsData.place_of_birth || null,
          known_for_department: detailsData.known_for_department || null,
        }

        setPerson(shapedPerson)

        // store movie credits (cast) — filter cast-only, sort by release date desc, limit to top 12
        const rawCast = Array.isArray(creditsData.cast) ? creditsData.cast : []
        const shapedMovies = rawCast
          .map((m) => ({
            id: m.id,
            title: m.title || m.original_title || null,
            release_date: m.release_date || m.first_air_date || null,
            character: m.character || m.job || null,
            poster_path: m.poster_path || null,
          }))
          .filter((m) => m.title || m.id)
          .sort((a, b) => {
            const ta = a.release_date ? Date.parse(a.release_date) : 0
            const tb = b.release_date ? Date.parse(b.release_date) : 0
            return tb - ta
          })
          .slice(0, 12)

        setCredits(shapedMovies)
        setIsLoading(false)
      } catch (err) {
        if (!cancelled) {
          console.error(err)
          setError(err.message || 'Failed to load person data')
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [personId])

  // Set up mount animation and parallax once `person` (and rendered image) exists.
  useEffect(() => {
    if (!person) return
    const containerEl = containerRef.current
    const imgEl = imgRef.current
    if (!containerEl || !imgEl || typeof window === 'undefined') return

    const handleMove = (e) => {
      const rect = containerEl.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width - 0.5) || 0
      const y = ((e.clientY - rect.top) / rect.height - 0.5) || 0
      const max = 8 // px
      const tx = (x * max * -1).toFixed(2) + 'px'
      const ty = (y * max * -1).toFixed(2) + 'px'
      imgEl.style.setProperty('--tx', tx)
      imgEl.style.setProperty('--ty', ty)
    }

    const handleLeave = () => {
      imgEl.style.setProperty('--tx', '0px')
      imgEl.style.setProperty('--ty', '0px')
    }

    containerEl.addEventListener('mousemove', handleMove)
    containerEl.addEventListener('mouseleave', handleLeave)

    // trigger mount animation on next frame
    const raf = requestAnimationFrame(() => imgEl.classList && imgEl.classList.add('is-mounted'))

    return () => {
      containerEl.removeEventListener('mousemove', handleMove)
      containerEl.removeEventListener('mouseleave', handleLeave)
      cancelAnimationFrame(raf)
      imgEl.style.setProperty('--tx', '0px')
      imgEl.style.setProperty('--ty', '0px')
      imgEl.classList && imgEl.classList.remove('is-mounted')
    }
  }, [person])

  // Render nothing while loading (per request)
  if (isLoading) return null

  if (error) return (
    <div style={{ padding: 16 }}>
      <h2>Error</h2>
      <p>{error}</p>
    </div>
  )

  if (!person) return null

  return (
    <div className="movie-details-container">
      <div className="person-hero" ref={containerRef}>
        <div className="hero-media">
          {person.profile_path ? (
            <img
              ref={imgRef}
              src={`https://image.tmdb.org/t/p/w300${person.profile_path}`}
              alt={person.name}
            />
          ) : (
            <img ref={imgRef} src="/no-profile.png" alt="No profile" />
          )}
        </div>

        <div className="hero-meta">
          <h1 className="person-name">{person.name}</h1>
          <div className="meta-row">
            <div><strong>Known for:</strong> {person.known_for_department || '—'}</div>
            <div><strong>Born:</strong> {person.birthday || '—'}</div>
            <div><strong>Place of birth:</strong> {person.place_of_birth || '—'}</div>
          </div>
        </div>
      </div>

      <div className="person-content">
        <section className="biography-section">
          <h2>Biography</h2>
          {person.biography && person.biography.trim() ? (
            <div style={{ marginTop: 8 }}>
              {person.biography.split(/\n+/).map((para, i) => (
                <p key={i} style={{ marginTop: i === 0 ? 0 : 12, lineHeight: 1.6 }}>{para}</p>
              ))}
            </div>
          ) : (
            <p style={{ marginTop: 8, color: '#6b7280' }}>Biography not available for this person.</p>
          )}
        </section>

        <section className="filmography-section">
          <h2>Filmography</h2>
          {credits.length > 0 ? (
            <div className="filmography-grid">
              {credits.map((m) => (
                <Link key={m.id} to={`/movie/${m.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="film-card">
                    {m.poster_path ? (
                      <img src={`https://image.tmdb.org/t/p/w300${m.poster_path}`} alt={m.title || m.original_title} />
                    ) : (
                      <img src="/no-movie.png" alt="No poster" />
                    )}
                    <div className="film-title">{m.title || m.original_title}</div>
                    <div className="film-year">{m.release_date ? m.release_date.slice(0,4) : '—'}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p>No movie credits found.</p>
          )}
        </section>
      </div>
    </div>
  )
}
