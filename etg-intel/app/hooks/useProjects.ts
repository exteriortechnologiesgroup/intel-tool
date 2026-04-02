'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Project, Stage, Sector } from '@/lib/types'

interface Filters {
  stage: Stage | 'all'
  sector: Sector | 'all'
  q: string
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({ stage: 'all', sector: 'all', q: '' })

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters.stage !== 'all') params.set('stage', filters.stage)
      if (filters.sector !== 'all') params.set('sector', filters.sector)
      if (filters.q) params.set('q', filters.q)
      const res = await window.fetch(`/api/projects?${params}`)
      if (!res.ok) throw new Error(await res.text())
      setProjects(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetch() }, [fetch])

  const deleteProject = async (id: string) => {
    await window.fetch(`/api/projects?id=${id}`, { method: 'DELETE' })
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  const updateProject = async (id: string, patch: Partial<Project>) => {
    const res = await window.fetch(`/api/projects?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const updated = await res.json()
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p))
    return updated
  }

  const ingestText = async (text: string, source: string, sourceUrl?: string) => {
    const res = await window.fetch('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source, sourceUrl }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    await fetch()
    return data as { added: number; projects: Project[] }
  }

  return {
    projects,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetch,
    deleteProject,
    updateProject,
    ingestText,
  }
}
