'use client'

import type { Project, Stage, Sector } from '@/lib/types'

interface Props {
  projects: Project[]
  stage: Stage | 'all'
  sector: Sector | 'all'
  onStage: (s: Stage | 'all') => void
  onSector: (s: Sector | 'all') => void
  onExport: () => void
}

const DOT: Record<string, string> = {
  all: 'var(--muted)',
  planning: 'var(--amber)',
  bidding: 'var(--accent)',
  tender: 'var(--green)',
  awarded: 'var(--teal)',
  medical: 'var(--pink)',
  school: 'var(--purple)',
}

function FilterBtn({
  active, dot, label, count, onClick,
}: {
  active: boolean; dot: string; label: string; count?: number; onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 10px', borderRadius: 6, border: 'none', width: '100%',
      background: active ? 'var(--accent-dim)' : 'transparent',
      color: active ? 'var(--accent)' : 'var(--muted)',
      fontSize: 13, textAlign: 'left', transition: 'all 0.15s',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined && (
        <span style={{
          fontSize: 11, padding: '1px 7px', borderRadius: 20,
          background: active ? 'rgba(59,130,246,0.2)' : 'var(--surface3)',
          color: active ? 'var(--accent)' : 'var(--muted)',
        }}>{count}</span>
      )}
    </button>
  )
}

export default function Sidebar({ projects, stage, sector, onStage, onSector, onExport }: Props) {
  const count = (s: Stage) => projects.filter(p => p.stage === s).length
  const flagged = projects.filter(p => p.keywords.length > 0).length

  return (
    <aside style={{
      width: 260, minWidth: 260,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      padding: '20px 14px',
      display: 'flex', flexDirection: 'column', gap: 24,
      overflowY: 'auto',
    }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Total', value: projects.length, color: 'var(--text)' },
          { label: 'Keyword hits', value: flagged, color: 'var(--accent)' },
          { label: 'Medical', value: projects.filter(p => p.sector === 'medical').length, color: 'var(--pink)' },
          { label: 'Education', value: projects.filter(p => p.sector === 'school').length, color: 'var(--purple)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px',
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Stage filter */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
          Stage
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <FilterBtn active={stage === 'all'} dot={DOT.all} label="All stages" count={projects.length} onClick={() => onStage('all')} />
          <FilterBtn active={stage === 'planning'} dot={DOT.planning} label="Planning" count={count('planning')} onClick={() => onStage('planning')} />
          <FilterBtn active={stage === 'bidding'} dot={DOT.bidding} label="Bidding / RFP" count={count('bidding')} onClick={() => onStage('bidding')} />
          <FilterBtn active={stage === 'tender'} dot={DOT.tender} label="Tendered" count={count('tender')} onClick={() => onStage('tender')} />
          <FilterBtn active={stage === 'awarded'} dot={DOT.awarded} label="Awarded" count={count('awarded')} onClick={() => onStage('awarded')} />
        </div>
      </div>

      {/* Sector filter */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
          Sector
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <FilterBtn active={sector === 'all'} dot={DOT.all} label="All sectors" onClick={() => onSector('all')} />
          <FilterBtn active={sector === 'medical'} dot={DOT.medical} label="Medical / Healthcare" onClick={() => onSector('medical')} />
          <FilterBtn active={sector === 'school'} dot={DOT.school} label="Education / School" onClick={() => onSector('school')} />
        </div>
      </div>

      {/* Actions */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
          Actions
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <button onClick={onExport} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', borderRadius: 6, border: 'none',
            background: 'transparent', color: 'var(--muted)', fontSize: 13, textAlign: 'left',
          }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>
      </div>
    </aside>
  )
}
