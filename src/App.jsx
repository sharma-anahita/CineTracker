import { useState, useEffect } from "react";
import { useDebounce } from "react-use";
import "./App.css";
import Search from "./components/search";
import { Link } from 'react-router-dom'
import MovieCard from "./components/MovieCard.jsx";
import { updateSearchCount, getTrendingMovies } from "./appwrite.js";

const API_BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

const API_OPTIONS = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization:
      "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzMTgzMzJjMmRkYjM3MjEyMjJlYzQyYTk4YTU5ZTU4ZiIsIm5iZiI6MTc1NTI1NTIzNS45MzcsInN1YiI6IjY4OWYxMWMzZTk5YTcwNDhhOTVlNGQ2YyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.GVVGrEe2OfqHH0R6EHI7j0YcAVPmmi_b4-XbBs1qj7c",
  },
};

const App = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  async function fetchAiRecommendations() {
    setAiLoading(true)
    setAiError(null)
    setAiRecommendations(null)
    try {
      // Build request payload with optional context from localStorage
      const buildPayload = () => {
        const p = {}
        if (searchTerm) p.query = searchTerm
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            const rv = localStorage.getItem('recentlyViewed')
            if (rv) {
              try { p.recentlyViewed = JSON.parse(rv) } catch { p.recentlyViewed = rv }
            }
            const sg = localStorage.getItem('selectedGenres')
            if (sg) {
              try { p.selectedGenres = JSON.parse(sg) } catch { p.selectedGenres = sg }
            }
          }
        } catch (e) {}
        return Object.keys(p).length === 0 ? {} : p
      }

      const resp = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })

      if (!resp.ok) {
        const text = await resp.text().catch(() => resp.statusText || 'Request failed')
        throw new Error(text || `Status ${resp.status}`)
      }

      const data = await resp.json()
      const recs = data && data.recommendations ? data.recommendations : data

      const titles = (Array.isArray(recs) ? recs : [])
        .map((item) => (item && typeof item === 'object' ? item.title || item.name : String(item || '')))
        .filter(Boolean)
        .slice(0, 5)

      const fetchTmdbForTitle = async (title) => {
        try {
          const url = `${API_BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}&page=1`
          const r = await fetch(url)
          if (!r.ok) return { title }
          const d = await r.json()
          const best = Array.isArray(d.results) && d.results.length > 0 ? d.results[0] : null
          if (!best) return { title }
          return {
            title: best.title || best.original_title || title,
            poster: best.poster_path ? `https://image.tmdb.org/t/p/w500${best.poster_path}` : null,
            rating: best.vote_average != null ? best.vote_average : null,
            year: best.release_date ? best.release_date.slice(0, 4) : null,
            tmdb_id: best.id || null,
          }
        } catch {
          return { title }
        }
      }

      const detailed = await Promise.all(titles.map(fetchTmdbForTitle))
      setAiRecommendations(detailed)
    } catch (err) {
      console.error('fetchAiRecommendations error', err)
      setAiError(err.message || 'Failed to fetch recommendations')
    } finally {
      setAiLoading(false)
    }
  }

  useDebounce(() => setDebouncedSearchTerm(searchTerm), 400, [searchTerm]);

  const fetchMovies = async (query = "") => {
    setIsLoading(true);
    setErrorMsg("");
    
    try {
      const endpoint = query
        ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
        : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`;
      
      const response = await fetch(endpoint, API_OPTIONS);

      if (!response.ok) {
        throw new Error("Failed to fetch movies from API");
      }

      const data = await response.json();

      if (data.results) {
        setMovies(data.results);

        if (query && data.results.length > 0) {
          await updateSearchCount(query, data.results[0]);
        }
      } else {
        setMovies([]);
        setErrorMsg("No movies found");
      }
    } catch (error) {
      console.error("Error fetching movies:", error);
      setErrorMsg(`Error while fetching movies: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  async function loadTrendingMovies() {
    try {
      const data = await getTrendingMovies(20);
      setTrendingMovies(data);
    } catch (err) {
      console.error("Error loading trending movies:", err);
    }
  }

  useEffect(() => {
    fetchMovies();
    loadTrendingMovies();
  }, []);

  useEffect(() => {
    if (debouncedSearchTerm) {
      fetchMovies(debouncedSearchTerm);
    } else {
      fetchMovies();
    }
  }, [debouncedSearchTerm]);

  return (
    <main>
      <div className="pattern" />
      <div className="wrapper">
        <header>
          <img src="./hero.png" alt="" />
          <h1>
            Find <span className="text-gradient">Movies</span> you wanna watch
          </h1>
          <Search
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            getAiRecommendations={fetchAiRecommendations}
            aiLoading={aiLoading}
            aiRecommendations={aiRecommendations}
            aiError={aiError}
          />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
            <Link to="/favorites" className="home-button">Favorites</Link>
          </div>
        </header>

        {trendingMovies.length > 0 && (
          <section className="trending">
            <h2>Trending Movies</h2>
            <ul>
              {trendingMovies.map((movie, index) => (
                <li key={movie.$id}>
                  <p>{index + 1}</p>
                  <img src={movie.poster_url} alt={movie.title} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="all-movies">
          <h2>All movies</h2>
          {isLoading ? (
            <div className="mb-8">
              <div className="flex justify-center">
                <div className="w-8 h-8 after:content-[''] after:block after:w-10 after:h-10 after:m-2 after:rounded-full after:border-[6.4px] after:border-current after:border-r-transparent after:border-b-transparent after:animate-dual-ring"></div>
              </div>
            </div>
          ) : errorMsg ? (
            <p className="text-red-500">{errorMsg}</p>
          ) : (
            <ul>
              {movies.map((movie) => (
                <MovieCard movie={movie} key={movie.id} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
};

export default App;