import type { Stage, Sector } from '@/lib/types'

const STAGE_MAP: Record<Stage, { bg: string; color: string; label: string }> = {
  planning: { bg: 'var(--amber-dim)', color: 'var(--amber)', label: 'Planning' },
  bidding:  { bg: 'var(--accent-dim)', color: 'var(--accent)', label: 'Bidding' },
  tender:   { bg: 'var(--green-dim)', color: 'var(--green)', label: 'Tendered' },
  awarded:  { bg: 'var(--teal-dim)', color: 'var(--teal)', label: 'Awarded' },
}

export function StageBadge({ stage }: { stage: Stage }) {
  const s = STAGE_MAP[stage] ?? { bg: 'var(--surface2)', color: 'var(--muted)', label: stage }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 11, fontWeight: 600, padding: '3px 9px',
      borderRadius: 20, whiteSpace: 'nowrap' as const,
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  )
}

export function SectorTag({ sector }: { sector: Sector }) {
  if (sector === 'medical') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
        background: 'rgba(236,72,153,0.12)', color: 'var(--pink)',
        border: '1px solid rgba(236,72,153,0.2)',
      }}>Medical</span>
    )
  }
  if (sector === 'school') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
        background: 'rgba(139,92,246,0.12)', color: 'var(--purple)',
        border: '1px solid rgba(139,92,246,0.2)',
      }}>Education</span>
    )
  }
  return null
}

export function KeywordTag({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 4,
      background: 'rgba(59,130,246,0.12)', color: 'var(--accent)',
      border: '1px solid rgba(59,130,246,0.2)',
    }}>
      {label}
    </span>
  )
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span style={{
      display: 'inline-block',
      width: size, height: size,
      border: `2px solid var(--accent-dim)`,
      borderTopColor: 'var(--accent)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}
