'use client'

import { useState } from 'react'
import type { Project } from '@/lib/types'
import { StageBadge, SectorTag, KeywordTag } from './Badges'

interface DigestData {
  projects: Project[]
  summary: string
  weekLabel: string
  empty: boolean
}

const STAGE_ORDER: Record<string, number> = { bidding: 0, tender: 1, planning: 2, awarded: 3 }

export default function DigestPanel() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DigestData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(7)

  const generate = async () => {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await fetch(`/api/digest?days=${days}`, { method: 'POST' })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const printDigest = () => window.print()

  const qualifying = data?.projects.filter(p => !p.below_threshold) ?? []
  const withKeywords = data?.projects.filter(p => p.keywords.length > 0) ?? []
  const sorted = [...qualifying].sort((a, b) => (STAGE_ORDER[a.stage] ?? 9) - (STAGE_ORDER[b.stage] ?? 9))

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Project digest</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            Generates a summary of all projects added in the selected window. No email — reads right here.
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>Period:</label>
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            style={{
              background: 'var(--surface2)', border: '1px solid var(--border2)',
              borderRadius: 6, padding: '5px 10px', color: 'var(--text)', fontSize: 13, outline: 'none',
            }}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={9999}>All time</option>
          </select>
          <button
            onClick={generate}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 18px', borderRadius: 7, border: 'none',
              background: loading ? 'var(--surface2)' : 'var(--accent)',
              color: loading ? 'var(--accent)' : 'white',
              fontSize: 13, fontWeight: 600,
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: 13, height: 13, border: '2px solid rgba(59,130,246,0.3)',
                  borderTopColor: 'var(--accent)', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite', display: 'inline-block',
                }} />
                Generating...
              </>
            ) : 'Generate digest'}
          </button>
          {data && !data.empty && (
            <button
              onClick={printDigest}
              style={{
                padding: '8px 14px', borderRadius: 7,
                border: '1px solid var(--border2)',
                background: 'var(--surface)', color: 'var(--text)', fontSize: 13,
              }}
            >
              Print / Save PDF
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 8, padding: '12px 16px', fontSize: 13, color: 'var(--red)',
        }}>{error}</div>
      )}

      {data?.empty && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '40px 24px', textAlign: 'center',
          color: 'var(--muted)', fontSize: 14,
        }}>
          No projects found in the last {days} days. Try extending the period or running a research pass.
        </div>
      )}

      {data && !data.empty && (
        <div id="digest-output" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Header */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '20px 24px',
            borderLeft: '3px solid var(--accent)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              ETG Project Intelligence
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
              Project Digest
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{data.weekLabel}</div>
          </div>

          {/* Stats bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {[
              { label: 'Total projects', value: data.projects.length, color: 'var(--text)' },
              { label: 'Meet criteria', value: qualifying.length, color: 'var(--green)' },
              { label: 'Keyword matches', value: withKeywords.length, color: 'var(--accent)' },
              { label: 'Medical', value: data.projects.filter(p => p.sector === 'medical').length, color: 'var(--pink)' },
              { label: 'Education', value: data.projects.filter(p => p.sector === 'school').length, color: 'var(--purple)' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '14px 16px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* AI Summary */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '18px 22px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
              Summary
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text)' }}>{data.summary}</div>
          </div>

          {/* Keyword matches */}
          {withKeywords.length > 0 && (
            <div style={{
              background: 'var(--surface)', border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: 10, padding: '18px 22px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 14 }}>
                ETG material mentions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {withKeywords.map(p => <DigestRow key={p.id} project={p} highlight />)}
              </div>
            </div>
          )}

          {/* Qualifying projects */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '18px 22px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>
              Medical &amp; education — $20M+
            </div>
            {sorted.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sorted.map(p => <DigestRow key={p.id} project={p} />)}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>No qualifying projects in this period.</div>
            )}
          </div>

          {/* All projects (below threshold) */}
          {data.projects.filter(p => p.below_threshold).length > 0 && (
            <details style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 22px' }}>
              <summary style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--muted)', cursor: 'pointer', userSelect: 'none',
              }}>
                Other projects ({data.projects.filter(p => p.below_threshold).length} — below threshold or other sector)
              </summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                {data.projects.filter(p => p.below_threshold).map(p => <DigestRow key={p.id} project={p} muted />)}
              </div>
            </details>
          )}

        </div>
      )}

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          header, aside, .tab-group, button { display: none !important; }
          #digest-output { color: black; }
        }
      `}</style>
    </div>
  )
}

function DigestRow({ project: p, highlight, muted }: { project: Project; highlight?: boolean; muted?: boolean }) {
  return (
    <div style={{
      display: 'flex', gap: 16, paddingBottom: 12,
      borderBottom: '1px solid var(--border)',
      opacity: muted ? 0.65 : 1,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{p.name}</span>
          <StageBadge stage={p.stage} />
          <SectorTag sector={p.sector} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: p.description ? 6 : 0 }}>
          {p.location ?? '—'}
          {p.source && <> &nbsp;·&nbsp; {p.source}</>}
          {p.bid_deadline && <> &nbsp;·&nbsp; Bid deadline: <strong style={{ color: 'var(--amber)' }}>{p.bid_deadline}</strong></>}
        </div>
        {p.description && (
          <div style={{ fontSize: 13, color: muted ? 'var(--muted)' : 'var(--text)', lineHeight: 1.6, marginBottom: 6 }}>
            {p.description}
          </div>
        )}
        {highlight && p.keywords.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {p.keywords.map(k => <KeywordTag key={k} label={k} />)}
          </div>
        )}
        {p.contacts.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            {p.contacts.slice(0, 4).map((c, i) => (
              <span key={i} style={{ fontSize: 11, color: 'var(--muted)' }}>
                <strong style={{ color: 'var(--text)' }}>{c.role}:</strong>{' '}
                {c.name ?? c.org ?? '—'}
                {c.email && <> &nbsp;<a href={`mailto:${c.email}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{c.email}</a></>}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)', whiteSpace: 'nowrap' }}>{p.value ?? 'Unknown'}</div>
        {p.architect && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{p.architect}</div>}
        {p.source_url && (
          <a href={p.source_url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', display: 'block', marginTop: 4 }}>
            View source
          </a>
        )}
      </div>
    </div>
  )
}
