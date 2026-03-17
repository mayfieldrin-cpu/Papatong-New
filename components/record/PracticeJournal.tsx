'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { palColor } from '@/lib/palette'
import { BackBtn, Btn, Card, SectionTitle, Empty, Input, Textarea, Select } from '@/components/shared/ui'
import RichEditor from '@/components/shared/RichEditor'
import type { PracticeEntry } from '@/types'
import clsx from 'clsx'

function renderMarkdown(text: string): string {
  if (!text) return ''
  const lines = text.split('\n')
  let html = '', inUl = false, inOl = false
  lines.forEach(line => {
    const ul = line.match(/^(\s*)[-*]\s+(.*)/)
    const ol = line.match(/^(\s*)\d+\.\s+(.*)/)
    if (ul) {
      if (inOl) { html += '</ol>'; inOl = false }
      if (!inUl) { html += '<ul style="padding-left:1.25rem;margin-bottom:.5rem">'; inUl = true }
      html += `<li>${ul[2]}</li>`
    } else if (ol) {
      if (inUl) { html += '</ul>'; inUl = false }
      if (!inOl) { html += '<ol style="padding-left:1.25rem;margin-bottom:.5rem">'; inOl = true }
      html += `<li>${ol[2]}</li>`
    } else {
      if (inUl) { html += '</ul>'; inUl = false }
      if (inOl) { html += '</ol>'; inOl = false }
      if (!line.trim()) html += '<p style="margin:.3rem 0"></p>'
      else html += `<p style="margin-bottom:.5rem">${line}</p>`
    }
  })
  if (inUl) html += '</ul>'
  if (inOl) html += '</ol>'
  return html
}

function toDateInput(iso: string) {
  return new Date(iso).toISOString().slice(0, 10)
}

