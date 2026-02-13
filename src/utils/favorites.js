// Helpers for storing favorited movies in localStorage.
// Provides: getFavorites, isFavorited, addFavorite, removeFavorite, toggleFavorite

const STORAGE_KEY = 'cine_favorites_v1'
let _memoryFallback = []

function _hasLocalStorage() {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  } catch (e) {
    return false
  }
}

function _read() {
  if (!_hasLocalStorage()) return _memoryFallback.slice()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

function _write(arr) {
  if (!_hasLocalStorage()) {
    _memoryFallback = Array.isArray(arr) ? arr.slice() : []
    return
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr || []))
    try {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('cine:favorites:change', { detail: { action: 'write' } }))
      }
    } catch (e) {
      // ignore dispatch errors
    }
  } catch (e) {
    // ignore write errors (quota, private mode, etc.)
  }
}

/**
 * Return an array of favorited movie objects (shallow copy).
 */
export function getFavorites() {
  return _read()
}

/**
 * Return true if the given movie id is in favorites.
 * Accepts number or string id.
 */
export function isFavorited(movieId) {
  if (movieId == null) return false
  const id = String(movieId)
  return _read().some((m) => String(m.id) === id)
}

/**
 * Add a movie to favorites. Movie can be a TMDb result object or a minimal shape.
 * Returns true if added, false if it was already present.
 */
export function addFavorite(movie) {
  if (!movie || movie.id == null) return false
  const id = String(movie.id)
  const current = _read()
  if (current.some((m) => String(m.id) === id)) return false

  // store a minimal, stable shape to reduce payload size
  const item = {
    id: movie.id,
    title: movie.title || movie.name || '',
    poster_path: movie.poster_path || movie.poster || null,
    release_date: movie.release_date || movie.first_air_date || null,
  }

  // preserve any available genre information (ids, names or full genre objects)
  if (movie.genre_ids && Array.isArray(movie.genre_ids) && movie.genre_ids.length > 0) {
    item.genre_ids = movie.genre_ids.slice()
  }
  if (movie.genre_names && Array.isArray(movie.genre_names) && movie.genre_names.length > 0) {
    item.genre_names = movie.genre_names.slice()
  }
  if (movie.genres && Array.isArray(movie.genres) && movie.genres.length > 0) {
    // keep full objects if present (TMDb returns {id,name})
    item.genres = movie.genres.map((g) => (g && g.id ? { id: g.id, name: g.name } : g))
  }

  // add to front (most-recent at start)
  current.unshift(item)
  _write(current)
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('cine:favorites:change', { detail: { action: 'add', item } }))
    }
  } catch (e) {}
  return true
}

/**
 * Remove a movie from favorites by id. Returns true if removed.
 */
export function removeFavorite(movieId) {
  if (movieId == null) return false
  const id = String(movieId)
  const current = _read()
  const filtered = current.filter((m) => String(m.id) !== id)
  if (filtered.length === current.length) return false
  _write(filtered)
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('cine:favorites:change', { detail: { action: 'remove', id: movieId } }))
    }
  } catch (e) {}
  return true
}

/**
 * Toggle favorite state for a movie object. Returns true if movie is now favorited.
 */
export function toggleFavorite(movie) {
  if (!movie || movie.id == null) return false
  if (isFavorited(movie.id)) {
    removeFavorite(movie.id)
    return false
  }
  addFavorite(movie)
  return true
}

export default {
  getFavorites,
  isFavorited,
  addFavorite,
  removeFavorite,
  toggleFavorite,
}
