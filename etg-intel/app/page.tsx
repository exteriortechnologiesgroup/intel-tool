'use client'

import { useState, useCallback } from 'react'
import type { Project, Stage, Sector } from '@/lib/types'
import { useProjects } from './hooks/useProjects'
import Sidebar from './components/Sidebar'
import ProjectCard from './components/ProjectCard'
import DetailPanel from './components/DetailPanel'
import AddDataPanel from './components/AddDataPanel'
import ResearchPanel from './components/ResearchPanel'
import DigestPanel from './components/DigestPanel'

type Tab = 'projects' | 'add' | 'research' | 'digest'

export default function Page() {
  const { projects, loading, filters, setFilters, refetch, deleteProject, updateProject } = useProjects()
  const [activeTab, setActiveTab] = useState<Tab>('projects')
  const [selected, setSelected] = useState<Project | null>(null)

  const setStage = useCallback((stage: Stage | 'all') => setFilters(f => ({ ...f, stage })), [setFilters])
  const setSector = useCallback((sector: Sector | 'all') => setFilters(f => ({ ...f, sector })), [setFilters])

  const handleDelete = async (id: string) => {
    await deleteProject(id)
    setSelected(null)
  }

  const exportCSV = () => {
    if (!projects.length) return
    const headers = ['Name','Location','Value','Sector','Stage','Bid Deadline','Architect','GC','Owner','Keywords','Source','Date Added','Description']
    const rows = projects.map(p => {
      const get = (role: string) => {
        const c = p.contacts.find(c => c.role?.toLowerCase().includes(role.toLowerCase()))
        return c?.org ?? c?.name ?? ''
      }
      return [
        p.name, p.location, p.value, p.sector, p.stage,
        p.bid_deadline ?? '', get('architect'), get('contractor') || get('general'), get('owner'),
        p.keywords.join('; '), p.source,
        p.created_at ? new Date(p.created_at).toLocaleDateString('en-CA') : '',
        (p.description ?? '').replace(/"/g, "'"),
      ].map(v => `"${v ?? ''}"`).join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `ETG-Projects-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'projects', label: 'Projects' },
    { id: 'add', label: '+ Add data' },
    { id: 'research', label: '⌕ Research' },
    { id: 'digest', label: '⊞ Digest' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* Header */}
      <header style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '13px 24px', display: 'flex', alignItems: 'center', gap: 16,
        position: 'sticky', top: 0, zIndex: 100, flexShrink: 0,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>
          ETG <span style={{ color: 'var(--accent)' }}>///</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Project Intelligence</div>

        <div style={{ display: 'flex', gap: 2, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, padding: 3, marginLeft: 8 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: '5px 13px', borderRadius: 5, border: 'none',
              background: activeTab === t.id ? 'var(--surface2)' : 'transparent',
              color: activeTab === t.id ? 'var(--text)' : 'var(--muted)',
              fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {activeTab === 'projects' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 7, padding: '6px 12px', marginLeft: 8, flex: '0 1 280px' }}>
            <svg width="13" height="13" fill="none" stroke="var(--muted)" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" placeholder="Search projects..." value={filters.q}
              onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13, width: '100%' }} />
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
          {[
            { val: projects.length, label: 'Projects', color: 'var(--accent)', dim: 'var(--accent-dim)' },
            { val: projects.filter(p => p.keywords.length > 0).length, label: 'Keyword matches', color: 'var(--green)', dim: 'var(--green-dim)' },
          ].map(s => (
            <div key={s.label} style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 20, padding: '0 5px', borderRadius: 10, background: s.dim, color: s.color, fontSize: 11, fontWeight: 700 }}>{s.val}</span>
              <strong style={{ color: 'var(--text)' }}>{s.label}</strong>
            </div>
          ))}
        </div>
      </header>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {activeTab === 'projects' && (
          <Sidebar projects={projects} stage={filters.stage} sector={filters.sector} onStage={setStage} onSector={setSector} onExport={exportCSV} />
        )}

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {activeTab === 'projects' && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {loading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '40px 0', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
                    <span style={{ width: 16, height: 16, border: '2px solid var(--accent-dim)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    Loading projects...
                  </div>
                )}
                {!loading && projects.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '80px 40px', textAlign: 'center', flex: 1 }}>
                    <svg width="40" height="40" fill="none" stroke="var(--muted)" strokeWidth="1" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No projects yet</div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 380, lineHeight: 1.6 }}>
                        Use Research to automatically pull from DCN, On-Site, and Canadian Architect, or Add Data to paste content manually.
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setActiveTab('research')} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 600 }}>Run research</button>
                      <button onClick={() => setActiveTab('add')} style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }}>Add manually</button>
                    </div>
                  </div>
                )}
                {!loading && projects.map(p => (
                  <div key={p.id} style={{ animation: 'fadeIn 0.2s ease' }}>
                    <ProjectCard project={p} selected={selected?.id === p.id} onClick={() => setSelected(prev => prev?.id === p.id ? null : p)} />
                  </div>
                ))}
              </div>
              {selected && (
                <DetailPanel
                  project={selected}
                  onClose={() => setSelected(null)}
                  onDelete={handleDelete}
                  onUpdate={(id, patch) => updateProject(id, patch)}
                />
              )}
            </>
          )}

          {activeTab === 'add' && (
            <AddDataPanel onComplete={(added) => { if (added > 0) { refetch(); setActiveTab('projects') } }} />
          )}

          {activeTab === 'research' && (
            <ResearchPanel onComplete={() => refetch()} />
          )}

          {activeTab === 'digest' && (
            <DigestPanel />
          )}

        </div>
      </div>
    </div>
  )
}
