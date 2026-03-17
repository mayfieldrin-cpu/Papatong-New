import { createClient } from '@supabase/supabase-js'
import type { Skill, Category, Domain, PracticeLog, PracticeEntry } from '@/types'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key)

// ── Normalize DB rows to app types ───────────────
export function normalizeSkill(row: Record<string, unknown>): Skill {
  return {
    id:         row.id as string,
    name:       row.name as string,
    catId:      (row.cat_id    ?? row.catId    ?? null) as string | null,
    domainId:   (row.domain_id ?? row.domainId ?? null) as string | null,
    tag:        (row.tag ?? '') as string,
    priority:   Boolean(row.priority),
    confidence: (Number(row.confidence) || 1) as 1|2|3|4,
    goal:       row.goal != null ? Number(row.goal) : null,
    created_at: row.created_at as string | undefined,
  }
}

export function normalizeEntry(row: Record<string, unknown>): PracticeEntry {
  const techIds = (row.tech_ids as string[] | undefined) ?? []
  const vocIds  = (row.voc_ids  as string[] | undefined) ?? []
  return {
    id:           row.id as string,
    practiced_at: row.practiced_at as string,
    skill_ids:    (row.skill_ids as string[] | undefined) ?? [...techIds, ...vocIds],
    spont_skills: (row.spont_skills as string[] | undefined) ?? [],
    note:         (row.note ?? '') as string,
    title:        (row.title ?? '') as string,
    tags:         (row.tags ?? []) as string[],
  }
}

// ── Data loading ─────────────────────────────────
export async function loadAllData() {
  const [cats, doms, skls, logs, ents] = await Promise.all([
    supabase.from('categories').select('*').order('created_at', { ascending: true }),
    supabase.from('domains').select('*').order('created_at', { ascending: true }),
    supabase.from('skills').select('*').order('created_at', { ascending: true }),
    supabase.from('practice_log').select('*').order('practiced_at', { ascending: false }),
    supabase.from('practice_entries').select('*').order('practiced_at', { ascending: false }),
  ])
  return {
    categories: (cats.data ?? []) as Category[],
    domains:    (doms.data ?? []) as Domain[],
    skills:     (skls.data ?? []).map(normalizeSkill),
    logs:       (logs.data ?? []) as PracticeLog[],
    entries:    (ents.data ?? []).map(r => normalizeEntry(r as Record<string,unknown>)),
  }
}
