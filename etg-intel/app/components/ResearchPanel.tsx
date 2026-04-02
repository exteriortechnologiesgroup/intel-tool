'use client'

import { useState } from 'react'
import type { Project } from '@/lib/types'

interface Props {
  onComplete: () => void
}

interface ResearchResult {
  added: number
  total: number
  summary: string
}

interface DigestResult {
  summary: string
  projects: Project[]
  qualifying: number
  withKeywords: number
  medical: number
  school: number
}

const STAGE_COLORS: Record<string, { bg: string; color: string }> = {
  planning: { bg: 'var(--amber-dim)', color: 'var(--amber)' },
  bidding:  { bg: 'var(--accent-dim)', color: 'var(--accent)' },
  tender:   { bg: 'var(--green-dim)', color: 'var(--green)' },
  awarded:  { bg: 'var(--teal-dim)', color: 'var(--teal)' },
}

export default function ResearchPanel({ onComplete }: Props) {
  const [researchRunning, setResearchRunning] = useState(false)
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null)
  const [researchError, setResearchError] = useState<string | null>(null)
  const [researchStep, setResearchStep] = useState('')

  const [digestRunning, setDigestRunning] = useState(false)
  const [digestResult, setDigestResult] = useState<DigestResult | null>(null)
  const [digestError, setDigestError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const STEPS = [
    'Running web searches for medical and school projects...',
    'Fetching Daily Commercial News RSS feed...',
    'Fetching On-Site Magazine RSS feed...',
    'Scanning Canadian Architect projects page...',
    'Extracting and deduplicating results...',
  ]

  const runResearch = async () => {
    setResearchRunning(true)
    setResearchResult(null)
    setResearchError(null)
    let stepIdx = 0
    setResearchStep(STEPS[0])
    const interval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, STEPS.length - 1)
      setResearchStep(STEPS[stepIdx])
    }, 7000)
    try {
      const res = await fetch('/api/research', { method: 'POST' })
      const data = await res.json()
      clearInterval(interval)
      if (data.error) setResearchError(data.error)
      else { setResearchResult(data); onComplete() }
    } catch (e) {
      clearInterval(interval)
      setResearchError(e instanceof Error ? e.message : String(e))
    } finally {
      setResearchRunning(false)
      setResearchStep('')
    }
  }

  const runDigest = async () => {
    setDigestRunning(true)
    setDigestResult(null)
    setDigestError(null)
    try {
      const res = await fetch('/api/digest', { method: 'POST' })
      const data = await res.json()
      if (data.error) setDigestError(data.error)
      else setDigestResult(data)
    } catch (e) {
      setDigestError(e instanceof Error ? e.message : String(e))
    } finally {
      setDigestRunning(false)
    }
  }

  const copyDigest = () => {
    if (!digestResult) return
    const qualifying = digestResult.projects.filter(p => !p.below_threshold)
    const withKw = digestResult.projects.filter(p => p.keywords.length > 0)

    const lines = [
      `ETG PROJECT INTELLIGENCE — WEEKLY SUMMARY`,
      `Generated: ${new Date().toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      ``,
      `OVERVIEW`,
      `Total new projects: ${digestResult.projects.length}`,
      `Meet ETG criteria ($20M+, medical/school): ${digestResult.qualifying}`,
      `ETG keyword matches: ${digestResult.withKeywords}`,
      `Medical: ${digestResult.medical}  |  Education: ${digestResult.school}`,
      ``,
      `SUMMARY`,
      digestResult.summary,
    ]

    if (withKw.length > 0) {
      lines.push(``, `ETG KEYWORD MATCHES`)
      withKw.forEach(p => {
        lines.push(`- ${p.name} | ${p.location ?? '—'} | ${p.value ?? 'unknown'} | ${p.stage} | Keywords: ${p.keywords.join(', ')}`)
        if (p.architect) lines.push(`  Architect: ${p.architect}`)
        if (p.bid_deadline) lines.push(`  Bid deadline: ${p.bid_deadline}`)
      })
    }

    if (qualifying.length > 0) {
      lines.push(``, `QUALIFYING PROJECTS (Medical & Education, $20M+)`)
      qualifying.forEach(p => {
        lines.push(`- ${p.name}`)
        lines.push(`  ${p.location ?? '—'} | ${p.value ?? 'unknown'} | Stage: ${p.stage}`)
        if (p.description) lines.push(`  ${p.description}`)
        const contacts = (p.contacts ?? []).map(c => `${c.role}: ${c.name ?? c.org ?? '—'}${c.email ? ` <${c.email}>` : ''}${c.phone ? ` ${c.phone}` : ''}`).join(' | ')
        if (contacts) lines.push(`  Contacts: ${contacts}`)
        lines.push(``)
      })
    }

    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: 12 }}>
      {children}
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Research section ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SectionLabel>Auto-research sources</SectionLabel>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Web Search', desc: '8 targeted queries — medical & school', on: true },
            { label: 'Daily Commercial News', desc: 'RSS feed — tender notices', on: true },
            { label: 'On-Site Magazine', desc: 'RSS feed — project news', on: true },
            { label: 'Canadian Architect', desc: 'Projects page — direct fetch', on: true },
            { label: 'ConstructConnect Insight', desc: 'Paste manually via Add Data', on: false },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '12px 14px', opacity: s.on ? 1 : 0.45,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.on ? 'var(--green)' : 'var(--muted)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, paddingLeft: 14 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        <div>
          <button onClick={runResearch} disabled={researchRunning} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: "10px 22px", borderRadius: 8,
            background: researchRunning ? 'var(--surface2)' : 'var(--accent)',
            border: researchRunning ? '1px solid var(--border2)' : 'none',
            color: researchRunning ? 'var(--accent)' : 'white',
            fontSize: 14, fontWeight: 600,
          } as React.CSSProperties}>
            {researchRunning ? (
              <><Spin />Researching...</>
            ) : (
              <><SearchIcon />Run research now</>
            )}
          </button>
        </div>

        {researchRunning && researchStep && (
          <StatusBar color="var(--accent)" dimColor="rgba(59,130,246,0.12)" border="rgba(59,130,246,0.2)">
            <Spin />
            {researchStep}
          </StatusBar>
        )}

        {researchError && (
          <StatusBar color="var(--red)" dimColor="var(--red-dim)" border="rgba(239,68,68,0.2)">
            {researchError}
          </StatusBar>
        )}

        {researchResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                { label: 'Total found', value: researchResult.total, color: 'var(--text)' },
                { label: 'New added', value: researchResult.added, color: 'var(--green)' },
                { label: 'Duplicates skipped', value: researchResult.total - researchResult.added, color: 'var(--muted)' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '13px 15px', fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
              {researchResult.summary}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)' }} />

      {/* ── Weekly digest section ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <SectionLabel>Weekly summary</SectionLabel>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 14 }}>
            Generates an on-screen summary of all projects added in the last 7 days — keyword matches, qualifying projects, and an AI briefing. Copy it to paste into an email or Slack message.
          </p>
          <button onClick={runDigest} disabled={digestRunning} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 22px', borderRadius: 8,
            border: '1px solid var(--border2)',
            background: digestRunning ? 'var(--surface2)' : 'var(--surface)',
            color: digestRunning ? 'var(--muted)' : 'var(--text)',
            fontSize: 14, fontWeight: 600,
          }}>
            {digestRunning ? <><Spin />Generating...</> : <><DigestIcon />Generate weekly summary</>}
          </button>
        </div>

        {digestError && (
          <StatusBar color="var(--red)" dimColor="var(--red-dim)" border="rgba(239,68,68,0.2)">
            {digestError}
          </StatusBar>
        )}

        {digestResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Stat row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
              {[
                { label: 'New projects', value: digestResult.projects.length, color: 'var(--text)' },
                { label: 'Qualifying', value: digestResult.qualifying, color: 'var(--green)' },
                { label: 'Kw matches', value: digestResult.withKeywords, color: 'var(--accent)' },
                { label: 'Medical', value: digestResult.medical, color: 'var(--pink)' },
                { label: 'Education', value: digestResult.school, color: 'var(--purple)' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* AI summary */}
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8 }}>AI briefing</div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.75 }}>{digestResult.summary}</div>
            </div>

            {/* Keyword matches */}
            {digestResult.projects.filter(p => p.keywords.length > 0).length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 10 }}>
                  ETG keyword matches
                </div>
                {digestResult.projects.filter(p => p.keywords.length > 0).map(p => (
                  <DigestProjectRow key={p.id} p={p} />
                ))}
              </div>
            )}

            {/* Qualifying projects */}
            {digestResult.qualifying > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--green)', marginBottom: 10 }}>
                  Medical &amp; education — $20M+
                </div>
                {digestResult.projects.filter(p => !p.below_threshold).map(p => (
                  <DigestProjectRow key={p.id} p={p} />
                ))}
              </div>
            )}

            {/* Copy button */}
            <div>
              <button onClick={copyDigest} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 18px', borderRadius: 7,
                border: '1px solid var(--border2)',
                background: copied ? 'var(--green-dim)' : 'var(--surface)',
                color: copied ? 'var(--green)' : 'var(--text)',
                fontSize: 13, fontWeight: 500,
                transition: 'all 0.2s',
              }}>
                {copied ? <><CheckIcon />Copied to clipboard</> : <><CopyIcon />Copy summary as text</>}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DigestProjectRow({ p }: { p: Project }) {
  const stage = { planning: { bg: 'var(--amber-dim)', color: 'var(--amber)', label: 'Planning' }, bidding: { bg: 'var(--accent-dim)', color: 'var(--accent)', label: 'Bidding' }, tender: { bg: 'var(--green-dim)', color: 'var(--green)', label: 'Tendered' }, awarded: { bg: 'var(--teal-dim)', color: 'var(--teal)', label: 'Awarded' } }[p.stage] ?? { bg: 'var(--surface3)', color: 'var(--muted)', label: p.stage }
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{p.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.location ?? '—'}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>{p.value ?? '—'}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: stage.bg, color: stage.color }}>{stage.label}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
        {p.keywords.map(k => (
          <span key={k} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: 'rgba(59,130,246,0.12)', color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.2)' }}>{k}</span>
        ))}
        {p.architect && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Arch: {p.architect}</span>}
        {p.bid_deadline && <span style={{ fontSize: 12, color: 'var(--amber)' }}>Deadline: {p.bid_deadline}</span>}
      </div>
      {p.contacts.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {p.contacts.slice(0, 3).map((c, i) => (
            <span key={i} style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--surface3)', padding: '2px 8px', borderRadius: 5 }}>
              <strong style={{ color: 'var(--text)' }}>{c.role}</strong>: {c.name ?? c.org ?? '—'}
              {c.email && <> · <a href={`mailto:${c.email}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{c.email}</a></>}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBar({ children, color, dimColor, border }: { children: React.ReactNode; color: string; dimColor: string; border: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color, background: dimColor, borderRadius: 7, padding: '10px 14px', border: `1px solid ${border}` }}>
      {children}
    </div>
  )
}

function Spin() {
  return <span style={{ width: 14, height: 14, border: '2px solid rgba(59,130,246,0.3)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
}

function SearchIcon() {
  return <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
}

function DigestIcon() {
  return <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
}

function CopyIcon() {
  return <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
}

function CheckIcon() {
  return <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
}
