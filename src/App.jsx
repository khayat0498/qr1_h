import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import DotPattern from './DotPattern'

const MAX_LENGTH = 4000

function PreviewCard({ data }) {
  const fields = data.filter((r) => r.key.trim() || r.value.trim())
  const title = (() => {
    const f = fields.find((r) => /^(sarlavha|title|nomi|nom)$/i.test(r.key.trim()))
    return f ? f.value : "Ma'lumotlar"
  })()
  const phoneRow = fields.find((r) => /^(telefon|tel|phone|mobil|mob)$/i.test(r.key.trim()))

  // Group adjacent short-value pairs into 2-col rows
  const groups = []
  let i = 0
  while (i < fields.length) {
    const curr = fields[i]
    const next = fields[i + 1]
    if (next && curr.value.length <= 18 && next.value.length <= 18) {
      groups.push({ type: 'pair', items: [curr, next] })
      i += 2
    } else {
      groups.push({ type: 'single', items: [curr] })
      i++
    }
  }

  return (
    <div className="pv-page">
      <div className="pv-wrap">
        <h1 className="pv-title">{title}</h1>
        <div className="pv-card">
          <h2 className="pv-card-title">{title}</h2>
          <div className="pv-fields">
            {groups.map((g, gi) =>
              g.type === 'pair' ? (
                <div key={gi} className="pv-row-2">
                  {g.items.map((f, fi) => (
                    <div key={fi} className="pv-field">
                      <span className="pv-label">{f.key}</span>
                      <span className="pv-value">{f.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div key={gi} className="pv-field">
                  <span className="pv-label">{g.items[0].key}</span>
                  <span className="pv-value">{g.items[0].value}</span>
                </div>
              )
            )}
          </div>
          <div className="pv-verified">
            <strong>&#10003; Tasdiqlangan</strong>
            <p>Bu ma'lumotlar rasmiy ro'yxatga olingan va tasdiqlangan.</p>
          </div>
          {phoneRow && (
            <a
              href={`tel:${phoneRow.value.replace(/\s+/g, '')}`}
              className="pv-phone"
            >
              &#128222; {phoneRow.value}
            </a>
          )}
        </div>
        <p className="pv-footer">&#169; 2025 | Barcha huquqlar himoyalangan</p>
      </div>
    </div>
  )
}

export default function App() {
  const [rows, setRows] = useState([{ key: '', value: '' }])
  const [mode, setMode] = useState('qr')
  const [size, setSize] = useState(260)
  const [qrUrl, setQrUrl] = useState('')
  const [barcodeSvg, setBarcodeSvg] = useState('')
  const [error, setError] = useState('')
  const [showLabel, setShowLabel] = useState(false)
  const [barcodeLabel, setBarcodeLabel] = useState('')
  const [cardMode, setCardMode] = useState(true)
  const [viewData, setViewData] = useState(null)

  // Check URL for preview data on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const d = params.get('d')
    if (d) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(d)))
        setViewData(decoded)
      } catch {}
    }
  }, [])

  const text = useMemo(() => {
    return rows
      .filter((r) => r.key.trim() || r.value.trim())
      .map((r) => `${r.key}: ${r.value}`)
      .join('\n')
      .slice(0, MAX_LENGTH)
  }, [rows])

  const countText = useMemo(() => {
    return `${text.length}/${MAX_LENGTH}`
  }, [text])

  const urlQrText = useMemo(() => {
    const filtered = rows.filter((r) => r.key.trim() || r.value.trim())
    if (!filtered.length) return ''
    try {
      const base = 'https://www.imhtrade.uz'
      const encoded = btoa(encodeURIComponent(JSON.stringify(filtered)))
      return `${base}?d=${encoded}`
    } catch {
      return ''
    }
  }, [rows])

  const autoResize = (el) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  useEffect(() => {
    document.querySelectorAll('.row-input').forEach(autoResize)
  }, [rows])

  const updateRow = (index, field, val) => {
    const next = rows.map((r, i) => (i === index ? { ...r, [field]: val } : r))
    setRows(next)
  }

  const addRow = () => setRows((prev) => [...prev, { key: '', value: '' }])
  const removeRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index))

  useEffect(() => {
    let cancelled = false
    setError('')

    const effectiveText = mode === 'qr' && cardMode ? urlQrText : text

    if (!effectiveText.trim()) {
      setQrUrl('')
      setBarcodeSvg('')
      return
    }

    const nextSize = Math.min(800, Math.max(140, Number(size) || 260))
    if (nextSize !== size) setSize(nextSize)

    if (mode === 'qr') {
      QRCode.toDataURL(effectiveText, {
        width: nextSize,
        margin: 1,
        errorCorrectionLevel: cardMode ? 'M' : 'H',
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
  }, [text, urlQrText, mode, size, showLabel, barcodeLabel, cardMode])

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

  const handleShare = async () => {
    if (!isReady) return
    try {
      const blob = dataUrlToBlob(downloadUrl)
      const file = new File([blob], fileName, { type: blob.type })
      await navigator.share({ files: [file] })
    } catch {}
  }

  // Show preview card when URL has ?d= param
  if (viewData) {
    return <PreviewCard data={viewData} />
  }

  return (
    <div className="page">
      <DotPattern
        width={24}
        height={24}
        cr={1}
        className="dot-pattern"
        style={{ color: 'rgba(0, 0, 0, 0.08)' }}
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
              <label>Ma'lumotlar</label>
              <span className="counter">{countText}</span>
            </div>

            <div className="rows-list">
              {rows.map((row, i) => (
                <div key={i} className="row-item">
                  <textarea
                    className="row-input"
                    placeholder="F.I.SH"
                    value={row.key}
                    rows={1}
                    onChange={(e) => updateRow(i, 'key', e.target.value)}
                  />
                  <textarea
                    className="row-input"
                    placeholder="Aliyev Vali"
                    value={row.value}
                    rows={1}
                    onChange={(e) => updateRow(i, 'value', e.target.value)}
                  />
                  {rows.length > 1 && (
                    <button
                      type="button"
                      className="row-remove"
                      onClick={() => removeRow(i)}
                      title="O'chirish"
                    >
                      &#215;
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button type="button" className="btn-add-row" onClick={addRow}>
              + Qator qo'shish
            </button>

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

            {mode === 'qr' && (
              <div className="card-mode-row">
                <div className="card-mode-info">
                  <span className="card-mode-label">Karta sifatida ko'rsatish</span>
                  <span className="card-mode-hint">Scan qilinganda chiroyli karta ochiladi</span>
                </div>
                <button
                  type="button"
                  className={`toggle ${cardMode ? 'on' : ''}`}
                  onClick={() => setCardMode(!cardMode)}
                  aria-pressed={cardMode}
                >
                  <span className="toggle-knob" />
                </button>
              </div>
            )}

            <div className="actions">
              <button type="button" className="btn-primary" onClick={handleDownload} disabled={!isReady}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Yuklab olish
              </button>
              <button type="button" className="btn-ghost" onClick={() => setRows([{ key: '', value: '' }])}>
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

            {isReady && typeof navigator.share === 'function' && (
              <div className="share-row">
                <span className="share-label">Ulashish</span>
                <button
                  type="button"
                  className="share-btn native"
                  onClick={handleShare}
                  title="Ulashish"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
