import { useState, useEffect } from 'react'
import './App.css'

const TOTAL = 30

async function searchImage(name) {
  try {
    const res = await fetch(`/api/search-image?q=${encodeURIComponent(name)}`)
    const data = await res.json()
    return data.image || null
  } catch {
    return null
  }
}

function NameInput({ onGenerate }) {
  const [names, setNames] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const parsed = names
      .split('\n')
      .map(n => n.trim())
      .filter(Boolean)

    if (parsed.length !== TOTAL) {
      alert(`Please enter exactly ${TOTAL} names (you have ${parsed.length})`)
      return
    }
    onGenerate(parsed)
  }

  return (
    <div className="input-screen">
      <h1>Guess Who Board Maker</h1>
      <p className="subtitle">Enter {TOTAL} names, one per line</p>
      <form onSubmit={handleSubmit}>
        <textarea
          value={names}
          onChange={(e) => setNames(e.target.value)}
          placeholder={`e.g.\nDonald Trump\nBarack Obama\nMichael Jackson\nBeyonce\nAlbert Einstein\n...`}
          rows={16}
        />
        <div className="count">{names.split('\n').filter(l => l.trim()).length} / {TOTAL}</div>
        <button type="submit">Generate Board</button>
      </form>
    </div>
  )
}

function Board({ names, onBack }) {
  const [images, setImages] = useState({})
  const [loading, setLoading] = useState(true)
  const [flipped, setFlipped] = useState({})
  const [editing, setEditing] = useState(null)
  const [urlInput, setUrlInput] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all(
      names.map(name =>
        searchImage(name).then(img => ({ name, img }))
      )
    ).then(results => {
      if (cancelled) return
      const map = {}
      results.forEach(({ name, img }) => { map[name] = img })
      setImages(map)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [names])

  const toggleFlip = (name) => {
    if (editing) return
    setFlipped(prev => ({ ...prev, [name]: !prev[name] }))
  }

  const handleMissingClick = (e, name) => {
    e.stopPropagation()
    setEditing(name)
    setUrlInput('')
  }

  const handleUrlSubmit = (e) => {
    e.preventDefault()
    if (urlInput.trim()) {
      setImages(prev => ({ ...prev, [editing]: urlInput.trim() }))
    }
    setEditing(null)
    setUrlInput('')
  }

  if (loading) {
    return (
      <div className="loading">
        <h2>Loading images...</h2>
        <p>Searching for images...</p>
      </div>
    )
  }

  const missingCount = names.filter(n => !images[n]).length

  return (
    <div className="board-screen">
      <div className="board-header">
        <button className="back-btn" onClick={onBack}>← New Board</button>
        <h2>Guess Who?</h2>
        {missingCount > 0 && (
          <span className="missing-hint">{missingCount} missing — click ? to add image URL</span>
        )}
      </div>
      {editing && (
        <div className="url-modal" onClick={() => setEditing(null)}>
          <form className="url-form" onClick={e => e.stopPropagation()} onSubmit={handleUrlSubmit}>
            <h3>Add image for "{editing}"</h3>
            <p>Paste an image URL (right-click an image on Google → Copy image address)</p>
            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              autoFocus
            />
            <div className="url-form-buttons">
              <button type="button" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit">Save</button>
            </div>
          </form>
        </div>
      )}
      <div className="board">
        {names.map((name) => (
          <div
            key={name}
            className={`card ${flipped[name] ? 'flipped' : ''}`}
            onClick={() => toggleFlip(name)}
          >
            <div className="card-inner">
              <div className="card-front">
                {images[name] ? (
                  <img src={images[name]} alt={name} />
                ) : (
                  <div className="no-image" onClick={(e) => handleMissingClick(e, name)}>?</div>
                )}
                <div className="card-name">{name}</div>
              </div>
              <div className="card-back" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function App() {
  const [names, setNames] = useState(null)

  if (names) {
    return <Board names={names} onBack={() => setNames(null)} />
  }
  return <NameInput onGenerate={setNames} />
}

export default App
