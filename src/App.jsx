import { useState } from "react";
import { useDebounce } from "react-use";
import "./App.css";
import Search from "./components/search";
import { useEffect } from "react";
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
  const [errorMsg, seterrorMsg] = useState("");
  const [movies, setMovies] = useState([]);
  const [isLoading, setisLoading] = useState(true);
  const [debSearchTerm, setdebSearchTerm] = useState("");
  const [trendingMovies, settrendingMovies] = useState([]);

  useDebounce(() => setdebSearchTerm(searchTerm), 400, [searchTerm]);

  const fetchMovies = async (query = "") => {
    try {
      const endpoint = query
        ? `${API_BASE_URL}/search/movie?query=${encodeURI(query)}` //ensures query gets processed properly
        : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`;
      const response = await fetch(endpoint, API_OPTIONS);

      if (!response) {
        throw new Error("failed to fetch from API");
      }

      const data = await response.json();

      if (data.response === false) {
        setMovies([]);
        seterrorMsg(data.error);
        return;
      }

      setMovies(data.results);

      if (query && data.results.length > 0) {
        updateSearchCount(query, data.results[0]);
      }
    } catch (error) {
      console.log(`Error while fetching movies : ${error}`);
      seterrorMsg(`Error while fetching movies : ${error}`);
    } finally {
      setisLoading(false);
    }
  };

async function loadTrendingMovies() {
    try {
      const databaseId = import.meta.env.REACT_APP_APPWRITE_DATABASE_ID || "your-database-id";
      const collectionId =import.meta.env.REACT_APP_APPWRITE_COLLECTION_ID || "your-collection-id";
      const data = await getTrendingMovies(databaseId, collectionId, 20);
      setMovies(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadTrendingMovies();
  }, []);
 
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
          ></Search>
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
              <div className="lds-dual-ring text-lg font-semibold mb-4"></div>
              <div className="flex justify-center">
                <div className="w-8 h-8 after:content-[''] after:block after:w-10 after:h-10 after:m-2 after:rounded-full after:border-[6.4px] after:border-current after:border-r-transparent after:border-b-transparent after:animate-dual-ring"></div>
              </div>
            </div>
          ) : errorMsg ? (
            <p className="text-red-500">{errorMsg}</p>
          ) : (
            <>
              <ul>
                {movies.map((movie) => (
                  <MovieCard movie={movie} key={movie.id}></MovieCard>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </main>
  );
};

export default App;
