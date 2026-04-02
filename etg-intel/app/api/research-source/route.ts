import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { extractProjects } from '@/lib/extract'
import { fetchRSS, fetchCanadianArchitect, runWebSearchBatch } from '@/lib/research'

// Each source runs in its own call — stays well under 10s Hobby limit
export const maxDuration = 10

export async function POST(request: NextRequest) {
  const { source, batchIndex } = await request.json() as {
    source: 'websearch' | 'dcn' | 'onsite' | 'canarchitect'
    batchIndex?: number
  }

  try {
    let chunks: { text: string; source: string; sourceUrl?: string }[] = []

    if (source === 'websearch') {
      // Run one query at a time — batchIndex tells us which one
      const idx = batchIndex ?? 0
      const result = await runWebSearchBatch(idx)
      if (result) chunks = [result]
    } else if (source === 'dcn') {
      const items = await fetchRSS('https://canada.constructconnect.com/dcn/feed', 'dcn')
      chunks = items.slice(0, 8)
    } else if (source === 'onsite') {
      const items = await fetchRSS('https://www.on-sitemag.com/feed/', 'onsite')
      chunks = items.slice(0, 8)
    } else if (source === 'canarchitect') {
      chunks = await fetchCanadianArchitect()
    }

    if (!chunks.length) {
      return NextResponse.json({ added: 0, found: 0, source })
    }

    // Extract projects from all chunks for this source
    const allExtracted = []
    for (const chunk of chunks) {
      const extracted = await extractProjects(chunk.text, chunk.source, chunk.sourceUrl)
      allExtracted.push(...extracted)
    }

    if (!allExtracted.length) {
      return NextResponse.json({ added: 0, found: 0, source })
    }

    // Dedup against existing projects
    const supabase = createServerClient()
    const { data: existing } = await supabase.from('projects').select('name')
    const existingKeys = new Set(
      (existing ?? []).map((p: { name: string }) =>
        p.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)
      )
    )

    const newProjects = allExtracted.filter(p => {
      const key = p.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)
      return !existingKeys.has(key)
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

    return NextResponse.json({ added, found: allExtracted.length, source })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`Research source ${source} failed:`, msg)
    return NextResponse.json({ error: msg, source }, { status: 500 })
  }
}
