import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MovieCard from '../components/MovieCard.jsx'
import { getFavorites } from '../utils/favorites'

const API_BASE_URL = 'https://api.themoviedb.org/3'
const API_KEY = import.meta.env.VITE_TMDB_API_KEY

function groupByGenre(movies) {
  const map = new Map()

  for (const m of movies) {
    const names = (m.genre_names && Array.isArray(m.genre_names) && m.genre_names.length > 0)
      ? m.genre_names
      : (m.genres && Array.isArray(m.genres) && m.genres.length > 0)
        ? m.genres.map((g) => g.name)
        : []

    if (names.length === 0) {
      if (!map.has('Uncategorized')) map.set('Uncategorized', [])
      map.get('Uncategorized').push(m)
      continue
    }

    for (const name of names) {
      if (!map.has(name)) map.set(name, [])
      map.get(name).push(m)
    }
  }

  return map
}

export default function Favorites() {
  const [favorites, setFavorites] = useState([])
  const [grouped, setGrouped] = useState(new Map())
  const [loading, setLoading] = useState(true)
  async function refreshFavorites() {
    setLoading(true)
    try {
      const favs = getFavorites() || []
      if (!favs || favs.length === 0) {
        setFavorites([])
        setGrouped(new Map())
        return
      }

      // Build genre id -> name map
      let genreMap = null
      if (API_KEY) {
        try {
          const gres = await fetch(`${API_BASE_URL}/genre/movie/list?api_key=${API_KEY}`)
          if (gres.ok) {
            const gdata = await gres.json()
            genreMap = new Map((gdata.genres || []).map((g) => [g.id, g.name]))
          }
        } catch (e) {
          genreMap = null
        }
      }

      const enhanced = await Promise.all(favs.map(async (m) => {
        if (m.genre_names && Array.isArray(m.genre_names) && m.genre_names.length > 0) return m
        if (m.genres && Array.isArray(m.genres) && m.genres.length > 0) return m

        if (m.genre_ids && Array.isArray(m.genre_ids) && genreMap) {
          return { ...m, genre_names: m.genre_ids.map((id) => genreMap.get(id)).filter(Boolean) }
        }

        if (API_KEY) {
          try {
            const res = await fetch(`${API_BASE_URL}/movie/${m.id}?api_key=${API_KEY}`)
            if (res.ok) {
              const d = await res.json()
              return { ...m, genres: Array.isArray(d.genres) ? d.genres : [] }
            }
          } catch (e) {
            // ignore
          }
        }

        return m
      }))

      setFavorites(enhanced)
      setGrouped(groupByGenre(enhanced))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshFavorites()
    const handler = () => refreshFavorites()
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('cine:favorites:change', handler)
    }
    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('cine:favorites:change', handler)
      }
    }
  }, [])

  return (
    <main>
      <div className="pattern" />
      <div className="wrapper">
        <header>
          <h1>Favorites</h1>
        </header>

        <section className="all-movies">
          {loading ? (
            <p>Loading favorites…</p>
          ) : favorites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <h3 style={{ marginBottom: 8 }}>No favorites yet</h3>
              <p style={{ margin: 0, color: '#cbd5e1' }}>Star movies you like and they'll appear here for quick access later.</p>
              <div style={{ marginTop: 14 }}>
                <Link to="/" className="home-button">Browse movies</Link>
              </div>
            </div>
          ) : (
            Array.from(grouped.keys()).sort().map((genre) => (
              <section className="genre-section" key={genre}>
                <h2>{genre}</h2>
                <ul className="favorites-list">
                  {grouped.get(genre).map((m) => (
                    <li className="favorites-item" key={`${genre}-${m.id}`}>
                      <MovieCard movie={m} />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </section>
      </div>
    </main>
  )
}
