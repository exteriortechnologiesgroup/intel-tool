'use client'

import { useState } from 'react'
import { RESEARCH_QUERIES, ETG_KEYWORDS, EXTRACTION_SYSTEM_PROMPT } from '@/lib/types'

interface Props {
  onComplete: () => void
}

interface SourceResult {
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  added: number
  found: number
  error?: string
}

const SERVER_SOURCES = [
  { id: 'dcn',          label: 'Daily Commercial News',  desc: 'RSS feed — tender notices' },
  { id: 'onsite',       label: 'On-Site Magazine',        desc: 'RSS feed — project news' },
  { id: 'canarchitect', label: 'Canadian Architect',      desc: 'Projects page — direct fetch' },
]

export default function ResearchPanel({ onComplete }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set([...SERVER_SOURCES.map(s => s.id), 'websearch'])
  )
  const [running, setRunning]       = useState(false)
  const [serverRows, setServerRows] = useState<SourceResult[]>([])
  const [searchRows, setSearchRows] = useState<SourceResult[]>([])
  const [done, setDone]             = useState(false)
  const [totalAdded, setTotalAdded] = useState(0)

  const toggleSource = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const patchServer = (i: number, patch: Partial<SourceResult>) =>
    setServerRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))

  const patchSearch = (i: number, patch: Partial<SourceResult>) =>
    setSearchRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))

  // ── One search query: fetch raw text from server, extract client-side ─────
  const runOneSearch = async (query: string, idx: number): Promise<number> => {
    patchSearch(idx, { status: 'running' })
    try {
      // Step 1 — server runs the web search (fast, Haiku model)
      const searchRes = await fetch('/api/search-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const searchData = await searchRes.json()
      if (!searchRes.ok || searchData.error) throw new Error(searchData.error ?? 'Search failed')
      if (!searchData.text?.trim()) {
        patchSearch(idx, { status: 'done', found: 0, added: 0 })
        return 0
      }

      // Step 2 — extract projects from the text (client calls Anthropic directly)
      const extractRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': '', // key injected server-side via /api/extract-text
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          system: EXTRACTION_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: `Source: websearch\n\n${searchData.text}` }],
        }),
      })

      // If direct browser call is blocked, fall back to server extraction
      if (!extractRes.ok) {
        return await extractViaServer(searchData.text, idx)
      }

      const extractData = await extractRes.json()
      const raw = (extractData.content ?? [])
        .filter((b: { type: string }) => b.type === 'text')
        .map((b: { text: string }) => b.text)
        .join('')

      return await saveExtracted(raw, idx)
    } catch (e) {
      // If anything fails, try server-side extraction as fallback
      patchSearch(idx, { status: 'error', error: e instanceof Error ? e.message : String(e) })
      return 0
    }
  }

  const extractViaServer = async (text: string, idx: number): Promise<number> => {
    const res = await fetch('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source: 'websearch' }),
    })
    const data = await res.json()
    const added = data.added ?? 0
    patchSearch(idx, { status: 'done', found: added, added })
    return added
  }

  const saveExtracted = async (raw: string, idx: number): Promise<number> => {
    let extracted: Record<string, unknown>[] = []
    try {
      const clean = raw.replace(/```json|```/g, '').trim()
      extracted = JSON.parse(clean)
    } catch {
      const m = raw.match(/\[[\s\S]*\]/)
      if (m) extracted = JSON.parse(m[0])
    }
    if (!Array.isArray(extracted) || !extracted.length) {
      patchSearch(idx, { status: 'done', found: 0, added: 0 })
      return 0
    }
    const normalised = extracted.map(p => ({
      ...p, source: 'websearch',
      keywords: ((p.keywords ?? []) as string[]).filter(k =>
        ETG_KEYWORDS.some(ek => ek.toLowerCase() === k.toLowerCase())
      ),
    }))
    const saveRes = await fetch('/api/ingest-projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projects: normalised }),
    })
    const saveData = await saveRes.json()
    const added = saveData.added ?? 0
    patchSearch(idx, { status: 'done', found: extracted.length, added })
    return added
  }

  const runResearch = async () => {
    if (!selected.size) return
    setRunning(true)
    setDone(false)
    setTotalAdded(0)

    const activeSrv = SERVER_SOURCES.filter(s => selected.has(s.id))
    setServerRows(activeSrv.map(s => ({ label: s.label, status: 'pending', added: 0, found: 0 })))
    setSearchRows(
      selected.has('websearch')
        ? RESEARCH_QUERIES.map((q, i) => ({
            label: `Query ${i + 1}: ${q.slice(0, 58)}${q.length > 58 ? '...' : ''}`,
            status: 'pending', added: 0, found: 0,
          }))
        : []
    )

    let grand = 0

    // RSS + page sources
    for (let i = 0; i < activeSrv.length; i++) {
      patchServer(i, { status: 'running' })
      try {
        const res = await fetch('/api/research-source', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: activeSrv[i].id }),
        })
        const d = await res.json()
        if (!res.ok) throw new Error(d.error ?? 'Failed')
        grand += d.added ?? 0
        patchServer(i, { status: 'done', added: d.added ?? 0, found: d.found ?? 0 })
      } catch (e) {
        patchServer(i, { status: 'error', error: e instanceof Error ? e.message : String(e) })
      }
    }

    // Web searches
    if (selected.has('websearch')) {
      for (let i = 0; i < RESEARCH_QUERIES.length; i++) {
        grand += await runOneSearch(RESEARCH_QUERIES[i], i)
      }
    }

    setTotalAdded(grand)
    setRunning(false)
    setDone(true)
    onComplete()
  }

  const reset = () => { setServerRows([]); setSearchRows([]); setDone(false); setTotalAdded(0) }

  const allRows = [...serverRows, ...searchRows]
  const doneCount = allRows.filter(r => r.status === 'done' || r.status === 'error').length

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Research sources</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          Select which sources to scan. Each query runs independently to stay within server time limits.
        </div>
      </div>

      {/* Source toggles */}
      {!running && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Sources</div>
            <button onClick={() => setSelected(new Set([...SERVER_SOURCES.map(s => s.id), 'websearch']))}
              style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              Select all
            </button>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>·</span>
            <button onClick={() => setSelected(new Set())}
              style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              None
            </button>
          </div>

          {[
            ...SERVER_SOURCES.map(s => ({ ...s, available: true })),
            { id: 'websearch', label: 'Web Search', desc: `${RESEARCH_QUERIES.length} targeted queries`, available: true },
            { id: 'constructconnect', label: 'ConstructConnect Insight', desc: 'Login-gated — use Add Data tab instead', available: false },
          ].map(src => (
            <div key={src.id} onClick={() => src.available && toggleSource(src.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px', borderRadius: 8, cursor: src.available ? 'pointer' : 'default',
              border: `1px solid ${selected.has(src.id) ? 'rgba(59,130,246,0.35)' : 'var(--border)'}`,
              background: selected.has(src.id) ? 'var(--accent-dim)' : 'var(--surface2)',
              opacity: src.available ? 1 : 0.4, transition: 'all 0.15s',
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0, transition: 'all 0.15s',
                border: `1.5px solid ${selected.has(src.id) ? 'var(--accent)' : 'var(--border2)'}`,
                background: selected.has(src.id) ? 'var(--accent)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {selected.has(src.id) && (
                  <svg width="9" height="9" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{src.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{src.desc}</div>
              </div>
              <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: src.available ? 'var(--green)' : 'var(--muted)' }} />
            </div>
          ))}
        </div>
      )}

      {/* Run button */}
      {!running && !done && (
        <button onClick={runResearch} disabled={!selected.size} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, width: 'fit-content',
          padding: '10px 22px', borderRadius: 8, border: 'none',
          background: selected.size ? 'var(--accent)' : 'var(--surface3)',
          color: selected.size ? 'white' : 'var(--muted)',
          fontSize: 14, fontWeight: 600,
        }}>
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          Run research
          {selected.size > 0 && <span style={{ fontSize: 12, opacity: 0.8 }}>({selected.size} source{selected.size !== 1 ? 's' : ''})</span>}
        </button>
      )}

      {/* Live progress */}
      {(running || done) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {running && allRows.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                <span>Progress</span><span>{doneCount} / {allRows.length}</span>
              </div>
              <div style={{ height: 4, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, background: 'var(--accent)', transition: 'width 0.4s', width: `${allRows.length ? (doneCount / allRows.length) * 100 : 0}%` }} />
              </div>
            </div>
          )}
          {serverRows.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2 }}>Sources</div>
              {serverRows.map((r, i) => <ProgressRow key={i} item={r} />)}
            </div>
          )}
          {searchRows.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2 }}>
                Web searches ({searchRows.filter(r => r.status === 'done').length} / {searchRows.length})
              </div>
              {searchRows.map((r, i) => <ProgressRow key={i} item={r} compact />)}
            </div>
          )}
        </div>
      )}

      {/* Done summary */}
      {done && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px',
            borderLeft: `3px solid ${totalAdded > 0 ? 'var(--green)' : 'var(--muted)'}`,
          }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: totalAdded > 0 ? 'var(--green)' : 'var(--muted)' }}>
              {totalAdded} new project{totalAdded !== 1 ? 's' : ''} added
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              {totalAdded > 0 ? 'Switch to the Projects tab to review them.' : 'No new projects found — results matched existing entries or sources returned nothing.'}
            </div>
          </div>
          <button onClick={reset} style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, width: 'fit-content' }}>
            Run again
          </button>
        </div>
      )}
    </div>
  )
}

