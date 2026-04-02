'use client'

import { useState } from 'react'
import type { Project } from '@/lib/types'
import { StageBadge, SectorTag, KeywordTag } from './Badges'

interface Props {
  project: Project
  onClose: () => void
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<Project>) => Promise<Project>
}

export default function DetailPanel({ project: p, onClose, onDelete, onUpdate }: Props) {
  const [notes, setNotes] = useState(p.notes ?? '')
  const [saving, setSaving] = useState(false)

  const saveNotes = async () => {
    setSaving(true)
    await onUpdate(p.id, { notes })
    setSaving(false)
  }

  const roleColor: Record<string, string> = {
    'Architect':             'var(--accent)',
    'General Contractor':    'var(--green)',
    'Owner':                 'var(--amber)',
    'Engineer':              'var(--teal)',
    'Developer':             'var(--purple)',
    'Construction Manager':  'var(--pink)',
    'Project Manager':       'var(--pink)',
  }

  return (
    <aside style={{ width: 440, minWidth: 440, background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20, lineHeight: 1, float: 'right', marginTop: -2, cursor: 'pointer' }}>×</button>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 7, flexWrap: 'wrap' }}>
          <StageBadge stage={p.stage} />
          <SectorTag sector={p.sector} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{p.name}</div>
        {p.location && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{p.location}</div>}
      </div>

      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Value + quick stats */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <Label>Project value</Label>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)', letterSpacing: '-0.02em' }}>{p.value ?? 'Unknown'}</div>
          </div>
          {p.bid_deadline && (
            <div>
              <Label>Bid deadline</Label>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--amber)' }}>{p.bid_deadline}</div>
            </div>
          )}
        </div>

        {/* Source link — prominent */}
        {p.source_url && (
          <a href={p.source_url} target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 8,
            background: 'var(--accent-dim)', border: '1px solid rgba(59,130,246,0.25)',
            color: 'var(--accent)', textDecoration: 'none', fontSize: 13, fontWeight: 500,
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              View original source
            </span>
            <span style={{ fontSize: 11, opacity: 0.7, flexShrink: 0 }}>{p.source ?? ''}</span>
          </a>
        )}

        {/* Description */}
        {p.description && (
          <Section title="Description">
            <div style={{ background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)', padding: 11, fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
              {p.description}
            </div>
          </Section>
        )}

        {/* ETG keyword matches */}
        {p.keywords.length > 0 && (
          <Section title="ETG keyword matches">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {p.keywords.map(k => <KeywordTag key={k} label={k} />)}
            </div>
          </Section>
        )}

        {/* Materials specified */}
        {p.materials && p.materials.length > 0 && (
          <Section title="Materials & products specified">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {p.materials.map((m, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: '3px 9px', borderRadius: 4,
                  background: 'var(--surface2)', color: 'var(--text)',
                  border: '1px solid var(--border2)',
                }}>
                  {m}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Contacts */}
        {p.contacts.length > 0 && (
          <Section title="Contacts">
            {p.contacts.map((c, i) => (
              <div key={i} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, color: roleColor[c.role] ?? 'var(--accent)' }}>
                  {c.role}
                </div>
                {c.name && <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 1 }}>{c.name}</div>}
                {c.org && <div style={{ fontSize: 13, color: c.name ? 'var(--muted)' : 'var(--text)', fontWeight: c.name ? 400 : 600, marginBottom: 4 }}>{c.org}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  {c.email && (
                    <a href={`mailto:${c.email}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      {c.email}
                    </a>
                  )}
                  {c.phone && (
                    <a href={`tel:${c.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.15 6.15l1.02-.93a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      {c.phone}
                    </a>
                  )}
                  {c.website && (
                    <a href={c.website} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                      {c.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* Project details */}
        <Section title="Details">
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <tbody>
              {([
                ['Source', p.source],
                ['Added', p.created_at ? new Date(p.created_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }) : null],
                ['Contract type', p.contract_type],
                ['Project #', p.project_number],
              ] as [string, string | null | undefined][]).filter(([, v]) => v).map(([label, val]) => (
                <tr key={label}>
                  <td style={{ color: 'var(--muted)', padding: '4px 0', width: 130 }}>{label}</td>
                  <td style={{ color: 'var(--text)', padding: '4px 0' }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Notes */}
        <Section title="Internal notes">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes about this project..."
            style={{ width: '100%', minHeight: 80, background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 13, lineHeight: 1.6, resize: 'vertical', outline: 'none' }}
          />
          <button onClick={saveNotes} disabled={saving} style={{ marginTop: 6, padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, opacity: saving ? 0.6 : 1, cursor: 'pointer' }}>
            {saving ? 'Saving...' : 'Save notes'}
          </button>
        </Section>

        {/* Delete */}
        <div>
          <button onClick={() => { if (confirm('Delete this project?')) onDelete(p.id) }} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'none', color: 'var(--red)', fontSize: 13, cursor: 'pointer' }}>
            Delete project
          </button>
        </div>
      </div>
    </aside>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 4 }}>{children}</div>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><Label>{title}</Label>{children}</div>
}
