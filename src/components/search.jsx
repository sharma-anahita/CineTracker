import { useId } from 'react'

export default function Search({
    searchTerm,
    setSearchTerm,
    getAiRecommendations,
    aiLoading,
    aiRecommendations,
    aiError,
}) {
    const id = useId()

    function normalize(item) {
        if (item && typeof item === 'object') {
            return {
                title: item.title || item.name || item.movieTitle || '',
                description: item.description || item.summary || item.note || '',
                poster: item.poster || item.poster_url || item.image || null,
                rating: item.rating || item.score || null,
                year: item.year || null,
            }
        }
        const s = String(item || '')
        const firstPeriod = s.indexOf('.')
        if (firstPeriod > -1) {
            return {
                title: s.slice(0, firstPeriod).trim(),
                description: s.slice(firstPeriod + 1).trim(),
                poster: null,
                rating: null,
                year: null,
            }
        }
        const words = s.split(/\s+/)
        return {
            title: words.slice(0, 6).join(' '),
            description: words.slice(6).join(' '),
            poster: null,
            rating: null,
            year: null,
        }
    }

    return (
        <div className="search">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                    aria-label={`search-${id}`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search movies..."
                />
                <button onClick={getAiRecommendations} disabled={aiLoading}>
                    {aiLoading ? 'Loading…' : 'Get recommendations'}
                </button>
            </div>

            <div style={{ marginTop: 12 }}>
                {aiLoading ? (
                    <div>
                        <p style={{ color: '#666', marginTop: 0 }}>Generating personalized recommendations…</p>
                        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingTop: 8 }}>
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} style={{ flex: '0 0 180px', minWidth: 140 }}>
                                    <div style={{ width: '100%', height: 96, background: '#f2f2f2', borderRadius: 8 }} />
                                    <div style={{ height: 10 }} />
                                    <div style={{ width: '70%', height: 12, background: '#eee', borderRadius: 6 }} />
                                    <div style={{ height: 6 }} />
                                    <div style={{ width: '40%', height: 10, background: '#f5f5f5', borderRadius: 6 }} />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : aiRecommendations && Array.isArray(aiRecommendations) && aiRecommendations.length > 0 ? (
                    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6, marginTop: 6 }}>
                        {aiRecommendations.map((raw, i) => {
                            const rec = normalize(raw)
                            return (
                                <div
                                    key={i}
                                    style={{ flex: '0 0 200px', minWidth: 160, border: '1px solid #eee', borderRadius: 8, padding: 10, background: '#fff', boxSizing: 'border-box' }}
                                >
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <div style={{ width: 64, height: 96, background: '#f2f2f2', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {rec.poster ? (
                                                <img src={rec.poster} alt={rec.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                                            ) : (
                                                <div style={{ width: 36, height: 36, background: '#e6e6e6', borderRadius: 4 }} />
                                            )}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.title || 'Untitled'}</div>
                                            <div style={{ fontSize: 13, color: '#444', height: 40, overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.description || ''}</div>
                                            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                                                {rec.rating ? <div style={{ fontSize: 12, color: '#444' }}>Rating: {rec.rating}</div> : <div style={{ fontSize: 12, color: '#aaa' }}> </div>}
                                                {rec.year && <div style={{ fontSize: 12, color: '#666' }}>{rec.year}</div>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div style={{ marginTop: 8, color: '#555' }}>
                        <p style={{ margin: 0 }}>No recommendations found right now. Try broadening your search or try again.</p>
                        <div style={{ marginTop: 8 }}>
                            <button onClick={getAiRecommendations} disabled={aiLoading}>{aiLoading ? 'Getting recommendations...' : 'Try again'}</button>
                        </div>
                    </div>
                )}

                {aiError && <p style={{ color: 'red' }}>{aiError}</p>}
            </div>
        </div>
    )
}