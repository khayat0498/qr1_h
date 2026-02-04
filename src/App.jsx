import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import DotPattern from './DotPattern'

const MAX_LENGTH = 4000

export default function App() {
  const [text, setText] = useState('')
  const [mode, setMode] = useState('qr')
  const [size, setSize] = useState(260)
  const [qrUrl, setQrUrl] = useState('')
  const [barcodeSvg, setBarcodeSvg] = useState('')
  const [error, setError] = useState('')
  const [showLabel, setShowLabel] = useState(false)
  const [barcodeLabel, setBarcodeLabel] = useState('')

  const countText = useMemo(() => {
    const used = text.length
    return `${used}/${MAX_LENGTH}`
  }, [text])

  useEffect(() => {
    let cancelled = false
    setError('')

    if (!text.trim()) {
      setQrUrl('')
      setBarcodeSvg('')
      return
    }

    const nextSize = Math.min(800, Math.max(140, Number(size) || 260))
    if (nextSize !== size) setSize(nextSize)

    if (mode === 'qr') {
      QRCode.toDataURL(text, {
        width: nextSize,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#1d1b1a',
          light: '#ffffff',
        },
      })
        .then((url) => {
          if (!cancelled) {
            setQrUrl(url)
            setBarcodeSvg('')
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(`QR yaratishda xatolik: ${err.message}`)
            setQrUrl('')
          }
        })
    } else {
      try {
        const canvas = document.createElement('canvas')
        JsBarcode(canvas, text, {
          format: 'CODE128',
          width: Math.max(1.2, nextSize / 120),
          height: Math.max(70, nextSize * 0.6),
          margin: 8,
          displayValue: showLabel,
          text: showLabel && barcodeLabel ? barcodeLabel : undefined,
          font: 'Space Grotesk',
          fontSize: 16,
          textMargin: 6,
        })
        const svg = canvas.toDataURL('image/png')
        if (!cancelled) {
          setBarcodeSvg(svg)
          setQrUrl('')
        }
      } catch (err) {
        if (!cancelled) {
          setError(`Barcode yaratishda xatolik: ${err.message}`)
          setBarcodeSvg('')
        }
      }
    }

    return () => {
      cancelled = true
    }
  }, [text, mode, size, showLabel, barcodeLabel])

  const isReady = mode === 'qr' ? Boolean(qrUrl) : Boolean(barcodeSvg)
  const downloadUrl = mode === 'qr' ? qrUrl : barcodeSvg
  const fileName = mode === 'qr' ? 'qrcode.png' : 'barcode.png'

  const handleDownload = () => {
    if (!isReady) return
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="page">
      <DotPattern
        width={24}
        height={24}
        cr={1}
        className="dot-pattern"
        style={{ color: "rgba(0, 0, 0, 0.08)" }}
      />

      <div className="shell">
        {/* ── Top bar ── */}
        <nav className="topbar">
          <div className="logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <circle cx="17.5" cy="17.5" r="3.5" />
            </svg>
            <span>QR Generator</span>
          </div>
        </nav>

        {/* ── Hero card ── */}
        <div className="hero-card">
          <div className="hero-content">
            <h1>QR va Barcode</h1>
            <p>Matnni kiriting — natija darhol yangilanadi</p>
          </div>

          {/* ── Tabs ── */}
          <div className="tabs">
            <button
              type="button"
              className={`tab ${mode === 'qr' ? 'active' : ''}`}
              onClick={() => setMode('qr')}
            >
              QR Code
            </button>
            <button
              type="button"
              className={`tab ${mode === 'barcode' ? 'active' : ''}`}
              onClick={() => setMode('barcode')}
            >
              Barcode
            </button>
          </div>
        </div>

        {/* ── Main content ── */}
        <section className="grid">
          <div className="card">
            <div className="field-header">
              <label htmlFor="textInput">Ma'lumot</label>
              <span className="counter">{countText}</span>
            </div>
            <textarea
              id="textInput"
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, MAX_LENGTH))}
              placeholder="https://example.com yoki 123456789"
              maxLength={MAX_LENGTH}
            />

            <div className="field-header" style={{ marginTop: 18 }}>
              <label htmlFor="size">O'lcham (px)</label>
            </div>
            <input
              id="size"
              type="number"
              min={140}
              max={800}
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
            />

            <div className="actions">
              <button type="button" className="btn-primary" onClick={handleDownload} disabled={!isReady}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Yuklab olish
              </button>
              <button type="button" className="btn-ghost" onClick={() => setText('')}>
                Tozalash
              </button>
            </div>

            {mode === 'barcode' && (
              <div className="barcode-options">
                <div className="toggle-row">
                  <span className="toggle-label">Tagiga matn</span>
                  <button
                    type="button"
                    className={`toggle ${showLabel ? 'on' : ''}`}
                    onClick={() => setShowLabel(!showLabel)}
                    aria-pressed={showLabel}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>
                {showLabel && (
                  <input
                    type="text"
                    value={barcodeLabel}
                    onChange={(e) => setBarcodeLabel(e.target.value.slice(0, 12))}
                    placeholder="Maxsus matn"
                    maxLength={12}
                    className="label-input"
                  />
                )}
                <p className="hint">Barcode uchun ASCII belgilaridan foydalaning.</p>
              </div>
            )}
          </div>

          <div className="card preview-card">
            <div className="preview-label">Preview</div>
            <div className="preview-box">
              {!isReady && (
                <div className="placeholder">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.25">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <circle cx="17.5" cy="17.5" r="3.5" />
                  </svg>
                  <span>Natija shu yerda</span>
                </div>
              )}
              {mode === 'qr' && qrUrl && <img src={qrUrl} alt="QR code" />}
              {mode === 'barcode' && barcodeSvg && <img src={barcodeSvg} alt="Barcode" />}
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
