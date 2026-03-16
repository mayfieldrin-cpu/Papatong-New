// ── Core data types ──────────────────────────────

export type PaletteId = 'rose' | 'amber' | 'lime' | 'teal' | 'sky' | 'indigo' | 'coral' | 'gray'

export interface PaletteColor {
  id: PaletteId
  dot: string   // solid accent color
  bg:  string   // dark background
  text: string  // text on bg
  dim:  string  // very dark bg for subtle fills
}

export interface Category {
  id: string
  name: string
  color: PaletteId
  created_at?: string
}

export interface Domain {
  id: string
  name: string
  color: PaletteId
  created_at?: string
}

export type ConfidenceLevel = 1 | 2 | 3 | 4

export interface Skill {
  id: string
  name: string
  catId: string | null
  domainId: string | null
  tag: string
  priority: boolean
  confidence: ConfidenceLevel
  created_at?: string
  // DB columns (snake_case from Supabase)
  cat_id?: string | null
  domain_id?: string | null
}

export interface PracticeLog {
  id: string
  skill_id: string
  practiced_at: string
  done: boolean
}

export interface PracticeEntry {
  id: string
  practiced_at: string
  skill_ids: string[]
  spont_skills: string[]
  note: string
  title: string
  tags: string[]
}

// ── Session types ────────────────────────────────

export interface Slot {
  skillId: string | null
  locked: boolean
  fromSuggested: boolean
}

// ── Analytics types ──────────────────────────────

export interface SkillStats {
  skillId: string
  count: number
  lastPracticed: string | null
  daysSinceLastPractice: number | null
  weeklyAvg: number        // avg sessions per week over last 8 weeks
  momentumScore: number    // 0–100
  neglectScore: number     // 0–100, higher = more neglected
}

export interface WeeklyVolume {
  weekStart: string   // ISO date
  count: number
  movingAvg: number  // 4-week rolling average
}

// ── Explore types ────────────────────────────────

export interface ExploreResults {
  synonyms: string[]
  antonyms: string[]
  random: string[]
}

export interface BreadcrumbItem {
  word: string
  results: ExploreResults
}
