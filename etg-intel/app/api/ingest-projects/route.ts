import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { projects } = await request.json()

  if (!Array.isArray(projects) || !projects.length) {
    return NextResponse.json({ added: 0 })
  }

  const supabase = createServerClient()

  // Dedup against existing
  const { data: existing } = await supabase.from('projects').select('name')
  const existingKeys = new Set(
    (existing ?? []).map((p: { name: string }) =>
      p.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)
    )
  )

  const newProjects = projects.filter((p: { name: string }) => {
    const key = p.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)
    return !existingKeys.has(key)
  })

  if (!newProjects.length) return NextResponse.json({ added: 0 })

  const { data, error } = await supabase.from('projects').insert(newProjects).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ added: data?.length ?? 0 })
}
