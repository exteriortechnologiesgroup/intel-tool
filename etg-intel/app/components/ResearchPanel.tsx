'use client'

import { useState } from 'react'

interface Props {
  onComplete: () => void
}

interface RowState {
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  added: number
  error?: string
}

const SERVER_SOURCES = [
  { id: 'dcn',          label: 'Daily Commercial News',  desc: 'RSS feed' },
  { id: 'onsite',       label: 'On-Site Magazine',        desc: 'RSS feed' },
  { id: 'canarchitect', label: 'Canadian Architect',      desc: 'Projects page' },
]

const SEARCH_QUERIES = [
  'hospital construction tender Canada 2026 $20 million OR $30 million OR $50 million architect',
  'school addition construction Canada 2026 tender bid general contractor architect',
  'medical centre new building Canada 2026 tender construction value',
  'healthcare facility construction tender Canada 2026 aluminium cladding OR ACM OR Alucobond',
  'university college building construction Canada 2026 tender bid',
  'hospital renovation expansion Canada 2026 architect contractor',
  'school construction project Canada 2026 design build stipulated price',
  'medical office building Canada 2026 construction tender architect',
]

export default function ResearchPanel({ onComplete }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set([...SERVER_SOURCES.map(s => s.id), 'websearch'])
  )
  const [running, setRunning]       = useState(false)
  const [serverRows, setServerRows] = useState<RowState[]>([])
  const [searchRows, setSearchRows] = useState<RowState[]>([])
  const [done, setDone]             = useState(false)
  const [totalAdded, setTotalAdded] = useState(0)

  const toggleSource = (id: string) =>
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const patchServer = (i: number, patch: Partial<RowState>) =>
    setServerRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))

  const patchSearch = (i: number, patch: Partial<RowState>) =>
    setSearchRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))

  // Step 1: search → get raw text back from server
  // Step 2: send raw text to /api/ingest → Claude extracts + saves
  const runOneSearch = async (query: string, idx: number): Promise<number> => {
    patchSearch(idx, { status: 'running' })
    try {
      // Step 1 — web search (fast, just returns text)
      const searchRes = await fetch('/api/search-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const searchData = await searchRes.json()
      if (!searchRes.ok || searchData.error) throw new Error(searchData.error ?? `Search failed: ${searchRes.status}`)
      if (!searchData.text?.trim()) {
        patchSearch(idx, { status: 'done', added: 0 })
        return 0
      }

      // Step 2 — extract + save via existing ingest route
      const ingestRes = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: searchData.text, source: 'websearch' }),
      })
      const ingestData = await ingestRes.json()
      if (ingestData.error) throw new Error(ingestData.error)

      const added = ingestData.added ?? 0
      patchSearch(idx, { status: 'done', added })
      return added
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      patchSearch(idx, { status: 'error', error: msg })
      return 0
    }
  }

  const runResearch = async () => {
    if (!selected.size) return
    setRunning(true)
    setDone(false)
    setTotalAdded(0)

    const activeSrv = SERVER_SOURCES.filter(s => selected.has(s.id))
    setServerRows(activeSrv.map(s => ({ label: s.label, status: 'pending', added: 0 })))
    setSearchRows(
      selected.has('websearch')
        ? SEARCH_QUERIES.map((q, i) => ({
            label: `Query ${i + 1}: ${q.slice(0, 60)}${q.length > 60 ? '...' : ''}`,
            status: 'pending', added: 0,
          }))
        : []
    )

    let grand = 0

    // RSS + page sources via server
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
        patchServer(i, { status: 'done', added: d.added ?? 0 })
      } catch (e) {
        patchServer(i, { status: 'error', error: e instanceof Error ? e.message : String(e) })
      }
    }

    // Web searches — sequential, each is two fast calls
    if (selected.has('websearch')) {
      for (let i = 0; i < SEARCH_QUERIES.length; i++) {
        grand += await runOneSearch(SEARCH_QUERIES[i], i)
      }
    }

    setTotalAdded(grand)
    setRunning(false)
    setDone(true)
    onComplete()
  }

  const reset = () => {
    setServerRows([])
    setSearchRows([])
    setDone(false)
    setTotalAdded(0)
  }

  const allRows = [...serverRows, ...searchRows]
  const doneCount = allRows.filter(r => r.status === 'done' || r.status === 'error').length

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Research sources</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          Searches the web for medical and school construction projects in Canada, plus polls RSS feeds from DCN, On-Site, and Canadian Architect.
        </div>
      </div>

      {/* Source toggles */}
      {!running && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Sources
            </div>
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
            { id: 'websearch', label: 'Web Search', desc: `${SEARCH_QUERIES.length} targeted keyword searches`, available: true },
            { id: 'constructconnect', label: 'ConstructConnect Insight', desc: 'Use Add Data tab to paste manually', available: false },
          ].map(src => (
            <div
              key={src.id}
              onClick={() => src.available && toggleSource(src.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 8,
                cursor: src.available ? 'pointer' : 'default',
                border: `1px solid ${selected.has(src.id) ? 'rgba(59,130,246,0.35)' : 'var(--border)'}`,
                background: selected.has(src.id) ? 'var(--accent-dim)' : 'var(--surface2)',
                opacity: src.available ? 1 : 0.4,
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                border: `1.5px solid ${selected.has(src.id) ? 'var(--accent)' : 'var(--border2)'}`,
                background: selected.has(src.id) ? 'var(--accent)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
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
              <span style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: src.available ? 'var(--green)' : 'var(--muted)',
              }} />
            </div>
          ))}
        </div>
      )}

      {/* Run button */}
      {!running && !done && (
        <button
          onClick={runResearch}
          disabled={!selected.size}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, width: 'fit-content',
            padding: '10px 22px', borderRadius: 8, border: 'none',
            background: selected.size ? 'var(--accent)' : 'var(--surface3)',
            color: selected.size ? 'white' : 'var(--muted)',
            fontSize: 14, fontWeight: 600, transition: 'all 0.15s',
          }}
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          Run research
          {selected.size > 0 && (
            <span style={{ fontSize: 12, opacity: 0.8 }}>
              ({selected.size} source{selected.size !== 1 ? 's' : ''})
            </span>
          )}
        </button>
      )}

      {/* Live progress */}
      {(running || done) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {running && allRows.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                <span>Progress</span>
                <span>{doneCount} / {allRows.length}</span>
              </div>
              <div style={{ height: 4, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2, background: 'var(--accent)',
                  transition: 'width 0.4s',
                  width: `${allRows.length ? Math.round((doneCount / allRows.length) * 100) : 0}%`,
                }} />
              </div>
            </div>
          )}

          {serverRows.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2 }}>
                Sources
              </div>
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
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '18px 20px',
            borderLeft: `3px solid ${totalAdded > 0 ? 'var(--green)' : 'var(--muted)'}`,
          }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: totalAdded > 0 ? 'var(--green)' : 'var(--muted)' }}>
              {totalAdded} new project{totalAdded !== 1 ? 's' : ''} added
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              {totalAdded > 0
                ? 'Switch to the Projects tab to review them.'
                : 'No new projects found. Try the Add Data tab to paste content manually.'}
            </div>
          </div>
          <button
            onClick={reset}
            style={{
              padding: '7px 16px', borderRadius: 7, width: 'fit-content',
              border: '1px solid var(--border2)',
              background: 'var(--surface)', color: 'var(--text)', fontSize: 13,
            }}
          >
            Run again
          </button>
        </div>
      )}
    </div>
  )
}

