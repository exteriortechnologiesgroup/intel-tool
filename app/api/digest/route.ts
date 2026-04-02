import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { generateDigestSummary } from '@/lib/extract'
import type { Project } from '@/lib/types'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') ?? '7', 10)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const projects = (data ?? []) as Project[]

  if (!projects.length) {
    return NextResponse.json({ projects: [], summary: null, weekLabel: null, empty: true })
  }

  const now = new Date()
  const weekLabel = now.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
  const summary = await generateDigestSummary(projects)

  return NextResponse.json({ projects, summary, weekLabel, empty: false })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
