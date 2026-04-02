'use client'

import { useState } from 'react'
import { RESEARCH_QUERIES } from '@/lib/types'

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

interface Source {
  id: string
  label: string
  desc: string
  available: boolean
  count?: number // number of sub-calls (web search only)
}

const ALL_SOURCES: Source[] = [
  { id: 'dcn',          label: 'Daily Commercial News',   desc: 'RSS feed — tender notices',           available: true },
  { id: 'onsite',       label: 'On-Site Magazine',         desc: 'RSS feed — project news',             available: true },
  { id: 'canarchitect', label: 'Canadian Architect',       desc: 'Projects page — direct fetch',        available: true },
  { id: 'websearch',    label: 'Web Search',               desc: `${RESEARCH_QUERIES.length} targeted queries`, available: true, count: RESEARCH_QUERIES.length },
]

export default function ResearchPanel({ onComplete }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(ALL_SOURCES.filter(s => s.available).map(s => s.id))
  )
  const [running, setRunning]   = useState(false)
  const [results, setResults]   = useState<Record<string, SourceResult[]>>({})
  const [done, setDone]         = useState(false)
  const [totalAdded, setTotalAdded] = useState(0)

  const toggleSource = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll  = () => setSelected(new Set(ALL_SOURCES.filter(s => s.available).map(s => s.id)))
  const selectNone = () => setSelected(new Set())

  const setRow = (sourceId: string, idx: number, patch: Partial<SourceResult>) => {
    setResults(prev => {
      const rows = [...(prev[sourceId] ?? [])]
      rows[idx] = { ...rows[idx], ...patch }
      return { ...prev, [sourceId]: rows }
    })
  }

  const callSource = async (sourceId: string, batchIndex?: number) => {
    const res = await fetch('/api/research-source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: sourceId, batchIndex }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Unknown error')
    return data as { added: number; found: number }
  }

  const runResearch = async () => {
    if (!selected.size) return
    setRunning(true)
    setDone(false)
    setTotalAdded(0)

    // Initialise result rows for each selected source
    const init: Record<string, SourceResult[]> = {}
    for (const src of ALL_SOURCES.filter(s => selected.has(s.id))) {
      if (src.id === 'websearch') {
        init.websearch = RESEARCH_QUERIES.map((q, i) => ({
          label: `Query ${i + 1}: ${q.slice(0, 55)}${q.length > 55 ? '...' : ''}`,
          status: 'pending', added: 0, found: 0,
        }))
      } else {
        init[src.id] = [{ label: src.label, status: 'pending', added: 0, found: 0 }]
      }
    }
    setResults(init)

    let grand = 0

    // ── Non-search sources first (fast) ────────────────────────────────────
    for (const srcId of ['dcn', 'onsite', 'canarchitect']) {
      if (!selected.has(srcId)) continue
      setRow(srcId, 0, { status: 'running' })
      try {
        const r = await callSource(srcId)
        grand += r.added
        setRow(srcId, 0, { status: 'done', added: r.added, found: r.found })
      } catch (e) {
        setRow(srcId, 0, { status: 'error', error: e instanceof Error ? e.message : String(e) })
      }
    }

    // ── Web searches one at a time ──────────────────────────────────────────
    if (selected.has('websearch')) {
      for (let i = 0; i < RESEARCH_QUERIES.length; i++) {
        setRow('websearch', i, { status: 'running' })
        try {
          const r = await callSource('websearch', i)
          grand += r.added
          setRow('websearch', i, { status: 'done', added: r.added, found: r.found })
        } catch (e) {
          setRow('websearch', i, { status: 'error', error: e instanceof Error ? e.message : String(e) })
        }
      }
    }

    setTotalAdded(grand)
    setRunning(false)
    setDone(true)
    onComplete()
  }

  const reset = () => {
    setResults({})
    setDone(false)
    setTotalAdded(0)
  }

  const totalRows = Object.values(results).flat()
  const doneRows  = totalRows.filter(r => r.status === 'done' || r.status === 'error')

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Research sources</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          Select which sources to scan. Each runs as a separate call to stay within server time limits.
        </div>
      </div>

      {/* Source selector */}
      {!running && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Sources
            </div>
            <button onClick={selectAll} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              Select all
            </button>
            <span style={{ fontSize: 11, color: 'var(--border2)' }}>·</span>
            <button onClick={selectNone} style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              None
            </button>
          </div>

          {ALL_SOURCES.map(src => (
            <div
              key={src.id}
              onClick={() => src.available && toggleSource(src.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 8,
                border: `1px solid ${selected.has(src.id) ? 'rgba(59,130,246,0.35)' : 'var(--border)'}`,
                background: selected.has(src.id) ? 'var(--accent-dim)' : 'var(--surface2)',
                cursor: src.available ? 'pointer' : 'default',
                opacity: src.available ? 1 : 0.4,
                transition: 'all 0.15s',
              }}
            >
              {/* Checkbox */}
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

              {/* Available dot */}
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: src.available ? 'var(--green)' : 'var(--muted)', flexShrink: 0 }} />
            </div>
          ))}

          {/* Unavailable note */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 14px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface2)', opacity: 0.45,
          }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid var(--border2)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>ConstructConnect Insight</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Login-gated — use the Add Data tab to paste content manually</div>
            </div>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--muted)', flexShrink: 0, marginTop: 3 }} />
          </div>
        </div>
      )}

      {/* Run button */}
      {!running && !done && (
        <div>
          <button
            onClick={runResearch}
            disabled={!selected.size}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
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
        </div>
      )}

      {/* Live progress */}
      {(running || done) && Object.keys(results).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Overall progress bar */}
          {running && totalRows.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                <span>Progress</span>
                <span>{doneRows.length} / {totalRows.length}</span>
              </div>
              <div style={{ height: 4, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2, background: 'var(--accent)',
                  width: `${totalRows.length ? (doneRows.length / totalRows.length) * 100 : 0}%`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          )}

          {/* Per-source rows */}
          {ALL_SOURCES.filter(s => results[s.id]).map(src => (
            <div key={src.id}>
              {src.id !== 'websearch' ? (
                results[src.id]?.map((row, i) => <ProgressRow key={i} item={row} />)
              ) : (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                    Web searches ({results.websearch?.filter(r => r.status === 'done').length ?? 0} / {RESEARCH_QUERIES.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {results.websearch?.map((row, i) => <ProgressRow key={i} item={row} compact />)}
                  </div>
                </div>
              )}
            </div>
          ))}
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
                : 'No new projects found — results matched existing entries or sources returned nothing.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={reset} style={{
              padding: '7px 16px', borderRadius: 7,
              border: '1px solid var(--border2)',
              background: 'var(--surface)', color: 'var(--text)', fontSize: 13,
            }}>
              Run again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProgressRow({ item, compact }: { item: SourceResult; compact?: boolean }) {
  const statusIcon = () => {
    if (item.status === 'running') return (
      <span style={{
        width: 12, height: 12, border: '2px solid var(--accent-dim)',
        borderTopColor: 'var(--accent)', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0,
      }} />
    )
    if (item.status === 'done') return (
      <svg width="12" height="12" fill="none" stroke="var(--green)" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    )
    if (item.status === 'error') return (
      <svg width="12" height="12" fill="none" stroke="var(--red)" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    )
    return <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--surface3)', flexShrink: 0, display: 'inline-block' }} />
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: compact ? '5px 10px' : '9px 12px',
      background: 'var(--surface2)', borderRadius: 7,
      border: `1px solid ${
        item.status === 'running' ? 'rgba(59,130,246,0.25)' :
        item.status === 'error'   ? 'rgba(239,68,68,0.2)'  :
        item.status === 'done' && item.added > 0 ? 'rgba(34,197,94,0.2)' :
        'var(--border)'
      }`,
      opacity: item.status === 'pending' ? 0.4 : 1,
      transition: 'all 0.2s',
    }}>
      {statusIcon()}
      <span style={{ flex: 1, fontSize: compact ? 11 : 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.label}
      </span>
      {item.status === 'running' && (
        <span style={{ fontSize: 11, color: 'var(--accent)', whiteSpace: 'nowrap' }}>scanning...</span>
      )}
      {item.status === 'done' && (
        <span style={{ fontSize: 11, color: item.added > 0 ? 'var(--green)' : 'var(--muted)', fontWeight: item.added > 0 ? 600 : 400, whiteSpace: 'nowrap' }}>
          {item.added > 0 ? `+${item.added} new` : `${item.found} found, 0 new`}
        </span>
      )}
      {item.status === 'error' && (
        <span style={{ fontSize: 11, color: 'var(--red)', whiteSpace: 'nowrap' }}>failed</span>
      )}
    </div>
  )
}
