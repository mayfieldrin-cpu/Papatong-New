'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { palColor } from '@/lib/palette'
import { BackBtn, Btn, Card, SectionTitle, Empty, Input, Textarea, Select } from '@/components/shared/ui'
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

interface Props { onBack: () => void }

export default function PracticeJournal({ onBack }: Props) {
  const { entries, categories, skills, updateEntry, deleteEntry } = useStore()
  const [sort, setSort] = useState<'newest'|'oldest'|'week'>('newest')
  const [weekOffset, setWeekOffset] = useState(0)
  const [subView, setSubView] = useState<'entries'|'tags'>('entries')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [openId, setOpenId] = useState<string|null>(null)
  const [editId, setEditId] = useState<string|null>(null)
  const [editNote, setEditNote] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')

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
              <div className="space-y-3">
                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Session title…" />
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-text-secondary">Date</span>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                    className="flex-1 bg-surface border border-border-default text-text-primary rounded px-2.5 py-1.5 text-[13px] focus:outline-none" />
                </div>
                <Textarea value={editNote} onChange={e => setEditNote(e.target.value)} style={{ minHeight: 200 }} />
                <div className="flex justify-end gap-2">
                  <Btn size="sm" onClick={() => setEditId(null)}>Cancel</Btn>
                  <Btn size="sm" variant="primary" onClick={async () => {
                    await updateEntry(openEntry.id, {
                      title: editTitle,
                      note: editNote,
                      practiced_at: new Date(editDate + 'T12:00:00').toISOString(),
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
                      className="text-[14px] leading-[1.8] text-text-primary"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(openEntry.note) }}
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
                <div className="flex justify-end gap-2 mt-6">
                  <Btn size="sm" onClick={() => {
                    setEditId(openEntry.id)
                    setEditNote(openEntry.note ?? '')
                    setEditTitle(openEntry.title ?? '')
                    setEditDate(toDateInput(openEntry.practiced_at))
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
