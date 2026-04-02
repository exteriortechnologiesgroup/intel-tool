export type Stage = 'planning' | 'bidding' | 'tender' | 'awarded'
export type Sector = 'medical' | 'school' | 'other'

export interface Contact {
  role: string
  name?: string
  org?: string
  email?: string
  phone?: string
}

export interface Project {
  id: string
  name: string
  location?: string
  value?: string
  value_numeric?: number
  sector: Sector
  stage: Stage
  description?: string
  bid_deadline?: string
  contract_type?: string
  project_number?: string
  architect?: string
  keywords: string[]
  contacts: Contact[]
  source?: string
  source_url?: string
  below_threshold?: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface ResearchRun {
  id: string
  ran_at: string
  source: string
  projects_found: number
  summary?: string
}

export const ETG_KEYWORDS = [
  'Alpolic ACM', 'Alucobond', 'Alpolic', 'Reynobond', 'Alcotex',
  'Larson', 'Alucoil', 'Alfrex', 'Easytrim Reveal', 'Easytrim',
  'Accumet', 'Sobotec', 'ACM', 'Alubond', 'Aluminum Composite',
  'Aluminum Cladding', 'AL-13', 'AL 13', 'AL13',
  'ALCAN COMPOSITES', 'ALCOA ARCHITECTURAL PRODUCTS', 'MITSUBISHI CHEMICALS',
]

export const RESEARCH_SOURCES = [
  {
    id: 'dcn',
    label: 'Daily Commercial News',
    url: 'https://canada.constructconnect.com/dcn',
    rss: 'https://canada.constructconnect.com/dcn/rss',
    type: 'rss' as const,
  },
  {
    id: 'onsite',
    label: 'On-Site Magazine',
    url: 'https://www.on-sitemag.com/news/',
    rss: 'https://www.on-sitemag.com/feed/',
    type: 'rss' as const,
  },
  {
    id: 'canarchitect',
    label: 'Canadian Architect',
    url: 'https://www.canadianarchitect.com/projects/',
    type: 'fetch' as const,
  },
  {
    id: 'websearch',
    label: 'Web Search',
    type: 'search' as const,
  },
]

export const EXTRACTION_SYSTEM_PROMPT = `You are a construction project intelligence assistant for Exterior Technologies Group (ETG), a Canadian building envelope materials company. ETG sells and represents manufacturers of aluminum composite panels and cladding systems.

Extract ALL construction projects from the provided text. Return a JSON array where each object has:
{
  "name": "Full project name",
  "location": "City, Province",
  "value": "Dollar string e.g. $45M or $120,000,000",
  "value_numeric": 45000000,
  "sector": "medical" | "school" | "other",
  "stage": "planning" | "bidding" | "tender" | "awarded",
  "description": "1-3 sentence summary of the project",
  "bid_deadline": "date string or null",
  "contract_type": "Design-Build | Stipulated Price | CM | etc. or null",
  "project_number": "Tender/project number if visible, or null",
  "architect": "Architect firm name if mentioned, or null",
  "source_url": "Direct URL to the project listing if available, or null",
  "keywords": ["array of matched ETG keywords ONLY from this list: Alpolic ACM, Alucobond, Alpolic, Reynobond, Alcotex, Larson, Alucoil, Alfrex, Easytrim, Easytrim Reveal, Accumet, Sobotec, ACM, Alubond, Aluminum Composite, Aluminum Cladding, AL-13, AL 13, AL13, ALCAN COMPOSITES, ALCOA ARCHITECTURAL PRODUCTS, MITSUBISHI CHEMICALS"],
  "contacts": [
    {
      "role": "Architect" | "General Contractor" | "Owner" | "Engineer" | "Project Manager" | "Developer",
      "name": "Person name or null",
      "org": "Company or firm name",
      "email": "email address or null",
      "phone": "phone number or null"
    }
  ],
  "below_threshold": true if project value is under $20M OR sector is not medical or school
}

Be thorough. Include every project mentioned. If a field is unknown, use null.
Return ONLY a valid JSON array. No markdown fences, no explanation text.`

export const RESEARCH_QUERIES = [
  'hospital construction tender Canada 2026 "$20 million" OR "$30 million" OR "$40 million" OR "$50 million"',
  'school addition construction tender Canada 2026 architect "general contractor"',
  'medical centre new building construction Canada 2026 tender bid',
  'site:canadianarchitect.com hospital OR healthcare construction project 2026',
  'site:on-sitemag.com school OR hospital construction tender 2026',
  'site:canada.constructconnect.com/dcn hospital school construction 2026',
  'aluminum composite cladding specification hospital school Canada 2026',
  '"aluminum cladding" OR "ACM" OR "Alucobond" OR "Alpolic" hospital school construction Canada tender 2026',
]
