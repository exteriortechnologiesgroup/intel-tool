import Anthropic from '@anthropic-ai/sdk'
import { RESEARCH_QUERIES } from './types'
import { extractProjects } from './extract'
import type { Project } from './types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Single web search query (called one at a time to stay under 10s) ─────────
export async function runWebSearchBatch(
  index: number
): Promise<{ text: string; source: string; sourceUrl?: string } | null> {
  const query = RESEARCH_QUERIES[index]
  if (!query) return null

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
      messages: [
        {
          role: 'user',
          content: `Search for construction projects matching this query and return ALL project details you find including project names, values, locations, architects, contractors, bid deadlines, and any material specifications. Query: ${query}`,
        },
      ],
    })

    const text = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('\n')

    return text.trim() ? { text, source: 'websearch' } : null
  } catch (err) {
    console.error(`Web search failed for query index ${index}:`, err)
    return null
  }
}

// ── RSS feed fetch ────────────────────────────────────────────────────────────
export async function fetchRSS(
  url: string,
  sourceName: string
): Promise<{ text: string; source: string; sourceUrl: string }[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ETG-Intel/1.0 (project research tool)' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`)
    const xml = await res.text()

    const items: { text: string; source: string; sourceUrl: string }[] = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match

    while ((match = itemRegex.exec(xml)) !== null) {
      const item = match[1]
      const title =
        item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.[1] ?? ''
      const desc =
        item.match(
          /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/
        )?.[1] ?? ''
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] ?? ''
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? ''
      const text = `Title: ${title}\nDate: ${pubDate}\nURL: ${link}\n${desc.replace(/<[^>]+>/g, ' ')}`
      items.push({ text, source: sourceName, sourceUrl: link })
    }

    return items
  } catch (err) {
    console.error(`RSS fetch failed for ${url}:`, err)
    return []
  }
}

// ── Canadian Architect page fetch ─────────────────────────────────────────────
export async function fetchCanadianArchitect(): Promise<
  { text: string; source: string; sourceUrl: string }[]
> {
  try {
    const urls = [
      'https://www.canadianarchitect.com/projects/',
      'https://www.canadianarchitect.com/category/projects/',
    ]
    const results = []
    for (const url of urls) {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ETG-Intel/1.0 (project research tool)' },
        next: { revalidate: 3600 },
      })
      if (!res.ok) continue
      const html = await res.text()
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
      if (text) results.push({ text: text.slice(0, 8000), source: 'canarchitect', sourceUrl: url })
    }
    return results
  } catch (err) {
    console.error('Canadian Architect fetch failed:', err)
    return []
  }
}

// ── Legacy full runner (kept for reference, not used in production) ───────────
export async function runFullResearch(): Promise<{
  projects: Omit<Project, 'id' | 'created_at' | 'updated_at'>[]
  summary: string
}> {
  const allProjects: Omit<Project, 'id' | 'created_at' | 'updated_at'>[] = []

  for (let i = 0; i < RESEARCH_QUERIES.length; i++) {
    const result = await runWebSearchBatch(i)
    if (result) {
      const extracted = await extractProjects(result.text, result.source, result.sourceUrl)
      allProjects.push(...extracted)
    }
  }

  const dcnItems = await fetchRSS('https://canada.constructconnect.com/dcn/feed', 'dcn')
  for (const item of dcnItems.slice(0, 20)) {
    const extracted = await extractProjects(item.text, item.source, item.sourceUrl)
    allProjects.push(...extracted)
  }

  const onsiteItems = await fetchRSS('https://www.on-sitemag.com/feed/', 'onsite')
  for (const item of onsiteItems.slice(0, 20)) {
    const extracted = await extractProjects(item.text, item.source, item.sourceUrl)
    allProjects.push(...extracted)
  }

  const caItems = await fetchCanadianArchitect()
  for (const item of caItems) {
    const extracted = await extractProjects(item.text, item.source, item.sourceUrl)
    allProjects.push(...extracted)
  }

  const seen = new Set<string>()
  const deduped = allProjects.filter(p => {
    const key = p.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return {
    projects: deduped,
    summary: `Research completed. Found ${deduped.length} unique projects.`,
  }
}
