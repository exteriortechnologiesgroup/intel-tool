import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { runFullResearch } from '@/lib/research'

export const maxDuration = 120

export async function POST() {
  try {
    const { projects, summary } = await runFullResearch()

    if (!projects.length) {
      return NextResponse.json({ added: 0, summary, projects: [] })
    }

    const supabase = createServerClient()

    // Fetch existing project names to avoid re-inserting duplicates
    const { data: existing } = await supabase
      .from('projects')
      .select('name')
    const existingNames = new Set(
      (existing ?? []).map((p: { name: string }) =>
        p.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)
      )
    )

    const newProjects = projects.filter((p) => {
      const key = p.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)
      return !existingNames.has(key)
    })

    let added = 0
    if (newProjects.length > 0) {
      const { data, error } = await supabase
        .from('projects')
        .insert(newProjects)
        .select()
      if (error) throw new Error(error.message)
      added = data?.length ?? 0
    }

    // Log the research run
    await supabase.from('research_runs').insert({
      source: 'auto',
      projects_found: added,
      summary,
    })

    return NextResponse.json({ added, summary, total: projects.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
