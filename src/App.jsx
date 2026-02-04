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

  const dataUrlToBlob = (dataUrl) => {
    const [header, base64] = dataUrl.split(',')
    const mime = header.match(/:(.*?);/)[1]
    const bin = atob(base64)
    const arr = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
    return new Blob([arr], { type: mime })
  }

  const handleShare = async (target) => {
    if (!isReady) return

    if (target === 'native') {
      try {
        const blob = dataUrlToBlob(downloadUrl)
        const file = new File([blob], fileName, { type: blob.type })
        await navigator.share({ files: [file] })
      } catch {}
      return
    }

    const blob = dataUrlToBlob(downloadUrl)
    const shareText = text.length > 100 ? text.slice(0, 100) + '...' : text

    const urls = {
      telegram: `https://t.me/share/url?url=${encodeURIComponent(text)}&text=${encodeURIComponent('QR/Barcode: ' + shareText)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    }

    if (urls[target]) {
      window.open(urls[target], '_blank', 'noopener')
    }
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

            {isReady && (
              <div className="share-row">
                <span className="share-label">Ulashish</span>
                <div className="share-buttons">
                  <button
                    type="button"
                    className="share-btn telegram"
                    onClick={() => handleShare('telegram')}
                    title="Telegram"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 1 0 24 12.056A12.01 12.01 0 0 0 11.944 0Zm5.654 8.22l-1.736 8.19c-.13.587-.475.73-.964.454l-2.667-1.966-1.286 1.238c-.143.143-.263.263-.539.263l.191-2.713 4.94-4.465c.215-.19-.047-.296-.334-.106l-6.107 3.845-2.632-.822c-.573-.179-.584-.573.12-.848l10.29-3.966c.476-.173.893.106.724.896Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="share-btn whatsapp"
                    onClick={() => handleShare('whatsapp')}
                    title="WhatsApp"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.019-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                    </svg>
                  </button>
                  {typeof navigator.share === 'function' && (
                    <button
                      type="button"
                      className="share-btn native"
                      onClick={() => handleShare('native')}
                      title="Boshqa..."
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
