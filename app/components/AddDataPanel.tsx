'use client'

import { useState, useRef } from 'react'

interface Props {
  onComplete: (added: number) => void
}

const SOURCES = [
  { value: 'constructconnect', label: 'ConstructConnect Insight' },
  { value: 'dcn', label: 'Daily Commercial News' },
  { value: 'onsite', label: 'On-Site Magazine' },
  { value: 'canarchitect', label: 'Canadian Architect' },
  { value: 'other', label: 'Other' },
]

interface QueuedFile { file: File; name: string; size: number; type: 'pdf' | 'csv' | 'txt' }

export default function AddDataPanel({ onComplete }: Props) {
  const [pasteText, setPasteText] = useState('')
  const [source, setSource] = useState('constructconnect')
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [processing, setProcessing] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const [totalAdded, setTotalAdded] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = (files: File[]) => {
    const valid = files.filter(f =>
      f.name.endsWith('.pdf') || f.name.endsWith('.csv') || f.name.endsWith('.txt')
    )
    setQueue(prev => {
      const names = new Set(prev.map(f => f.name))
      const newItems: QueuedFile[] = valid
        .filter(f => !names.has(f.name))
        .map(f => ({
          file: f, name: f.name, size: f.size,
          type: f.name.endsWith('.pdf') ? 'pdf' : f.name.endsWith('.csv') ? 'csv' : 'txt',
        }))
      return [...prev, ...newItems]
    })
  }

  const extractText = async (qf: QueuedFile): Promise<string> => {
    if (qf.type === 'txt') return qf.file.text()

    if (qf.type === 'csv') {
      const text = await qf.file.text()
      // Parse CSV rows into readable text lines
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      return lines.join('\n')
    }

    // PDF: send as base64 to Claude via a lightweight extraction endpoint
    const buf = await qf.file.arrayBuffer()
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
    const res = await fetch('/api/extract-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ b64, name: qf.name }),
    })
    const data = await res.json()
    return data.text ?? ''
  }

  const processAll = async () => {
    const chunks: { text: string; source: string; sourceUrl?: string }[] = []

    if (pasteText.trim()) chunks.push({ text: pasteText, source })
    for (const qf of queue) {
      const text = await extractText(qf)
      if (text.trim()) chunks.push({ text, source: qf.type === 'csv' ? 'constructconnect' : source })
    }

    if (!chunks.length) return

    setProcessing(true)
    setTotalAdded(null)
    let added = 0

    for (let i = 0; i < chunks.length; i++) {
      setProgress(Math.round((i / chunks.length) * 100))
      setStatusMsg(`Processing ${i + 1} of ${chunks.length}...`)

      try {
        const res = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunks[i]),
        })
        const data = await res.json()
        added += data.added ?? 0
      } catch (e) {
        console.error('Ingest error:', e)
      }
    }

    setProgress(100)
    setStatusMsg(`Done — ${added} project${added !== 1 ? 's' : ''} added.`)
    setTotalAdded(added)
    setPasteText('')
    setQueue([])
    setProcessing(false)
    onComplete(added)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    addFiles(Array.from(e.dataTransfer.files))
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>

      <div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>Add project data</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          Upload PDFs (tender documents, spec sheets), CSVs (ConstructConnect exports), or paste raw text from any source. Claude extracts all project details automatically.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)' }}
        onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)' }}
        onDrop={e => { e.currentTarget.style.borderColor = 'var(--border2)'; handleDrop(e) }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '1.5px dashed var(--border2)', borderRadius: 10,
          padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
          background: 'var(--surface)', transition: 'all 0.2s',
        }}
      >
        <svg width="28" height="28" fill="none" stroke="var(--muted)" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 10px', display: 'block' }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Drop files or click to upload</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Tender notices, spec docs, project listings, ConstructConnect exports</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          {['PDF', 'CSV', 'TXT'].map(t => (
            <span key={t} style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 5,
              background: t === 'PDF' ? 'var(--red-dim)' : t === 'CSV' ? 'var(--green-dim)' : 'var(--accent-dim)',
              color: t === 'PDF' ? 'var(--red)' : t === 'CSV' ? 'var(--green)' : 'var(--accent)',
              border: `1px solid ${t === 'PDF' ? 'rgba(239,68,68,0.2)' : t === 'CSV' ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)'}`,
            }}>{t}</span>
          ))}
        </div>
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.csv,.txt" style={{ display: 'none' }}
          onChange={e => addFiles(Array.from(e.target.files ?? []))} />
      </div>

      {/* File queue */}
      {queue.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {queue.map(qf => (
            <div key={qf.name} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 7, padding: '8px 12px', fontSize: 13,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                background: qf.type === 'pdf' ? 'var(--red-dim)' : qf.type === 'csv' ? 'var(--green-dim)' : 'var(--accent-dim)',
                color: qf.type === 'pdf' ? 'var(--red)' : qf.type === 'csv' ? 'var(--green)' : 'var(--accent)',
              }}>{qf.type.toUpperCase()}</span>
              <span style={{ flex: 1, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{qf.name}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{(qf.size / 1024).toFixed(0)} KB</span>
              <button onClick={() => setQueue(prev => prev.filter(f => f.name !== qf.name))}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--muted)', fontSize: 12 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        or paste text directly
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      {/* Source select */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Source:</label>
        <select value={source} onChange={e => setSource(e.target.value)} style={{
          background: 'var(--surface2)', border: '1px solid var(--border2)',
          borderRadius: 6, padding: '5px 10px', color: 'var(--text)', fontSize: 12, outline: 'none',
        }}>
          {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Paste area */}
      <textarea
        value={pasteText}
        onChange={e => setPasteText(e.target.value)}
        placeholder="Paste project listings, tender notices, or article text..."
        style={{
          background: 'var(--surface2)', border: '1px solid var(--border2)',
          borderRadius: 10, padding: 14, color: 'var(--text)',
          fontSize: 13, lineHeight: 1.7, resize: 'vertical', minHeight: 200,
          width: '100%', outline: 'none',
        }}
      />

      {/* Progress */}
      {processing && (
        <div>
          <div style={{ height: 3, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--accent)' }}>{statusMsg}</div>
        </div>
      )}

      {!processing && statusMsg && (
        <div style={{ fontSize: 13, color: totalAdded ? 'var(--green)' : 'var(--muted)' }}>{statusMsg}</div>
      )}

      {/* Submit */}
      <div>
        <button
          onClick={processAll}
          disabled={processing || (!pasteText.trim() && queue.length === 0)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 20px', borderRadius: 7,
            background: 'var(--accent)', border: 'none', color: 'white',
            fontSize: 14, fontWeight: 600,
            opacity: processing || (!pasteText.trim() && queue.length === 0) ? 0.5 : 1,
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          {processing ? 'Processing...' : 'Extract & add projects'}
        </button>
      </div>

      <div style={{
        background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)',
        borderRadius: 7, padding: '9px 13px', fontSize: 12, color: 'var(--amber)', lineHeight: 1.6,
      }}>
        CSV tip: works best with ConstructConnect exports. Any columns containing project name, value, location, stage, architect, GC, or owner will be mapped automatically.
      </div>
    </div>
  )
}
