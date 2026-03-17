import { create } from 'zustand'
import { supabase, loadAllData, normalizeSkill, normalizeEntry } from '@/lib/supabase'
import { DEFAULT_CATS, DEFAULT_DOMAINS } from '@/lib/palette'
import type {
  Category, Domain, Skill, PracticeLog, PracticeEntry,
  Slot, ConfidenceLevel, KnowledgeCard
} from '@/types'

// ── Helpers ──────────────────────────────────────
function uid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11)
}

function makeSlots(n: number): Slot[] {
  return Array.from({ length: n }, () => ({ skillId: null, locked: false, fromSuggested: false }))
}

// ── Store shape ───────────────────────────────────
interface PapatongStore {
  // Data
  categories: Category[]
  domains: Domain[]
  skills: Skill[]
  logs: PracticeLog[]
  entries: PracticeEntry[]
  cards: KnowledgeCard[]
  loaded: boolean

  // Session
  sessionActiveCats: Set<string>
  sessionSlots: Record<string, Slot[]>
  sessionCounts: Record<string, number>
  spontSkills: string[]
  logNote: string
  logTitle: string
  logDate: string
  logTags: string[]

  // Actions — data loading
  loadAll: () => Promise<void>

  // Actions — categories
  addCategory:    (c: Category) => Promise<void>
  updateCategory: (id: string, patch: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>

  // Actions — domains
  addDomain:    (d: Domain) => Promise<void>
  updateDomain: (id: string, patch: Partial<Domain>) => Promise<void>
  deleteDomain: (id: string) => Promise<void>

  // Actions — skills
  addSkill:    (s: Skill) => Promise<void>
  updateSkill: (id: string, patch: Partial<Skill>) => Promise<void>
  deleteSkill: (id: string) => Promise<void>

  // Actions — knowledge cards
  loadCards: () => Promise<void>
  addCard: (c: KnowledgeCard) => Promise<void>
  updateCard: (id: string, patch: Partial<KnowledgeCard>) => Promise<void>
  deleteCard: (id: string) => Promise<void>
  linkCards: (fromId: string, toId: string) => Promise<void>
  unlinkCards: (fromId: string, toId: string) => Promise<void>
  linkEntryCard: (entryId: string, cardId: string) => Promise<void>
  unlinkEntryCard: (entryId: string, cardId: string) => Promise<void>

  // Actions — entries
  addEntry:    (e: PracticeEntry) => Promise<void>
  updateEntry: (id: string, patch: Partial<PracticeEntry>) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  logPractice: (skillId: string) => Promise<void>

  // Actions — session
  setSessionActiveCats: (cats: Set<string>) => void
  setSlots:  (catId: string, slots: Slot[]) => void
  setCount:  (catId: string, n: number) => void
  setSpontSkills: (skills: string[]) => void
  setLogNote:  (v: string) => void
  setLogTitle: (v: string) => void
  setLogDate:  (v: string) => void
  setLogTags:  (tags: string[]) => void
  resetSession: () => void
}

export const useStore = create<PapatongStore>((set, get) => ({
  categories: [],
  domains: [],
  skills: [],
  logs: [],
  entries: [],
  cards: [],
  loaded: false,
  sessionActiveCats: new Set(),
  sessionSlots: {},
  sessionCounts: {},
  spontSkills: [],
  logNote: '',
  logTitle: '',
  logDate: new Date().toISOString().slice(0, 10),
  logTags: [],

  // ── Load ─────────────────────────────────────
  loadAll: async () => {
    try {
      const data = await loadAllData()
      set({
        categories: data.categories.length ? data.categories : DEFAULT_CATS as Category[],
        domains:    data.domains.length    ? data.domains    : DEFAULT_DOMAINS as Domain[],
        skills:     data.skills,
        logs:       data.logs,
        entries:    data.entries,
        loaded:     true,
        sessionActiveCats: new Set(
          (data.categories.length ? data.categories : DEFAULT_CATS).map(c => c.id)
        ),
      })
      // Load knowledge cards separately (different tables)
      await get().loadCards()
    } catch (e) {
      console.error('loadAll error:', e)
      set({ loaded: true })
    }
  },

  // ── Categories ───────────────────────────────
  addCategory: async (c) => {
    set(s => ({ categories: [...s.categories, c] }))
    const { error } = await supabase.from('categories').insert({ id: c.id, name: c.name, color: c.color })
    if (error) console.error('addCategory:', error.message)
  },
  updateCategory: async (id, patch) => {
    set(s => ({ categories: s.categories.map(c => c.id === id ? { ...c, ...patch } : c) }))
    const cat = get().categories.find(c => c.id === id)
    if (!cat) return
    const { error } = await supabase.from('categories').update({ name: cat.name, color: cat.color }).eq('id', id)
    if (error) console.error('updateCategory:', error.message)
  },
  deleteCategory: async (id) => {
    set(s => ({
      categories: s.categories.filter(c => c.id !== id),
      skills: s.skills.map(s => s.catId === id ? { ...s, catId: null } : s),
    }))
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) console.error('deleteCategory:', error.message)
  },

  // ── Domains ──────────────────────────────────
  addDomain: async (d) => {
    set(s => ({ domains: [...s.domains, d] }))
    const { error } = await supabase.from('domains').insert({ id: d.id, name: d.name, color: d.color })
    if (error) console.error('addDomain:', error.message)
  },
  updateDomain: async (id, patch) => {
    set(s => ({ domains: s.domains.map(d => d.id === id ? { ...d, ...patch } : d) }))
    const dom = get().domains.find(d => d.id === id)
    if (!dom) return
    const { error } = await supabase.from('domains').update({ name: dom.name, color: dom.color }).eq('id', id)
    if (error) console.error('updateDomain:', error.message)
  },
  deleteDomain: async (id) => {
    set(s => ({
      domains: s.domains.filter(d => d.id !== id),
      skills: s.skills.map(s => s.domainId === id ? { ...s, domainId: null } : s),
    }))
    const { error } = await supabase.from('domains').delete().eq('id', id)
    if (error) console.error('deleteDomain:', error.message)
  },

  // ── Skills ───────────────────────────────────
  addSkill: async (s) => {
    set(st => ({ skills: [...st.skills, s] }))
    const row = {
      id: s.id, name: s.name,
      cat_id: s.catId || null, domain_id: s.domainId || null,
      tag: s.tag || '', priority: s.priority === true,
      confidence: Number(s.confidence) || 1,
      goal: s.goal ?? null,
    }
    const { error } = await supabase.from('skills').insert(row)
    if (error) console.error('addSkill:', error.message, row)
  },
  updateSkill: async (id, patch) => {
    set(st => ({ skills: st.skills.map(s => s.id === id ? { ...s, ...patch } : s) }))
    const s = get().skills.find(sk => sk.id === id)
    if (!s) return
    const row = {
      name: s.name, cat_id: s.catId || null, domain_id: s.domainId || null,
      tag: s.tag || '', priority: s.priority === true,
      confidence: Number(s.confidence) || 1,
      goal: s.goal ?? null,
    }
    const { error } = await supabase.from('skills').update(row).eq('id', id)
    if (error) console.error('updateSkill:', error.message)
  },
  deleteSkill: async (id) => {
    set(st => ({
      skills: st.skills.filter(s => s.id !== id),
      logs:   st.logs.filter(l => l.skill_id !== id),
    }))
    await supabase.from('skills').delete().eq('id', id)
    await supabase.from('practice_log').delete().eq('skill_id', id)
  },

  // ── Knowledge Cards ──────────────────────────
  loadCards: async () => {
    const [cardsRes, linksRes, entryLinksRes] = await Promise.all([
      supabase.from('knowledge_cards').select('*').order('updated_at', { ascending: false }),
      supabase.from('card_links').select('*'),
      supabase.from('entry_card_links').select('*'),
    ])
    if (cardsRes.error)     console.error('loadCards error:', cardsRes.error.message)
    if (linksRes.error)     console.error('loadCardLinks error:', linksRes.error.message)
    if (entryLinksRes.error)console.error('loadEntryLinks error:', entryLinksRes.error.message)
    console.log(`[Papatong] loadCards: ${(cardsRes.data??[]).length} cards, ${(linksRes.data??[]).length} links, ${(entryLinksRes.data??[]).length} entry-links`)
    const rawCards = (cardsRes.data ?? []) as KnowledgeCard[]
    const links = linksRes.data ?? []
    const entryLinks = entryLinksRes.data ?? []
    const cards = rawCards.map(c => ({
      ...c,
      skill_ids: c.skill_ids ?? [],
      parent_id: c.parent_id ?? null,
      linked_card_ids: links.filter((l: {from_id:string,to_id:string}) => l.from_id === c.id).map((l: {from_id:string,to_id:string}) => l.to_id),
      linked_entry_ids: entryLinks.filter((l: {entry_id:string,card_id:string}) => l.card_id === c.id).map((l: {entry_id:string,card_id:string}) => l.entry_id),
    }))
    set({ cards })
  },
  addCard: async (c) => {
    set(st => ({ cards: [c, ...st.cards] }))
    const { error } = await supabase.from('knowledge_cards').insert({
      id: c.id, title: c.title, body: c.body,
      skill_ids: c.skill_ids ?? [], parent_id: c.parent_id ?? null,
    })
    if (error) console.error('addCard:', error.message)
  },
  updateCard: async (id, patch) => {
    set(st => ({ cards: st.cards.map(c => c.id === id ? { ...c, ...patch, updated_at: new Date().toISOString() } : c) }))
    const c = get().cards.find(x => x.id === id)
    if (!c) return
    const { error } = await supabase.from('knowledge_cards').update({
      title: c.title, body: c.body,
      skill_ids: c.skill_ids ?? [], parent_id: c.parent_id ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) console.error('updateCard:', error.message)
  },
  deleteCard: async (id) => {
    set(st => ({ cards: st.cards.filter(c => c.id !== id) }))
    await supabase.from('knowledge_cards').delete().eq('id', id)
  },
  linkCards: async (fromId, toId) => {
    set(st => ({ cards: st.cards.map(c =>
      c.id === fromId ? { ...c, linked_card_ids: [...(c.linked_card_ids ?? []), toId] } : c
    )}))
    await supabase.from('card_links').insert({ from_id: fromId, to_id: toId })
  },
  unlinkCards: async (fromId, toId) => {
    set(st => ({ cards: st.cards.map(c =>
      c.id === fromId ? { ...c, linked_card_ids: (c.linked_card_ids ?? []).filter(x => x !== toId) } : c
    )}))
    await supabase.from('card_links').delete().eq('from_id', fromId).eq('to_id', toId)
  },
  linkEntryCard: async (entryId, cardId) => {
    set(st => ({ cards: st.cards.map(c =>
      c.id === cardId ? { ...c, linked_entry_ids: [...(c.linked_entry_ids ?? []), entryId] } : c
    )}))
    await supabase.from('entry_card_links').insert({ entry_id: entryId, card_id: cardId })
  },
  unlinkEntryCard: async (entryId, cardId) => {
    set(st => ({ cards: st.cards.map(c =>
      c.id === cardId ? { ...c, linked_entry_ids: (c.linked_entry_ids ?? []).filter(x => x !== entryId) } : c
    )}))
    await supabase.from('entry_card_links').delete().eq('entry_id', entryId).eq('card_id', cardId)
  },

  // ── Entries ──────────────────────────────────
  addEntry: async (e) => {
    set(st => ({ entries: [e, ...st.entries] }))
    const row = {
      id: e.id, practiced_at: e.practiced_at,
      skill_ids: e.skill_ids || [], spont_skills: e.spont_skills || [],
      note: e.note || '', title: e.title || '', tags: e.tags || [],
    }
    const { error } = await supabase.from('practice_entries').insert(row)
    if (error) console.error('addEntry:', error.message)
  },
  updateEntry: async (id, patch) => {
    set(st => ({ entries: st.entries.map(e => e.id === id ? { ...e, ...patch } : e) }))
    const e = get().entries.find(en => en.id === id)
    if (!e) return
    const { error } = await supabase.from('practice_entries').update({
      practiced_at:  e.practiced_at,
      note:          e.note || '',
      title:         e.title || '',
      tags:          e.tags || [],
      skill_ids:     e.skill_ids || [],
      spont_skills:  e.spont_skills || [],
    }).eq('id', id)
    if (error) console.error('updateEntry:', error.message)
  },
  deleteEntry: async (id) => {
    set(st => ({ entries: st.entries.filter(e => e.id !== id) }))
    await supabase.from('practice_entries').delete().eq('id', id)
  },
  logPractice: async (skillId) => {
    const entry: PracticeLog = {
      id: uid(), skill_id: skillId,
      practiced_at: new Date().toISOString(), done: true,
    }
    set(st => ({ logs: [entry, ...st.logs] }))
    await supabase.from('practice_log').insert(entry)
  },

  // ── Session ──────────────────────────────────
  setSessionActiveCats: (cats) => set({ sessionActiveCats: cats }),
  setSlots:  (catId, slots)  => set(s => ({ sessionSlots: { ...s.sessionSlots, [catId]: slots } })),
  setCount:  (catId, n)      => set(s => ({ sessionCounts: { ...s.sessionCounts, [catId]: n } })),
  setSpontSkills: (skills)   => set({ spontSkills: skills }),
  setLogNote:  (v) => set({ logNote: v }),
  setLogTitle: (v) => set({ logTitle: v }),
  setLogDate:  (v) => set({ logDate: v }),
  setLogTags:  (tags) => set({ logTags: tags }),
  resetSession: () => set(s => {
    const newSlots: Record<string, Slot[]> = {}
    s.categories.forEach(c => { newSlots[c.id] = makeSlots(s.sessionCounts[c.id] ?? 2) })
    return { sessionSlots: newSlots, spontSkills: [], logNote: '', logTitle: '', logDate: new Date().toISOString().slice(0, 10), logTags: [] }
  }),
}))
