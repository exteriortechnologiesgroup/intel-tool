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

  return (
    <aside style={{
      width: 420, minWidth: 420,
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 20px 14px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0,
        background: 'var(--surface)', zIndex: 10,
      }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--muted)',
          fontSize: 20, lineHeight: 1, float: 'right', marginTop: -2,
        }}>×</button>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 7, flexWrap: 'wrap' }}>
          <StageBadge stage={p.stage} />
          <SectorTag sector={p.sector} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{p.name}</div>
        {p.location && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{p.location}</div>}
      </div>

      {/* Body */}
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Value */}
        <div>
          <Label>Project value</Label>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)', letterSpacing: '-0.02em' }}>
            {p.value ?? 'Unknown'}
          </div>
        </div>

        {/* Description */}
        {p.description && (
          <Section title="Description">
            <div style={{
              background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)',
              padding: 11, fontSize: 13, color: 'var(--muted)', lineHeight: 1.7,
            }}>
              {p.description}
            </div>
          </Section>
        )}

        {/* ETG keywords */}
        {p.keywords.length > 0 && (
          <Section title="ETG keyword matches">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {p.keywords.map(k => <KeywordTag key={k} label={k} />)}
            </div>
          </Section>
        )}

        {/* Contacts */}
        {p.contacts.length > 0 && (
          <Section title="Contacts">
            {p.contacts.map((c, i) => (
              <div key={i} style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '11px 13px', marginBottom: 7,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 2 }}>
                  {c.role}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{c.name ?? c.org ?? '—'}</div>
                {c.org && c.name && <div style={{ fontSize: 13, color: 'var(--muted)' }}>{c.org}</div>}
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {c.email && <a href={`mailto:${c.email}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{c.email}</a>}
                  {c.phone && <span>{c.phone}</span>}
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* Project details table */}
        <Section title="Details">
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Source', p.source],
                ['Added', p.created_at ? new Date(p.created_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }) : null],
                ['Bid deadline', p.bid_deadline],
                ['Contract type', p.contract_type],
                ['Project #', p.project_number],
              ].filter(([, v]) => v).map(([label, val]) => (
                <tr key={label as string}>
                  <td style={{ color: 'var(--muted)', padding: '4px 0', width: 130 }}>{label}</td>
                  <td style={{ color: 'var(--text)', padding: '4px 0' }}>{val}</td>
                </tr>
              ))}
              {p.source_url && (
                <tr>
                  <td style={{ color: 'var(--muted)', padding: '4px 0' }}>Source URL</td>
                  <td style={{ padding: '4px 0' }}>
                    <a href={p.source_url} target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--accent)', fontSize: 12, textDecoration: 'none' }}>
                      View original
                    </a>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Section>

        {/* Notes */}
        <Section title="Notes">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add internal notes about this project..."
            style={{
              width: '100%', minHeight: 80,
              background: 'var(--surface2)', border: '1px solid var(--border2)',
              borderRadius: 8, padding: '10px 12px',
              color: 'var(--text)', fontSize: 13, lineHeight: 1.6, resize: 'vertical',
              outline: 'none',
            }}
          />
          <button
            onClick={saveNotes}
            disabled={saving}
            style={{
              marginTop: 6, padding: '6px 14px', borderRadius: 6,
              border: '1px solid var(--border2)',
              background: 'var(--surface)', color: 'var(--text)',
              fontSize: 13, opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save notes'}
          </button>
        </Section>

        {/* Delete */}
        <div style={{ paddingTop: 4 }}>
          <button
            onClick={() => { if (confirm('Delete this project?')) onDelete(p.id) }}
            style={{
              padding: '6px 14px', borderRadius: 6,
              border: '1px solid rgba(239,68,68,0.2)',
              background: 'none', color: 'var(--red)', fontSize: 13,
            }}
          >
            Delete project
          </button>
        </div>
      </div>
    </aside>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 4 }}>
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{title}</Label>
      {children}
    </div>
  )
}
