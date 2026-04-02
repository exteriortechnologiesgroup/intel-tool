'use client'

import type { Project } from '@/lib/types'
import { StageBadge, SectorTag, KeywordTag } from './Badges'

interface Props {
  project: Project
  selected: boolean
  onClick: () => void
}

export default function ProjectCard({ project: p, selected, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? 'var(--surface2)' : 'var(--surface)',
        border: `1px solid ${p.keywords.length ? 'rgba(59,130,246,0.3)' : selected ? 'var(--border2)' : 'var(--border)'}`,
        borderLeft: p.keywords.length ? '2px solid var(--accent)' : undefined,
        borderRadius: 10,
        padding: '14px 18px',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 9,
        transition: 'all 0.15s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 600, color: 'var(--text)',
            marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {p.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {p.location ?? '—'}
            {p.source && <> &nbsp;·&nbsp; {p.source}</>}
            {p.created_at && (
              <> &nbsp;·&nbsp; {new Date(p.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</>
            )}
          </div>
        </div>
        <StageBadge stage={p.stage} />
      </div>

      {/* Info row */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <InfoPair label="Value" value={p.value ?? 'Unknown'} green />
        <InfoPair label="Sector" value={p.sector ? p.sector.charAt(0).toUpperCase() + p.sector.slice(1) : '—'} />
        {p.bid_deadline && <InfoPair label="Bid deadline" value={p.bid_deadline} />}
        {p.architect && <InfoPair label="Architect" value={p.architect} />}
      </div>

      {/* Tags */}
      {(p.keywords.length > 0 || p.sector !== 'other') && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {p.keywords.map(k => <KeywordTag key={k} label={k} />)}
          <SectorTag sector={p.sector} />
        </div>
      )}

      {/* Contacts preview */}
      {p.contacts.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {p.contacts.slice(0, 3).map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, color: 'var(--muted)',
              background: 'var(--surface2)', padding: '3px 9px',
              borderRadius: 5, border: '1px solid var(--border)',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
              <strong style={{ color: 'var(--text)', fontSize: 11 }}>{c.role}</strong>
              : {c.name ?? c.org ?? 'TBD'}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InfoPair({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: green ? 'var(--green)' : 'var(--text)', fontWeight: green ? 600 : 400 }}>
        {value}
      </div>
    </div>
  )
}
