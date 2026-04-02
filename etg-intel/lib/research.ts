import Anthropic from '@anthropic-ai/sdk'
import { RESEARCH_QUERIES } from './types'
import { extractProjects } from './extract'
import type { Project } from './types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Web search via Claude's built-in search tool ──────────────────────────────
export async function runWebSearch(): Promise<{
  text: string
  source: string
  sourceUrl?: string
}[]> {
  const results: { text: string; source: string; sourceUrl?: string }[] = []

  for (const query of RESEARCH_QUERIES) {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
        messages: [
          {
            role: 'user',
            content: `Search for construction projects matching this query and return ALL project details you find including project names, values, locations, architects, contractors, bid deadlines, and any material specifications mentioned. Query: ${query}`,
          },
        ],
      })

      // Collect all text from the response (includes search result summaries)
      const text = message.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('\n')

      if (text.trim()) {
        results.push({ text, source: 'websearch', sourceUrl: undefined })
      }
    } catch (err) {
      console.error(`Web search failed for query "${query}":`, err)
    }
  }

  return results
}

// ── RSS feed fetch ────────────────────────────────────────────────────────────
export async function fetchRSS(url: string, sourceName: string): Promise<{
  text: string
  source: string
  sourceUrl: string
}[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ETG-Intel/1.0 (project research tool)' },
      next: { revalidate: 3600 },
    })

    if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`)

    const xml = await res.text()

    // Extract item titles, descriptions, links and pub dates from RSS
    const items: { text: string; source: string; sourceUrl: string }[] = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match

    while ((match = itemRegex.exec(xml)) !== null) {
      const item = match[1]
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.[1] ?? ''
      const desc = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/)?.[1] ?? ''
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

// ── Canadian Architect projects page ─────────────────────────────────────────
export async function fetchCanadianArchitect(): Promise<{
  text: string
  source: string
  sourceUrl: string
}[]> {
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
      // Strip HTML tags and collapse whitespace
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
      if (text) results.push({ text: text.slice(0, 10000), source: 'canarchitect', sourceUrl: url })
    }
    return results
  } catch (err) {
    console.error('Canadian Architect fetch failed:', err)
    return []
  }
}

// ── Master research runner ────────────────────────────────────────────────────
export async function runFullResearch(
  onProgress?: (msg: string) => void
): Promise<{ projects: Omit<Project, 'id' | 'created_at' | 'updated_at'>[]; summary: string }> {
  const allProjects: Omit<Project, 'id' | 'created_at' | 'updated_at'>[] = []
  const log = (msg: string) => { console.log(msg); onProgress?.(msg) }

  // 1. Web search
  log('Running web searches...')
  const searchResults = await runWebSearch()
  log(`Got ${searchResults.length} search result batches`)
  for (const r of searchResults) {
    const extracted = await extractProjects(r.text, r.source, r.sourceUrl)
    allProjects.push(...extracted)
  }

  // 2. DCN RSS
  log('Fetching Daily Commercial News RSS...')
  const dcnItems = await fetchRSS('https://canada.constructconnect.com/dcn/feed', 'dcn')
  log(`Got ${dcnItems.length} DCN items`)
  for (const item of dcnItems.slice(0, 20)) {
    const extracted = await extractProjects(item.text, item.source, item.sourceUrl)
    allProjects.push(...extracted)
  }

  // 3. On-Site Magazine RSS
  log('Fetching On-Site Magazine RSS...')
  const onsiteItems = await fetchRSS('https://www.on-sitemag.com/feed/', 'onsite')
  log(`Got ${onsiteItems.length} On-Site items`)
  for (const item of onsiteItems.slice(0, 20)) {
    const extracted = await extractProjects(item.text, item.source, item.sourceUrl)
    allProjects.push(...extracted)
  }

  // 4. Canadian Architect page
  log('Fetching Canadian Architect projects page...')
  const caItems = await fetchCanadianArchitect()
  for (const item of caItems) {
    const extracted = await extractProjects(item.text, item.source, item.sourceUrl)
    allProjects.push(...extracted)
  }

  log(`Total raw projects extracted: ${allProjects.length}`)

  // Dedupe by name similarity (simple normalised string match)
  const seen = new Set<string>()
  const deduped = allProjects.filter((p) => {
    const key = p.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  log(`After deduplication: ${deduped.length} projects`)

  const summary = `Research completed. Found ${deduped.length} unique projects across web search, DCN, On-Site Magazine, and Canadian Architect. ${deduped.filter(p => !p.below_threshold).length} meet ETG criteria (medical/school, $20M+).`

  return { projects: deduped, summary }
}
