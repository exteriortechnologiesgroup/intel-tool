import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { extractProjects } from '@/lib/extract'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { text, source, sourceUrl } = body as {
    text: string
    source: string
    sourceUrl?: string
  }

  if (!text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  try {
    const extracted = await extractProjects(text, source ?? 'manual', sourceUrl)

    if (!extracted.length) {
      return NextResponse.json({ added: 0, projects: [] })
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('projects')
      .insert(extracted)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ added: data?.length ?? 0, projects: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
