import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 10

export async function GET() {
  // Step 1: confirm API key is present
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set in environment variables' })
  }

  // Step 2: try a minimal API call (no web search, just a hello)
  try {
    const anthropic = new Anthropic({ apiKey: key })
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say "ok"' }],
    })
    const text = (msg.content[0] as { text: string }).text
    return NextResponse.json({ ok: true, apiKeyPrefix: key.slice(0, 12) + '...', response: text })
  } catch (err) {
    return NextResponse.json({
      error: 'Anthropic API call failed',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}
