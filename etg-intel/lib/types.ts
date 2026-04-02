export type Stage = 'planning' | 'bidding' | 'tender' | 'awarded'
export type Sector = 'medical' | 'school' | 'other'

export interface Contact {
  role: string
  name?: string
  org?: string
  email?: string
  phone?: string
  website?: string
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
  materials?: string[]
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

export const EXTRACTION_SYSTEM_PROMPT = `You are a construction project intelligence assistant for Exterior Technologies Group (ETG), a Canadian building envelope materials company. ETG sells aluminum composite panels and cladding systems.

Extract ALL construction projects from the provided text. For each project return a JSON object:
{
  "name": "Full project name",
  "location": "City, Province",
  "value": "Dollar string e.g. $45M",
  "value_numeric": 45000000,
  "sector": "medical" | "school" | "other",
  "stage": "planning" | "bidding" | "tender" | "awarded",
  "description": "2-4 sentence summary including scope, size, and any notable details",
  "bid_deadline": "date string or null",
  "contract_type": "Design-Build | Stipulated Price | CM | etc. or null",
  "project_number": "Tender or project number if visible, or null",
  "architect": "Architect firm name if mentioned, or null",
  "materials": ["list ALL materials, cladding systems, or building products mentioned in specs or descriptions — e.g. brick, glass curtain wall, aluminum composite panel, EIFS, precast concrete"],
  "keywords": ["matched ETG keywords ONLY from: Alpolic ACM, Alucobond, Alpolic, Reynobond, Alcotex, Larson, Alucoil, Alfrex, Easytrim, Easytrim Reveal, Accumet, Sobotec, ACM, Alubond, Aluminum Composite, Aluminum Cladding, AL-13, AL 13, AL13, ALCAN COMPOSITES, ALCOA ARCHITECTURAL PRODUCTS, MITSUBISHI CHEMICALS"],
  "contacts": [
    {
      "role": "Architect" | "General Contractor" | "Owner" | "Engineer" | "Project Manager" | "Developer" | "Construction Manager",
      "name": "Person full name or null",
      "org": "Company or firm name",
      "email": "email address if found or null",
      "phone": "phone number if found or null",
      "website": "company website URL if found or null"
    }
  ],
  "source_url": "Direct URL to the original listing, article, or tender notice if available — extract from the text if present",
  "below_threshold": true if value under $20M OR sector is not medical or school
}

IMPORTANT:
- Extract every contact mentioned — architects, GCs, owners, engineers, project managers
- Extract every material or product mentioned in specs, even if not an ETG product
- Always try to extract source URLs from the text
- If a phone number or email appears anywhere near a company name, associate it with that contact
- Be thorough on descriptions — include building size (sq ft/m2), number of floors, program details if mentioned

Return ONLY a valid JSON array. No markdown, no explanation.`

export const RESEARCH_QUERIES = [
  'hospital construction tender Canada 2026 "$20 million" OR "$30 million" OR "$50 million" architect',
  'school addition construction Canada 2026 tender bid general contractor architect',
  'medical centre new building Canada 2026 tender construction value',
  'healthcare facility construction tender Canada 2026 "aluminum cladding" OR "ACM" OR "Alucobond"',
  'university college building construction Canada 2026 tender bid',
  'hospital renovation expansion Canada 2026 architect contractor',
  'school construction project Canada 2026 design build stipulated price',
  'medical office building Canada 2026 construction tender architect',
  '"aluminum composite" OR "Alpolic" OR "Reynobond" hospital school construction Canada 2026',
  'Ontario hospital school construction tender 2026 architect "general contractor"',
]
