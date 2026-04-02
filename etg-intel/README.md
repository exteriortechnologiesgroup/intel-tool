# ETG Project Intelligence — Deployment Guide

Construction project tracker for Exterior Technologies Group.
Built with Next.js + Supabase + Claude AI. Runs entirely on free tiers.

## Services required (all free tier)

- Supabase — database
- Anthropic API — AI extraction (~$2-4/month at typical usage)
- Vercel — hosting (free Hobby tier)

No email service needed. The weekly summary is generated on-screen and copied to clipboard.

---

## Step 1 — Supabase

1. Create a project at https://supabase.com
2. SQL Editor — paste contents of supabase/schema.sql — click Run
3. Settings > API — copy Project URL, anon key, service_role key

## Step 2 — Anthropic API key

1. https://console.anthropic.com — create account, add credits
2. API Keys — create a key

## Step 3 — Deploy to Vercel

Push this folder to a GitHub repo, then import at https://vercel.com/new
Or use the CLI:
```bash
npm install -g vercel
vercel deploy
```

## Step 4 — Environment variables in Vercel

Project > Settings > Environment Variables:

| Variable | Where |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Supabase > Settings > API |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase > Settings > API |
| SUPABASE_SERVICE_ROLE_KEY | Supabase > Settings > API |
| ANTHROPIC_API_KEY | console.anthropic.com |
| NEXT_PUBLIC_APP_URL | Your Vercel URL |

Redeploy after adding variables.

## Step 5 — Test

1. Open your Vercel URL
2. Research tab > Run research now (takes 60-90 seconds)
3. Projects tab — confirm results appeared
4. Research tab > Generate weekly summary — confirms AI summary works

## How to use

**Research tab**
- Click "Run research now" to pull from web search, DCN, On-Site, and Canadian Architect
- Run it weekly or whenever you want a fresh pull
- Click "Generate weekly summary" to get an on-screen briefing of the last 7 days
- Copy the summary as plain text to paste into an email or Slack

**Add Data tab**
- Paste text from ConstructConnect or any other source
- Upload PDFs (tender documents, spec sheets)
- Upload CSVs (ConstructConnect exports)

**Projects tab**
- Filter by stage and sector in the sidebar
- Blue left border = ETG keyword match
- Click any card to open the detail panel with full contacts and editable notes
- Export CSV from the sidebar

## Customise

- Keywords: edit ETG_KEYWORDS in lib/types.ts
- Research queries: edit RESEARCH_QUERIES in lib/types.ts
- Value threshold / sectors: edit EXTRACTION_SYSTEM_PROMPT in lib/types.ts
