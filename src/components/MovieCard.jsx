import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { isFavorited, toggleFavorite } from '../utils/favorites'

function MovieCard ({movie : {id,title,vote_average,poster_path,release_date,original_language,backdrop_path}}){ 
        const [favorited, setFavorited] = useState(false)

        useEffect(() => {
                setFavorited(isFavorited(id))
        }, [id])

        useEffect(() => {
            function onFavChange() {
                setFavorited(isFavorited(id))
            }
            if (typeof window !== 'undefined' && window.addEventListener) {
                window.addEventListener('cine:favorites:change', onFavChange)
            }
            return () => {
                if (typeof window !== 'undefined' && window.removeEventListener) {
                    window.removeEventListener('cine:favorites:change', onFavChange)
                }
            }
        }, [id])

        function handleToggle(e) {
            // prevent Link navigation by stopping propagation and default
            e.preventDefault()
            e.stopPropagation()
            if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
              e.nativeEvent.stopImmediatePropagation()
            }
            const newState = toggleFavorite({ id, title, poster_path, release_date })
            setFavorited(Boolean(newState))
        }

        return (
                <>
                <Link to={`/movie/${id}`}>
                    <div className="movie-card">
                            <button
                                type="button"
                                onClick={handleToggle}
                                className={`favorite-star ${favorited ? 'favorited' : ''}`}
                                aria-pressed={favorited}
                                aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                            >
                                {favorited ? (
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
                                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                                        <path d="M22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24z"/>
                                    </svg>
                                )}
                            </button>
                            <img src={poster_path ? `https://image.tmdb.org/t/p/w500/${poster_path}` :'/no-movie.png' } alt={title} />
                            <div className="mt-4">
                            <h3>{title}</h3>
                            <div className="content">
                                    <div className="rating">
                                            <img src="star.svg" alt="star" />
                                            <p > {vote_average? vote_average.toFixed(1):'N/A'} </p>
                                    </div>
                                    <span></span>
                                    <p className="lang">{original_language}</p>
                                    <span> </span>
                                    <p className="year">{release_date? release_date.split('-')[0]:'N/A'}</p>
                            </div>
                    </div> 
                    </div>
                </Link>
                </>
        );
}
export default MovieCard
 