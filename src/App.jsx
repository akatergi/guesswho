import { useState, useEffect } from 'react'
import LZString from 'lz-string'
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

function encodeBoardToHash(names, images) {
  const data = names.map(n => [n, images[n] || ''])
  return LZString.compressToEncodedURIComponent(JSON.stringify(data))
}

function decodeBoardFromHash(hash) {
  try {
    const json = LZString.decompressFromEncodedURIComponent(hash)
    if (!json) return null
    const data = JSON.parse(json)
    if (!Array.isArray(data) || data.length !== TOTAL) return null
    const names = data.map(d => d[0])
    const images = {}
    data.forEach(([name, img]) => { if (img) images[name] = img })
    return { names, images }
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

function Board({ names, initialImages, onBack }) {
  const [images, setImages] = useState(initialImages || {})
  const [loading, setLoading] = useState(!initialImages)
  const [flipped, setFlipped] = useState({})
  const [editing, setEditing] = useState(null)
  const [urlInput, setUrlInput] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (initialImages) return
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
  }, [names, initialImages])

  useEffect(() => {
    if (loading) return
    const hash = encodeBoardToHash(names, images)
    window.history.replaceState(null, '', '#' + hash)
  }, [images, loading, names])

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

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
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
        <button className="share-btn" onClick={handleShare}>
          {copied ? 'Copied!' : 'Share Board'}
        </button>
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
  const [board, setBoard] = useState(null)

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) {
      const decoded = decodeBoardFromHash(hash)
      if (decoded) {
        setBoard(decoded)
      }
    }
  }, [])

  const handleGenerate = (names) => {
    setBoard({ names, images: null })
  }

  const handleBack = () => {
    window.history.replaceState(null, '', window.location.pathname)
    setBoard(null)
  }

  if (board) {
    return <Board names={board.names} initialImages={board.images} onBack={handleBack} />
  }
  return <NameInput onGenerate={handleGenerate} />
}

export default App
