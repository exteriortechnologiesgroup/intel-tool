import Anthropic from '@anthropic-ai/sdk'
import { ETG_KEYWORDS, EXTRACTION_SYSTEM_PROMPT } from './types'
import type { Project } from './types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function extractProjects(
  text: string,
  source: string,
  sourceUrl?: string
): Promise<Omit<Project, 'id' | 'created_at' | 'updated_at'>[]> {
  // Trim to 14k chars to stay within context limits for large PDFs
  const trimmed = text.slice(0, 14000)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Source: ${source}\nSource URL: ${sourceUrl ?? 'unknown'}\n\n${trimmed}`,
      },
    ],
  })

  const raw = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
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

  return parsed.map((p) => ({
    name: p.name ?? 'Unnamed Project',
    location: p.location ?? null,
    value: p.value ?? null,
    value_numeric: p.value_numeric ?? null,
    sector: p.sector ?? 'other',
    stage: p.stage ?? 'planning',
    description: p.description ?? null,
    bid_deadline: p.bid_deadline ?? null,
    contract_type: p.contract_type ?? null,
    project_number: p.project_number ?? null,
    architect: p.architect ?? null,
    source,
    source_url: p.source_url ?? sourceUrl ?? null,
    below_threshold: p.below_threshold ?? false,
    notes: undefined,
    // Only include keywords that are genuinely on our list
    keywords: ((p.keywords ?? []) as string[]).filter((k) =>
      ETG_KEYWORDS.some((ek) => ek.toLowerCase() === k.toLowerCase())
    ),
    contacts: Array.isArray(p.contacts) ? p.contacts : [],
  }))
}

// Summarise a batch of projects into a digest narrative
export async function generateDigestSummary(
  projects: Project[]
): Promise<string> {
  const projectList = projects
    .map(
      (p) =>
        `- ${p.name} (${p.location ?? 'location unknown'}) | ${p.value ?? 'value unknown'} | Stage: ${p.stage} | Sector: ${p.sector} | Keywords: ${p.keywords.join(', ') || 'none'}`
    )
    .join('\n')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are writing a weekly intelligence briefing for Exterior Technologies Group (ETG), a Canadian building envelope and cladding company. Write a concise 3-5 sentence executive summary of the following new projects added this week. Focus on: total count, sectors, standout high-value opportunities, any projects that mention ETG-relevant materials. Professional tone, no exclamation marks.

Projects this week:
${projectList}`,
      },
    ],
  })

  return message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
}
