'use client'
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@/lib/store'
import { palColor } from '@/lib/palette'
import { sortedSuggestions, neglectScore, momentumScore } from '@/lib/algorithms'
import { Btn, Card, SectionTitle, Dot, ConfBadge, Input, Textarea, Empty } from '@/components/shared/ui'
import RichEditor from '@/components/shared/RichEditor'
import type { Slot, Skill } from '@/types'
import clsx from 'clsx'

function uid() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) }

function shuffleArr<T>(a: T[]): T[] {
  const arr = [...a]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function fillSlots(slots: Slot[], pool: Skill[]): Slot[] {
  const locked = new Set(slots.filter(s => s.locked && s.skillId).map(s => s.skillId))
  const avail = shuffleArr(pool.filter(s => !locked.has(s.id)))
  let pi = 0
  return slots.map(slot => {
    if (slot.locked) return slot
    return { skillId: avail[pi++]?.id ?? null, locked: false, fromSuggested: false }
  })
}

function makeSlots(n: number): Slot[] {
  return Array.from({ length: n }, () => ({ skillId: null, locked: false, fromSuggested: false }))
}

function resizeSlots(arr: Slot[], n: number): Slot[] {
  const copy = [...arr]
  while (copy.length < n) copy.push({ skillId: null, locked: false, fromSuggested: false })
  while (copy.length > n) {
    const i = copy.map((s, i) => ({ s, i })).filter(x => !x.s.locked).pop()?.i
    if (i !== undefined) copy.splice(i, 1)
    else copy.pop()
  }
  return copy
}

export default function SessionBuilder() {
  const {
    categories, skills, logs, entries,
    sessionActiveCats, sessionSlots, sessionCounts,
    spontSkills, logNote, logTitle, logDate, logTags,
    setSessionActiveCats, setSlots, setCount,
    setSpontSkills, setLogNote, setLogTitle, setLogDate, setLogTags,
    addEntry, logPractice, resetSession,
  } = useStore()

  const [spontInput, setSpontInput] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [shuffleOpen, setShuffleOpen] = useState(true)
  const [manualSearch, setManualSearch] = useState('')
  const [manualSelected, setManualSelected] = useState<string[]>([])

  // Ensure slots exist for all categories
  useEffect(() => {
    categories.forEach(c => {
      if (!sessionSlots[c.id]) setSlots(c.id, makeSlots(sessionCounts[c.id] ?? 2))
      if (!sessionCounts[c.id]) setCount(c.id, 2)
    })
  }, [categories])

  const activeCats = categories.filter(c => sessionActiveCats.has(c.id))
  const allSlotIds = new Set(
    activeCats.flatMap(c => (sessionSlots[c.id] ?? []).filter(s => s.skillId).map(s => s.skillId))
  )

  const allSuggestions = useMemo(() =>
    activeCats.flatMap(c =>
      sortedSuggestions(logs, skills, c.id).map(s => ({ skill: s, cat: c }))
    ), [activeCats, logs, skills])

  const shuffleSkillIds = activeCats.flatMap(c =>
    (sessionSlots[c.id] ?? []).filter(s => s.skillId).map(s => s.skillId!)
  )
  const allSkillIds = [...new Set([...shuffleSkillIds, ...manualSelected])]
  const hasSlots = allSkillIds.length > 0 || spontSkills.length > 0 || manualSelected.length > 0

  const existingTags = [...new Set(entries.flatMap(e => e.tags ?? []))]

  function shuffleAll() {
    activeCats.forEach(c => {
      const pool = skills.filter(s => s.catId === c.id)
      const n = sessionCounts[c.id] ?? 2
      setSlots(c.id, fillSlots(makeSlots(n), pool))
    })
  }

  function reshuffleCat(catId: string) {
    const pool = skills.filter(s => s.catId === catId)
    setSlots(catId, fillSlots(sessionSlots[catId] ?? [], pool))
  }

  function toggleCat(id: string) {
    const next = new Set(sessionActiveCats)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSessionActiveCats(next)
  }

  function toggleLock(catId: string, i: number) {
    const slots = [...(sessionSlots[catId] ?? [])]
    slots[i] = { ...slots[i], locked: !slots[i].locked, fromSuggested: slots[i].locked ? false : slots[i].fromSuggested }
    setSlots(catId, slots)
  }

  function clearSlot(catId: string, i: number) {
    const slots = [...(sessionSlots[catId] ?? [])]
    slots[i] = { skillId: null, locked: false, fromSuggested: false }
    setSlots(catId, slots)
  }

  function addSuggested(skillId: string, catId: string) {
    const slots = [...(sessionSlots[catId] ?? [])]
    if (slots.some(s => s.skillId === skillId)) return
    const empty = slots.findIndex(s => !s.skillId)
    if (empty >= 0) slots[empty] = { skillId, locked: true, fromSuggested: true }
    else slots.push({ skillId, locked: true, fromSuggested: true })
    setSlots(catId, slots)
  }

  function incCount(catId: string) {
    const n = (sessionCounts[catId] ?? 2) + 1
    if (n > 8) return
    setCount(catId, n)
    setSlots(catId, resizeSlots(sessionSlots[catId] ?? [], n))
  }

  function decCount(catId: string) {
    const n = (sessionCounts[catId] ?? 2) - 1
    if (n < 1) return
    setCount(catId, n)
    setSlots(catId, resizeSlots(sessionSlots[catId] ?? [], n))
  }

  function addSpont() {
    const val = spontInput.trim()
    if (!val || spontSkills.includes(val)) return
    setSpontSkills([...spontSkills, val])
    setSpontInput('')
  }

  function addTag() {
    const val = tagInput.trim().toLowerCase()
    if (!val || logTags.includes(val)) return
    setLogTags([...logTags, val])
    setTagInput('')
  }

  async function saveEntry() {
    setSaving(true)
    const date = logDate || new Date().toISOString().slice(0, 10)
    for (const id of allSkillIds) await logPractice(id)
    await addEntry({
      id: uid(),
      practiced_at: new Date(date + 'T12:00:00').toISOString(),
      skill_ids: allSkillIds,
      spont_skills: [...spontSkills],
      note: logNote,
      title: logTitle,
      tags: [...logTags],
    })
    resetSession()
    setManualSelected([])
    setManualSearch('')
    setSaving(false)
  }

  return (
    <div className="space-y-5">
      {/* Category picker */}
      <Card>
        <SectionTitle className="mb-3">Active categories</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {categories.map(c => {
            const p = palColor(c.color)
            const on = sessionActiveCats.has(c.id)
            return (
              <button
                key={c.id}
                onClick={() => toggleCat(c.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] border transition-all cursor-pointer font-sans"
                style={{
                  background: on ? p.bg : 'transparent',
                  color: on ? p.text : 'var(--tw-text-text-secondary, #9a9a94)',
                  borderColor: on ? p.dot : 'rgba(255,255,255,0.12)',
                }}
              >
                <Dot color={p.dot} size={5} />
                {c.name}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Shuffle section — collapseable */}
      <div className="border border-border-subtle rounded-lg overflow-hidden">
        <button
          onClick={() => setShuffleOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface2 transition-colors cursor-pointer border-none text-left"
        >
          <span className="text-[13px] font-medium text-text-primary">Shuffle</span>
          <span className="text-text-hint text-[12px]">{shuffleOpen ? '▲' : '▼'}</span>
        </button>

        {shuffleOpen && (
          <div className="p-4 pt-3 space-y-4 border-t border-border-subtle">

      {/* Suggestions */}
      {allSuggestions.length > 0 && (
        <div>
          <SectionTitle className="mb-2.5">Suggested</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {allSuggestions.map(({ skill, cat }) => {
              const p = palColor(cat.color)
              const used = allSlotIds.has(skill.id)
              const neglect = neglectScore(logs, skill)
              return (
                <button
                  key={skill.id}
                  onClick={() => !used && addSuggested(skill.id, cat.id)}
                  className={clsx(
                    'flex items-center gap-2 px-2.5 py-1.5 rounded border text-[12px] transition-all cursor-pointer font-sans',
                    used ? 'opacity-35 cursor-default border-border-subtle' : 'hover:opacity-80'
                  )}
                  style={{ borderColor: used ? undefined : p.dot, background: p.bg, color: p.text }}
                >
                  <Dot color={p.dot} size={4} />
                  {skill.name}
                  <ConfBadge level={skill.confidence} />
                  {neglect > 50 && (
                    <span className="font-mono text-[9px]" style={{ color: p.dot }}>
                      {neglect}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Manual skill picker */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-hint">Manual pick</span>
          <span className="text-[11px] text-text-hint">{manualSelected.length} selected</span>
        </div>
        <Input
          value={manualSearch}
          onChange={e => setManualSearch(e.target.value)}
          placeholder="Search skills…"
          className="mb-2.5"
        />
        {manualSearch.trim() ? (
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {skills
              .filter(s => s.name.toLowerCase().includes(manualSearch.toLowerCase()))
              .slice(0, 20)
              .map(s => {
                const cat = categories.find(c => c.id === s.catId)
                const p = cat ? palColor(cat.color) : null
                const sel = manualSelected.includes(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => setManualSelected(prev => sel ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer"
                    style={sel
                      ? { background: p?.dot ?? '#5a5a56', color: 'white', borderColor: 'transparent' }
                      : p ? { background: p.bg, color: p.text, borderColor: 'transparent' } : { background: '#242422', color: '#9a9a94', borderColor: 'transparent' }
                    }
                  >
                    {sel && <span className="text-[9px]">✓</span>}
                    {s.name}
                  </button>
                )
              })
            }
          </div>
        ) : manualSelected.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {manualSelected.map(id => {
              const s = skills.find(x => x.id === id)
              if (!s) return null
              const cat = categories.find(c => c.id === s.catId)
              const p = cat ? palColor(cat.color) : null
              return (
                <span key={id} className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full" style={p ? { background: p.bg, color: p.text } : { background: '#242422', color: '#9a9a94' }}>
                  {s.name}
                  <button onClick={() => setManualSelected(prev => prev.filter(x => x !== id))} className="border-none bg-transparent cursor-pointer opacity-60 hover:opacity-100 text-[10px]">✕</button>
                </span>
              )
            })}
          </div>
        ) : (
          <p className="text-[12px] text-text-hint italic">Search to add skills directly to the log.</p>
        )}
      </Card>

      {/* Shuffle toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShuffleOpen(v => !v)}
          className="flex items-center gap-2 text-[12px] text-text-secondary hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer font-sans"
        >
          <span>{shuffleOpen ? '▾' : '▸'}</span>
          <span>Shuffle</span>
        </button>
        {shuffleOpen && (
          <Btn onClick={shuffleAll} size="sm" disabled={activeCats.length === 0}>
            Shuffle all
          </Btn>
        )}
      </div>

      {/* Session columns — collapseable */}
      {shuffleOpen && (
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(activeCats.length, 1), 3)}, 1fr)` }}
      >
        {activeCats.map(c => {
          const p = palColor(c.color)
          const slots = sessionSlots[c.id] ?? []
          const count = sessionCounts[c.id] ?? 2
          return (
            <Card key={c.id}>
              <div className="flex items-center justify-between mb-3">
                <span
                  className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-[2px] rounded-full"
                  style={{ background: p.bg, color: p.text }}
                >
                  <Dot color={p.dot} size={4} />
                  {c.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => decCount(c.id)}
                    className="w-5 h-5 flex items-center justify-center rounded border border-border-default text-[13px] text-text-secondary hover:text-text-primary hover:bg-surface2 bg-bg transition-colors cursor-pointer"
                  >−</button>
                  <span className="font-mono text-[12px] min-w-[14px] text-center">{count}</span>
                  <button
                    onClick={() => incCount(c.id)}
                    className="w-5 h-5 flex items-center justify-center rounded border border-border-default text-[13px] text-text-secondary hover:text-text-primary hover:bg-surface2 bg-bg transition-colors cursor-pointer"
                  >+</button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 min-h-8">
                {slots.length === 0
                  ? <p className="text-[12px] text-text-hint italic py-1.5">Hit shuffle to fill</p>
                  : slots.map((slot, i) => {
                    const skill = slot.skillId ? skills.find(s => s.id === slot.skillId) : null
                    if (!skill) return (
                      <div key={i} className="flex items-center gap-2 bg-surface2 border border-border-subtle rounded px-2.5 py-1.5 text-[12px] text-text-hint italic">
                        empty
                      </div>
                    )
                    const neglect = neglectScore(logs, skill)
                    return (
                      <div
                        key={i}
                        className={clsx(
                          'flex items-center gap-2 bg-surface2 rounded px-2.5 py-1.5 text-[12px] border transition-colors',
                          slot.fromSuggested ? 'border-amber/40' : slot.locked ? 'border-border-strong' : 'border-border-subtle'
                        )}
                      >
                        <span className="flex-1 truncate">{skill.name}</span>
                        {neglect > 60 && (
                          <span className="font-mono text-[9px] text-amber">●</span>
                        )}
                        <button
                          onClick={() => toggleLock(c.id, i)}
                          className={clsx('text-[11px] border-none bg-transparent cursor-pointer transition-colors', slot.locked ? 'text-text-primary' : 'text-text-hint hover:text-text-primary')}
                        >{slot.locked ? '⚑' : '⚐'}</button>
                        <button
                          onClick={() => clearSlot(c.id, i)}
                          className="text-[11px] text-text-hint hover:text-red border-none bg-transparent cursor-pointer transition-colors"
                        >✕</button>
                      </div>
                    )
                  })
                }
              </div>
              <button
                onClick={() => reshuffleCat(c.id)}
                disabled={skills.filter(s => s.catId === c.id).length === 0}
                className="w-full mt-2 py-1 text-[11px] text-text-hint hover:text-text-primary border border-border-subtle hover:border-border-default rounded transition-colors bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Reshuffle
              </button>
            </Card>
          )
        })}
      </div>
      )}

          </div>
        )}
      </div>

      {/* Manual skill picker */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-medium">Manual pick</span>
          <span className="text-[11px] text-text-hint">{manualSelected.length} selected</span>
        </div>
        {manualSelected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {manualSelected.map(id => {
              const s = skills.find(x => x.id === id)
              const cat = s ? categories.find(c => c.id === s.catId) : null
              const p = cat ? palColor(cat.color) : null
              return s ? (
                <span key={id} className="flex items-center gap-1 text-[11px] px-2 py-[2px] rounded-full" style={p ? { background: p.bg, color: p.text } : { background: '#242422', color: '#9a9a94' }}>
                  {s.name}
                  <button onClick={() => setManualSelected(prev => prev.filter(x => x !== id))} className="border-none bg-transparent cursor-pointer opacity-60 hover:opacity-100 text-[10px] leading-none">✕</button>
                </span>
              ) : null
            })}
            <button onClick={() => setManualSelected([])} className="text-[11px] text-text-hint hover:text-red bg-transparent border-none cursor-pointer px-1">Clear all</button>
          </div>
        )}
        <Input
          value={manualSearch}
          onChange={e => setManualSearch(e.target.value)}
          placeholder="Search skills…"
        />
        {manualSearch.trim() && (
          <div className="mt-2 flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {skills
              .filter(s => s.name.toLowerCase().includes(manualSearch.toLowerCase()) && !manualSelected.includes(s.id))
              .slice(0, 20)
              .map(s => {
                const cat = categories.find(c => c.id === s.catId)
                const p = cat ? palColor(cat.color) : null
                return (
                  <button
                    key={s.id}
                    onClick={() => { setManualSelected(prev => [...prev, s.id]); setManualSearch('') }}
                    className="text-[11px] px-2.5 py-1 rounded-full cursor-pointer border-none transition-opacity hover:opacity-80"
                    style={p ? { background: p.bg, color: p.text } : { background: '#242422', color: '#9a9a94' }}
                  >
                    {s.name}
                  </button>
                )
              })
            }
            {skills.filter(s => s.name.toLowerCase().includes(manualSearch.toLowerCase()) && !manualSelected.includes(s.id)).length === 0 && (
              <p className="text-[12px] text-text-hint italic">No matching skills</p>
            )}
          </div>
        )}
      </Card>

      {/* Spontaneous */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-text-secondary">Spontaneous additions</span>
          <span className="text-[11px] text-text-hint">not saved to library</span>
        </div>
        <div className="flex gap-2">
          <Input
            value={spontInput}
            onChange={e => setSpontInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSpont()}
            placeholder="e.g. try cross-hatching…"
            className="flex-1"
          />
          <Btn size="sm" onClick={addSpont}>Add</Btn>
        </div>
        {spontSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {spontSkills.map((s, i) => (
              <span key={i} className="flex items-center gap-1.5 bg-surface2 border border-border-default rounded-full px-2.5 py-0.5 text-[12px]">
                {s}
                <button
                  onClick={() => setSpontSkills(spontSkills.filter((_, j) => j !== i))}
                  className="text-text-hint hover:text-red text-[11px] border-none bg-transparent cursor-pointer"
                >✕</button>
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Log form */}
      <Card>
        <SectionTitle className="mb-3">Log this practice</SectionTitle>

        {/* Skill pills preview */}
        {hasSlots ? (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {allSkillIds.map(id => {
              const skill = skills.find(x => x.id === id)
              if (!skill) return null
              const cat = categories.find(c => c.id === skill.catId)
              const p = cat ? palColor(cat.color) : null
              return (
                <span key={id} className="text-[11px] px-2 py-[2px] rounded-full" style={p ? { background: p.bg, color: p.text } : { background: '#242422', color: '#9a9a94' }}>
                  {skill.name}
                </span>
              )
            })}
            {spontSkills.map((s, i) => (
              <span key={i} className="text-[11px] px-2 py-[2px] rounded-full bg-surface2 text-text-secondary italic">{s}</span>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-text-hint mb-3">Shuffle or add skills above first.</p>
        )}

        {/* Date */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[12px] text-text-secondary whitespace-nowrap">Date</span>
          <input
            type="date"
            value={logDate}
            onChange={e => setLogDate(e.target.value)}
            className="flex-1 bg-surface border border-border-default text-text-primary rounded px-2.5 py-1.5 text-[13px] focus:border-border-strong focus:outline-none"
          />
        </div>

        {/* Title */}
        <Input
          value={logTitle}
          onChange={e => setLogTitle(e.target.value)}
          placeholder="Session title…"
          className="mb-2.5"
        />

        {/* Note */}
        <RichEditor
          content={logNote}
          onChange={setLogNote}
          placeholder="What did you try? · What surprised you? · What would you do differently?"
          minHeight={160}
          className="mb-0"
        />

        {/* Tags */}
        <div className="mt-3">
          <p className="text-[11px] text-text-secondary mb-1.5">Tags</p>
          {logTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {logTags.map((t, i) => (
                <span key={i} className="flex items-center gap-1 bg-surface2 border border-border-default rounded-full px-2.5 py-0.5 text-[11px]">
                  {t}
                  <button onClick={() => setLogTags(logTags.filter((_, j) => j !== i))} className="text-text-hint hover:text-red border-none bg-transparent cursor-pointer text-[11px]">✕</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag()}
              placeholder="Add a tag…"
              className="flex-1"
            />
            <Btn size="sm" onClick={addTag}>Add</Btn>
          </div>
          {existingTags.filter(t => !logTags.includes(t)).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {existingTags.filter(t => !logTags.includes(t)).slice(0, 8).map(t => (
                <button
                  key={t}
                  onClick={() => setLogTags([...logTags, t])}
                  className="px-2 py-[2px] text-[11px] rounded-full border border-border-subtle text-text-hint hover:text-text-primary hover:border-border-default bg-transparent cursor-pointer transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Btn size="sm" onClick={resetSession}>Clear</Btn>
          <Btn size="sm" variant="primary" onClick={saveEntry} disabled={!hasSlots || saving}>
            {saving ? 'Saving…' : 'Save to record'}
          </Btn>
        </div>
      </Card>
    </div>
  )
}