function ProgressRow({ item, compact }: { item: RowState; compact?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: compact ? '5px 10px' : '9px 12px', borderRadius: 7,
      background: 'var(--surface2)',
      border: `1px solid ${
        item.status === 'running' ? 'rgba(59,130,246,0.25)' :
        item.status === 'error'   ? 'rgba(239,68,68,0.2)'   :
        item.status === 'done' && item.added > 0 ? 'rgba(34,197,94,0.2)' :
        'var(--border)'
      }`,
      opacity: item.status === 'pending' ? 0.4 : 1,
      transition: 'all 0.2s',
    }}>
      {item.status === 'pending' && (
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--surface3)', flexShrink: 0, display: 'inline-block' }} />
      )}
      {item.status === 'running' && (
        <span style={{ width: 12, height: 12, border: '2px solid var(--accent-dim)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
      )}
      {item.status === 'done' && (
        <svg width="12" height="12" fill="none" stroke="var(--green)" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
      {item.status === 'error' && (
        <svg width="12" height="12" fill="none" stroke="var(--red)" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      )}

      <span style={{ flex: 1, fontSize: compact ? 11 : 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.label}
      </span>

      {item.status === 'running' && (
        <span style={{ fontSize: 11, color: 'var(--accent)', whiteSpace: 'nowrap' }}>scanning...</span>
      )}
      {item.status === 'done' && (
        <span style={{ fontSize: 11, whiteSpace: 'nowrap', fontWeight: item.added > 0 ? 600 : 400, color: item.added > 0 ? 'var(--green)' : 'var(--muted)' }}>
          {item.added > 0 ? `+${item.added} new` : 'no new projects'}
        </span>
      )}
      {item.status === 'error' && (
        <span style={{ fontSize: 11, color: 'var(--red)', whiteSpace: 'nowrap' }} title={item.error}>failed</span>
      )}
    </div>
  )
}
