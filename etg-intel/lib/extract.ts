import Anthropic from '@anthropic-ai/sdk'
import { ETG_KEYWORDS, EXTRACTION_SYSTEM_PROMPT } from './types'
import type { Project } from './types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function extractProjects(
  text: string,
  source: string,
  sourceUrl?: string
): Promise<Omit<Project, 'id' | 'created_at' | 'updated_at'>[]> {
  const trimmed = text.slice(0, 14000)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Source: ${source}\nSource URL: ${sourceUrl ?? 'unknown'}\n\n${trimmed}`,
    }],
  })

  const raw = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  let parsed: ReturnType<typeof JSON.parse>[]
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return []
    parsed = JSON.parse(match[0])
  }

  if (!Array.isArray(parsed)) return []

  return parsed.map(p => ({
    name:           p.name ?? 'Unnamed Project',
    location:       p.location ?? undefined,
    value:          p.value ?? undefined,
    value_numeric:  p.value_numeric ?? undefined,
    sector:         p.sector ?? 'other',
    stage:          p.stage ?? 'planning',
    description:    p.description ?? undefined,
    bid_deadline:   p.bid_deadline ?? undefined,
    contract_type:  p.contract_type ?? undefined,
    project_number: p.project_number ?? undefined,
    architect:      p.architect ?? undefined,
    source,
    source_url:     p.source_url ?? sourceUrl ?? undefined,
    below_threshold: p.below_threshold ?? false,
    notes:          undefined,
    materials:      Array.isArray(p.materials) ? p.materials : [],
    keywords: ((p.keywords ?? []) as string[]).filter(k =>
      ETG_KEYWORDS.some(ek => ek.toLowerCase() === k.toLowerCase())
    ),
    contacts: Array.isArray(p.contacts) ? p.contacts : [],
  }))
}

export async function generateDigestSummary(projects: Project[]): Promise<string> {
  const projectList = projects.map(p =>
    `- ${p.name} (${p.location ?? 'unknown'}) | ${p.value ?? 'unknown'} | ${p.stage} | ${p.sector} | Keywords: ${p.keywords.join(', ') || 'none'}`
  ).join('\n')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Write a concise 3-5 sentence executive briefing for Exterior Technologies Group (ETG) summarising these new construction projects. Focus on total count, sectors, highest-value opportunities, and any projects mentioning ETG-relevant cladding materials. Professional tone, no exclamation marks.\n\nProjects:\n${projectList}`,
    }],
  })

  return message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
}
