import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MovieDetails from './components/MovieDetails.jsx'
import PersonDetails from './components/PersonDetails.jsx'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<App />} />
                <Route path="/movie/:movieId" element={<MovieDetails />} />
                <Route path="/person/:personId" element={<PersonDetails />} />
            </Routes>
        </BrowserRouter>
    </StrictMode>
)