function formatFull(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

function startOfWeek(iso: string) {
  const d = new Date(iso); d.setHours(0,0,0,0); d.setDate(d.getDate()-d.getDay())
  return d.toISOString().slice(0,10)
}

function weekLabel(iso: string) {
  const d = new Date(iso), e = new Date(d); e.setDate(d.getDate()+6)
  const f = (x: Date) => x.toLocaleDateString('en-US',{month:'short',day:'numeric'})
  return `${f(d)} – ${f(e)}`
}

interface Props { onBack: () => void; onNavigateToCard?: (cardId: string) => void }

export default function PracticeJournal({ onBack, onNavigateToCard }: Props) {
  const { entries, categories, skills, cards, updateEntry, deleteEntry } = useStore()
  const [sort, setSort] = useState<'newest'|'oldest'|'week'>('newest')
  const [weekOffset, setWeekOffset] = useState(0)
  const [subView, setSubView] = useState<'entries'|'tags'>('entries')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [openId, setOpenId] = useState<string|null>(null)
  const [editId, setEditId] = useState<string|null>(null)
  const [editNote, setEditNote] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editSkillIds, setEditSkillIds] = useState<string[]>([])
  const [editSpontSkills, setEditSpontSkills] = useState<string[]>([])
  const [editTags, setEditTags] = useState<string[]>([])
  const [editTagInput, setEditTagInput] = useState('')
  const [skillSearch, setSkillSearch] = useState('')

  const openEntry = openId ? entries.find(e => e.id === openId) : null
  const allTags = [...new Set(entries.flatMap(e => e.tags ?? []))]

  const sorted = [...entries].sort((a, b) =>
    sort === 'oldest'
      ? new Date(a.practiced_at).getTime() - new Date(b.practiced_at).getTime()
      : new Date(b.practiced_at).getTime() - new Date(a.practiced_at).getTime()
  )

  function getWeekEntries() {
    const today = new Date(); today.setHours(0,0,0,0)
    const ws = new Date(today); ws.setDate(today.getDate() - today.getDay() + weekOffset * 7)
    const we = new Date(ws); we.setDate(ws.getDate() + 6)
    const wsStr = ws.toISOString().slice(0,10), weStr = we.toISOString().slice(0,10)
    return { entries: sorted.filter(e => { const d = e.practiced_at.slice(0,10); return d >= wsStr && d <= weStr }), label: weekLabel(wsStr) }
  }

  function SkillPills({ entry }: { entry: PracticeEntry }) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {(entry.skill_ids ?? []).map(id => {
          const s = skills.find(x => x.id === id)
          if (!s) return null
          const cat = categories.find(c => c.id === s.catId)
          const p = cat ? palColor(cat.color) : null
          return (
            <span key={id} className="text-[11px] px-2 py-[2px] rounded-full" style={p ? { background: p.bg, color: p.text } : { background: '#242422', color: '#9a9a94' }}>
              {s.name}
            </span>
          )
        })}
        {(entry.spont_skills ?? []).map((n, i) => (
          <span key={i} className="text-[11px] px-2 py-[2px] rounded-full bg-surface2 text-text-secondary italic">{n}</span>
        ))}
      </div>
    )
  }

  function EntryCard({ e }: { e: PracticeEntry }) {
    const snippet = (e.note ?? '').replace(/[-*]\s+/g, '').replace(/\d+\.\s+/g, '').replace(/\n/g, ' ').trim().slice(0, 80)
    return (
      <div
        className="bg-surface border border-border-subtle rounded-lg p-3.5 mb-2 cursor-pointer hover:border-border-default transition-colors fade-up"
        onClick={() => { setOpenId(e.id); setEditId(null) }}
      >
        <div className="flex items-start justify-between mb-1.5">
          <span className={clsx('text-[13px] font-medium flex-1 mr-2', !e.title && 'text-text-hint italic font-normal')}>
            {e.title || 'Untitled session'}
          </span>
          <span className="font-mono text-[10px] text-text-hint whitespace-nowrap flex-shrink-0">{formatFull(e.practiced_at)}</span>
        </div>
        <SkillPills entry={e} />
        {snippet && (
          <p className="text-[12px] text-text-secondary mt-1.5 leading-relaxed truncate">
            {snippet}{(e.note ?? '').length > 80 ? '…' : ''}
          </p>
        )}
        {(e.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {(e.tags ?? []).map(t => (
              <span key={t} className="text-[10px] bg-surface2 text-text-hint px-2 py-[1px] rounded-full">{t}</span>
            ))}
          </div>
        )}
        {(() => {
          const linkedCount = cards.filter(c => (c.linked_entry_ids ?? []).includes(e.id)).length
          if (!linkedCount) return null
          return (
            <p className="font-mono text-[10px] text-text-hint mt-1.5">
              {linkedCount} knowledge card{linkedCount !== 1 ? 's' : ''}
            </p>
          )
        })()}
      </div>
    )
  }

  return (
    <div>
      {/* Entry detail slide-in */}
      <div className={clsx('slide-page', openEntry && 'open')} style={{ zIndex: 60 }}>
        {openEntry && (
          <div className="max-w-[640px] mx-auto px-5 pt-8 pb-20">
            <BackBtn onClick={() => { setOpenId(null); setEditId(null) }} />
            {editId === openEntry.id ? (
              <div className="space-y-4">
                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Session title…" />

                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-text-secondary whitespace-nowrap">Date</span>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                    className="flex-1 bg-surface border border-border-default text-text-primary rounded px-2.5 py-1.5 text-[13px] focus:outline-none" />
                </div>

                {/* Skills */}
                <div>
                  <p className="text-[11px] font-medium text-text-secondary mb-2 tracking-wide uppercase">Skills</p>
                  {/* Current skill pills */}
                  <div className="flex flex-wrap gap-1.5 mb-2 min-h-[24px]">
                    {editSkillIds.map(id => {
                      const s = skills.find(x => x.id === id)
                      if (!s) return null
                      const cat = categories.find(c => c.id === s.catId)
                      const p = cat ? palColor(cat.color) : null
                      return (
                        <span key={id} className="flex items-center gap-1 text-[11px] px-2 py-[2px] rounded-full" style={p ? { background: p.bg, color: p.text } : { background: '#242422', color: '#9a9a94' }}>
                          {s.name}
                          <button onClick={() => setEditSkillIds(prev => prev.filter(x => x !== id))} className="border-none bg-transparent cursor-pointer opacity-60 hover:opacity-100 text-[10px] leading-none">✕</button>
                        </span>
                      )
                    })}
                    {editSpontSkills.map((n, i) => (
                      <span key={i} className="flex items-center gap-1 text-[11px] px-2 py-[2px] rounded-full bg-surface2 text-text-secondary italic">
                        {n}
                        <button onClick={() => setEditSpontSkills(prev => prev.filter((_, j) => j !== i))} className="border-none bg-transparent cursor-pointer opacity-60 hover:opacity-100 text-[10px] leading-none">✕</button>
                      </span>
                    ))}
                  </div>
                  {/* Skill search to add */}
                  <Input
                    value={skillSearch}
                    onChange={e => setSkillSearch(e.target.value)}
                    placeholder="Search skills to add…"
                  />
                  {skillSearch.trim() && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {skills
                        .filter(s => s.name.toLowerCase().includes(skillSearch.toLowerCase()) && !editSkillIds.includes(s.id))
                        .slice(0, 12)
                        .map(s => {
                          const cat = categories.find(c => c.id === s.catId)
                          const p = cat ? palColor(cat.color) : null
                          return (
                            <button
                              key={s.id}
                              onClick={() => { setEditSkillIds(prev => [...prev, s.id]); setSkillSearch('') }}
                              className="text-[11px] px-2 py-[2px] rounded-full cursor-pointer border-none transition-opacity hover:opacity-80"
                              style={p ? { background: p.bg, color: p.text } : { background: '#242422', color: '#9a9a94' }}
                            >
                              {s.name}
                            </button>
                          )
                        })
                      }
                    </div>
                  )}
                </div>

                {/* Note */}
                <Textarea value={editNote} onChange={e => setEditNote(e.target.value)} style={{ minHeight: 160 }} />

                {/* Tags */}
                <div>
                  <p className="text-[11px] font-medium text-text-secondary mb-2 tracking-wide uppercase">Tags</p>
                  <div className="flex flex-wrap gap-1.5 mb-2 min-h-[24px]">
                    {editTags.map((t, i) => (
                      <span key={i} className="flex items-center gap-1 bg-surface2 border border-border-default rounded-full px-2.5 py-0.5 text-[11px]">
                        {t}
                        <button onClick={() => setEditTags(prev => prev.filter((_, j) => j !== i))} className="text-text-hint hover:text-red border-none bg-transparent cursor-pointer text-[10px] leading-none">✕</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={editTagInput}
                      onChange={e => setEditTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const v = editTagInput.trim().toLowerCase()
                          if (v && !editTags.includes(v)) setEditTags(prev => [...prev, v])
                          setEditTagInput('')
                        }
                      }}
                      placeholder="Add a tag…"
                      className="flex-1"
                    />
                    <Btn size="sm" onClick={() => {
                      const v = editTagInput.trim().toLowerCase()
                      if (v && !editTags.includes(v)) setEditTags(prev => [...prev, v])
                      setEditTagInput('')
                    }}>Add</Btn>
                  </div>
                  {/* Suggest existing tags */}
                  {allTags.filter(t => !editTags.includes(t)).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {allTags.filter(t => !editTags.includes(t)).slice(0, 8).map(t => (
                        <button
                          key={t}
                          onClick={() => setEditTags(prev => [...prev, t])}
                          className="px-2 py-[2px] text-[11px] rounded-full border border-border-subtle text-text-hint hover:text-text-primary hover:border-border-default bg-transparent cursor-pointer transition-colors"
                        >{t}</button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Btn size="sm" onClick={() => setEditId(null)}>Cancel</Btn>
                  <Btn size="sm" variant="primary" onClick={async () => {
                    await updateEntry(openEntry.id, {
                      title: editTitle,
                      note: editNote,
                      practiced_at: new Date(editDate + 'T12:00:00').toISOString(),
                      skill_ids: editSkillIds,
                      spont_skills: editSpontSkills,
                      tags: editTags,
                    })
                    setEditId(null)
                  }}>Save</Btn>
                </div>
              </div>
            ) : (
              <div>
                <h1 className={clsx('text-[20px] font-medium mb-1 leading-snug', !openEntry.title && 'text-text-hint italic font-normal')}>
                  {openEntry.title || 'Untitled session'}
                </h1>
                <p className="font-mono text-[11px] text-text-hint mb-4">{formatFull(openEntry.practiced_at)}</p>
                <SkillPills entry={openEntry} />
                {openEntry.note && (
                  <>
                    <div className="h-px bg-border-subtle my-5" />
                    <div
                      className="text-[14px] leading-[1.8] text-text-primary tiptap-editor"
                      dangerouslySetInnerHTML={{ __html: openEntry.note }}
                    />
                  </>
                )}
                {(openEntry.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-6 pt-5 border-t border-border-subtle">
                    {openEntry.tags.map(t => (
                      <span key={t} className="text-[11px] bg-surface2 text-text-secondary px-2.5 py-1 rounded-full">{t}</span>
                    ))}
                  </div>
                )}

                {/* Linked knowledge cards */}
                {(() => {
                  const linkedCards = cards.filter(c => (c.linked_entry_ids ?? []).includes(openEntry.id))
                  if (!linkedCards.length) return null
                  return (
                    <div className="mt-6 pt-5 border-t border-border-subtle">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-text-hint mb-2.5">Knowledge cards</p>
                      <div className="flex flex-col gap-1.5">
                        {linkedCards.map(c => (
                          <button
                            key={c.id}
                            onClick={() => onNavigateToCard?.(c.id)}
                            className="flex items-center gap-3 bg-surface2 border border-border-subtle rounded-lg px-3 py-2.5 text-left hover:border-border-default transition-colors cursor-pointer w-full group"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-text-primary truncate">{c.title}</p>
                              {c.body && (
                                <p className="text-[11px] text-text-secondary truncate mt-0.5">
                                  {c.body.replace(/<[^>]+>/g, '').slice(0, 60)}
                                </p>
                              )}
                            </div>
                            <span className="text-text-hint group-hover:text-text-secondary text-[13px] flex-shrink-0 transition-colors">→</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                <div className="flex justify-end gap-2 mt-6">
                  <Btn size="sm" onClick={() => {
                    setEditId(openEntry.id)
                    setEditNote(openEntry.note ?? '')
                    setEditTitle(openEntry.title ?? '')
                    setEditDate(toDateInput(openEntry.practiced_at))
                    setEditSkillIds([...(openEntry.skill_ids ?? [])])
                    setEditSpontSkills([...(openEntry.spont_skills ?? [])])
                    setEditTags([...(openEntry.tags ?? [])])
                    setEditTagInput('')
                    setSkillSearch('')
                  }}>Edit</Btn>
                  <Btn size="sm" variant="danger" onClick={async () => {
                    await deleteEntry(openEntry.id)
                    setOpenId(null)
                  }} style={{ color: '#E24B4A', borderColor: '#E24B4A' }}>Delete</Btn>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Journal header */}
      <BackBtn onClick={onBack} label="Journals" />
      <div className="flex items-center justify-between mb-4">
        <SectionTitle>{entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}</SectionTitle>
        <Select value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="week">By week</option>
        </Select>
      </div>

      {/* Sub tabs */}
      <div className="flex gap-1.5 mb-5">
        {(['entries', 'tags'] as const).map(v => (
          <button
            key={v}
            onClick={() => setSubView(v)}
            className={clsx(
              'px-3 py-1 text-[12px] rounded-full border transition-all cursor-pointer font-sans',
              subView === v
                ? 'bg-text-primary text-bg border-text-primary'
                : 'bg-transparent text-text-secondary border-border-subtle hover:text-text-primary hover:border-border-default'
            )}
          >
            {v === 'entries' ? 'Entries' : 'Filter by tags'}
          </button>
        ))}
      </div>

      {entries.length === 0 && <Empty>No practice entries yet.<br/>Complete a session and save it.</Empty>}

      {/* Tag filter */}
      {subView === 'tags' && (
        <div>
          {allTags.length === 0
            ? <Empty>No tags yet.</Empty>
            : <>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {allTags.map(t => (
                  <button
                    key={t}
                    onClick={() => setTagFilter(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                    className={clsx(
                      'px-3 py-1 text-[12px] rounded-full border transition-all cursor-pointer font-sans',
                      tagFilter.includes(t)
                        ? 'bg-text-primary text-bg border-text-primary'
                        : 'bg-transparent text-text-secondary border-border-default hover:text-text-primary'
                    )}
                  >{t}</button>
                ))}
              </div>
              {tagFilter.length > 0 && (
                entries.filter(e => (e.tags ?? []).some(t => tagFilter.includes(t))).length === 0
                  ? <Empty>No entries with these tags.</Empty>
                  : entries.filter(e => (e.tags ?? []).some(t => tagFilter.includes(t))).map(e => <EntryCard key={e.id} e={e} />)
              )}
            </>
          }
        </div>
      )}

      {/* Entries list */}
      {subView === 'entries' && entries.length > 0 && (
        sort === 'week' ? (() => {
          const { entries: weekEnts, label } = getWeekEntries()
          return (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setWeekOffset(n => n - 1)} className="px-2.5 py-1 text-[13px] border border-border-default rounded hover:bg-surface2 bg-transparent text-text-primary cursor-pointer">←</button>
                <span className="flex-1 text-center font-mono text-[12px] font-medium">{label}</span>
                <button onClick={() => weekOffset < 0 && setWeekOffset(n => n + 1)} disabled={weekOffset >= 0} className="px-2.5 py-1 text-[13px] border border-border-default rounded hover:bg-surface2 bg-transparent text-text-primary cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">→</button>
              </div>
              {weekEnts.length === 0 ? <Empty>No entries this week.</Empty> : weekEnts.map(e => <EntryCard key={e.id} e={e} />)}
            </div>
          )
        })()
        : sorted.map(e => <EntryCard key={e.id} e={e} />)
      )}
    </div>
  )
}