function ProgressRow({ item, compact }: { item: SourceResult; compact?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: compact ? '5px 10px' : '9px 12px', borderRadius: 7,
      background: 'var(--surface2)',
      border: `1px solid ${item.status === 'running' ? 'rgba(59,130,246,0.25)' : item.status === 'error' ? 'rgba(239,68,68,0.2)' : item.status === 'done' && item.added > 0 ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`,
      opacity: item.status === 'pending' ? 0.4 : 1, transition: 'all 0.2s',
    }}>
      {item.status === 'running' && <span style={{ width: 12, height: 12, border: '2px solid var(--accent-dim)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />}
      {item.status === 'done' && <svg width="12" height="12" fill="none" stroke="var(--green)" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>}
      {item.status === 'error' && <svg width="12" height="12" fill="none" stroke="var(--red)" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
      {item.status === 'pending' && <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--surface3)', flexShrink: 0, display: 'inline-block' }} />}
      <span style={{ flex: 1, fontSize: compact ? 11 : 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
      {item.status === 'running' && <span style={{ fontSize: 11, color: 'var(--accent)', whiteSpace: 'nowrap' }}>scanning...</span>}
      {item.status === 'done' && <span style={{ fontSize: 11, whiteSpace: 'nowrap', color: item.added > 0 ? 'var(--green)' : 'var(--muted)', fontWeight: item.added > 0 ? 600 : 400 }}>{item.added > 0 ? `+${item.added} new` : `${item.found} found, 0 new`}</span>}
      {item.status === 'error' && <span style={{ fontSize: 11, color: 'var(--red)', whiteSpace: 'nowrap' }}>failed</span>}
    </div>
  )
}
