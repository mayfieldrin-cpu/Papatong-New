'use client'
import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { palColor, confInfo } from '@/lib/palette'
import { BackBtn, Btn, Input, Textarea, SectionTitle } from '@/components/shared/ui'
import RichEditor from '@/components/shared/RichEditor'
import type { KnowledgeCard } from '@/types'
import clsx from 'clsx'

function renderMarkdown(text: string): string {
  if (!text) return ''
  const lines = text.split('\n')
  let html = '', inUl = false, inOl = false
  lines.forEach(line => {
    const h = line.match(/^(#{1,3})\s+(.*)/)
    const ul = line.match(/^(\s*)[-*]\s+(.*)/)
    const ol = line.match(/^(\s*)\d+\.\s+(.*)/)
    if (h) {
      if (inUl) { html += '</ul>'; inUl = false }
      if (inOl) { html += '</ol>'; inOl = false }
      const size = h[1].length === 1 ? '16px' : h[1].length === 2 ? '14px' : '13px'
      const weight = h[1].length === 1 ? '600' : '500'
      html += `<p style="font-size:${size};font-weight:${weight};margin-bottom:.5rem;margin-top:1rem">${h[2]}</p>`
    } else if (ul) {
      if (inOl) { html += '</ol>'; inOl = false }
      if (!inUl) { html += '<ul style="padding-left:1.25rem;margin-bottom:.5rem">'; inUl = true }
      html += `<li style="margin-bottom:.2rem">${ul[2]}</li>`
    } else if (ol) {
      if (inUl) { html += '</ul>'; inUl = false }
      if (!inOl) { html += '<ol style="padding-left:1.25rem;margin-bottom:.5rem">'; inOl = true }
      html += `<li style="margin-bottom:.2rem">${ol[2]}</li>`
    } else {
      if (inUl) { html += '</ul>'; inUl = false }
      if (inOl) { html += '</ol>'; inOl = false }
      if (!line.trim()) html += '<p style="margin:.4rem 0"></p>'
      else html += `<p style="margin-bottom:.4rem">${line}</p>`
    }
  })
  if (inUl) html += '</ul>'
  if (inOl) html += '</ol>'
  return html
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface Props {
  card: KnowledgeCard
  onBack: () => void
  onNavigate: (id: string) => void
}

export default function KnowledgeCardDetail({ card, onBack, onNavigate }: Props) {
  const { cards, skills, categories, entries, updateCard, deleteCard, linkCards, unlinkCards, linkEntryCard, unlinkEntryCard } = useStore()

  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(card.title)
  const [editBody, setEditBody] = useState(card.body)
  const [editSkillIds, setEditSkillIds] = useState<string[]>(card.skill_ids ?? [])
  const [editParentId, setEditParentId] = useState<string>(card.parent_id ?? '')
  const [skillSearch, setSkillSearch] = useState('')
  const [cardSearch, setCardSearch] = useState('')
  const [entrySearch, setEntrySearch] = useState('')
  const [showLinkCard, setShowLinkCard] = useState(false)
  const [showLinkEntry, setShowLinkEntry] = useState(false)

  // Sync when card changes (navigation)
  useEffect(() => {
    setEditTitle(card.title)
    setEditBody(card.body)
    setEditSkillIds(card.skill_ids ?? [])
    setEditParentId(card.parent_id ?? '')
    setEditing(false)
    setShowLinkCard(false)
    setShowLinkEntry(false)
  }, [card.id])

  const linkedCards = (card.linked_card_ids ?? []).map(id => cards.find(c => c.id === id)).filter(Boolean) as KnowledgeCard[]
  const linkedEntries = (card.linked_entry_ids ?? []).map(id => entries.find(e => e.id === id)).filter(Boolean) as typeof entries
  const parentCard = card.parent_id ? cards.find(c => c.id === card.parent_id) : null
  const childCards = cards.filter(c => c.parent_id === card.id)

  const availableCards = cards.filter(c =>
    c.id !== card.id &&
    !(card.linked_card_ids ?? []).includes(c.id) &&
    (cardSearch ? c.title.toLowerCase().includes(cardSearch.toLowerCase()) : true)
  )

  const availableEntries = entries.filter(e =>
    !(card.linked_entry_ids ?? []).includes(e.id) &&
    (entrySearch ? (e.title || '').toLowerCase().includes(entrySearch.toLowerCase()) : true)
  ).slice(0, 10)

  async function save() {
    await updateCard(card.id, {
      title: editTitle.trim() || card.title,
      body: editBody,
      skill_ids: editSkillIds,
      parent_id: editParentId || null,
    })
    setEditing(false)
  }

  function SkillTag({ skillId }: { skillId: string }) {
    const s = skills.find(x => x.id === skillId)
    if (!s) return null
    const cat = categories.find(c => c.id === s.catId)
    const p = cat ? palColor(cat.color) : null
    return (
      <span className="text-[11px] font-medium px-2 py-[2px] rounded-full" style={p ? { background: p.bg, color: p.text } : { background: '#242422', color: '#9a9a94' }}>
        {s.name}
      </span>
    )
  }

  return (
    <div>
      <BackBtn onClick={onBack} label="Knowledge" />

      {editing ? (
        /* ── Edit mode ── */
        <div className="space-y-4">
          <Input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="Card title…"
            className="text-[16px] font-medium"
          />

          {/* Parent card */}
          <div>
            <label className="block text-[11px] font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Parent card</label>
            <select
              value={editParentId}
              onChange={e => setEditParentId(e.target.value)}
              className="w-full bg-surface border border-border-default text-text-primary rounded px-2.5 py-[7px] text-[13px] focus:outline-none"
            >
              <option value="">— no parent —</option>
              {cards.filter(c => c.id !== card.id).map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          {/* Skill tags */}
          <div>
            <label className="block text-[11px] font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Skill tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[24px]">
              {editSkillIds.map(id => {
                const s = skills.find(x => x.id === id)
                const cat = s ? categories.find(c => c.id === s.catId) : null
                const p = cat ? palColor(cat.color) : null
                return s ? (
                  <span key={id} className="flex items-center gap-1 text-[11px] px-2 py-[2px] rounded-full" style={p ? { background: p.bg, color: p.text } : { background: '#242422', color: '#9a9a94' }}>
                    {s.name}
                    <button onClick={() => setEditSkillIds(prev => prev.filter(x => x !== id))} className="border-none bg-transparent cursor-pointer opacity-60 hover:opacity-100 text-[10px]">✕</button>
                  </span>
                ) : null
              })}
            </div>
            <Input
              value={skillSearch}
              onChange={e => setSkillSearch(e.target.value)}
              placeholder="Search skills to tag…"
            />
            {skillSearch && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {skills.filter(s => s.name.toLowerCase().includes(skillSearch.toLowerCase()) && !editSkillIds.includes(s.id)).slice(0, 10).map(s => {
                  const cat = categories.find(c => c.id === s.catId)
                  const p = cat ? palColor(cat.color) : null
                  return (
                    <button key={s.id} onClick={() => { setEditSkillIds(prev => [...prev, s.id]); setSkillSearch('') }}
                      className="text-[11px] px-2 py-[2px] rounded-full cursor-pointer border-none hover:opacity-80"
                      style={p ? { background: p.bg, color: p.text } : { background: '#242422', color: '#9a9a94' }}>
                      {s.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Body */}
          <div>
            <label className="block text-[11px] font-medium text-text-secondary mb-1.5 uppercase tracking-wide">Body</label>
            <RichEditor
              content={editBody}
              onChange={setEditBody}
              placeholder="Write your notes, steps, tips… Use # for headings, - for bullets"
              minHeight={240}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Btn size="sm" onClick={() => setEditing(false)}>Cancel</Btn>
            <Btn size="sm" variant="primary" onClick={save}>Save</Btn>
          </div>
        </div>
      ) : (
        /* ── View mode ── */
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <h1 className="text-[20px] font-medium leading-snug flex-1">{card.title}</h1>
            <div className="flex gap-1 flex-shrink-0">
              <Btn size="sm" onClick={() => setEditing(true)}>Edit</Btn>
              <Btn size="sm" variant="danger" onClick={async () => { await deleteCard(card.id); onBack() }}
                style={{ color: '#E24B4A', borderColor: '#E24B4A' }}>Delete</Btn>
            </div>
          </div>

          {/* Meta */}
          <p className="font-mono text-[10px] text-text-hint mb-3">
            {card.updated_at ? `Updated ${formatDate(card.updated_at)}` : card.created_at ? `Created ${formatDate(card.created_at)}` : ''}
          </p>

          {/* Parent */}
          {parentCard && (
            <div className="mb-3">
              <span className="text-[11px] text-text-hint mr-1.5">Parent:</span>
              <button onClick={() => onNavigate(parentCard.id)}
                className="text-[11px] text-text-secondary hover:text-text-primary underline underline-offset-2 bg-transparent border-none cursor-pointer">
                ↑ {parentCard.title}
              </button>
            </div>
          )}

          {/* Skill tags */}
          {(card.skill_ids ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {(card.skill_ids ?? []).map(id => <SkillTag key={id} skillId={id} />)}
            </div>
          )}

          {/* Body */}
          {card.body ? (
            <>
              <div className="h-px bg-border-subtle mb-4" />
              <div
                className="text-[14px] leading-[1.8] text-text-primary tiptap-editor"
                dangerouslySetInnerHTML={{ __html: card.body }}
              />
            </>
          ) : (
            <p className="text-[13px] text-text-hint italic mb-4">No body yet. Tap Edit to add notes.</p>
          )}

          {/* Child cards */}
          {childCards.length > 0 && (
            <div className="mt-6">
              <SectionTitle className="mb-2.5">Sub-cards</SectionTitle>
              <div className="flex flex-col gap-1.5">
                {childCards.map(c => (
                  <button key={c.id} onClick={() => onNavigate(c.id)}
                    className="flex items-center gap-2 bg-surface border border-border-subtle rounded-lg px-3 py-2.5 text-left hover:border-border-default transition-colors cursor-pointer w-full">
                    <span className="text-[12px] text-text-hint">↓</span>
                    <span className="text-[13px] text-text-primary flex-1">{c.title}</span>
                    <span className="text-[11px] text-text-hint">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Linked cards */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2.5">
              <SectionTitle>Linked cards</SectionTitle>
              <button onClick={() => setShowLinkCard(v => !v)}
                className="text-[11px] text-text-secondary hover:text-text-primary bg-transparent border-none cursor-pointer">
                {showLinkCard ? 'Done' : '+ Link card'}
              </button>
            </div>

            {showLinkCard && (
              <div className="mb-3 fade-up">
                <Input value={cardSearch} onChange={e => setCardSearch(e.target.value)} placeholder="Search cards…" className="mb-2" />
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                  {availableCards.slice(0, 8).map(c => (
                    <button key={c.id} onClick={async () => { await linkCards(card.id, c.id); setCardSearch('') }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border-subtle hover:border-border-default text-left cursor-pointer transition-colors w-full">
                      <span className="text-[12px] text-text-primary flex-1 truncate">{c.title}</span>
                      <span className="text-[11px] text-text-hint">+ link</span>
                    </button>
                  ))}
                  {availableCards.length === 0 && <p className="text-[12px] text-text-hint italic px-1">No cards to link.</p>}
                </div>
              </div>
            )}

            {linkedCards.length === 0 && !showLinkCard
              ? <p className="text-[12px] text-text-hint italic">No linked cards yet.</p>
              : <div className="flex flex-col gap-1.5">
                {linkedCards.map(c => (
                  <div key={c.id} className="flex items-center gap-2 bg-surface border border-border-subtle rounded-lg px-3 py-2.5 hover:border-border-default transition-colors">
                    <button onClick={() => onNavigate(c.id)} className="text-[13px] text-text-primary flex-1 text-left bg-transparent border-none cursor-pointer hover:underline underline-offset-2">
                      {c.title}
                    </button>
                    <button onClick={() => onNavigate(c.id)} className="text-[12px] text-text-hint hover:text-text-primary bg-transparent border-none cursor-pointer">→</button>
                    <button onClick={() => unlinkCards(card.id, c.id)} className="text-[11px] text-text-hint hover:text-red bg-transparent border-none cursor-pointer ml-1">✕</button>
                  </div>
                ))}
              </div>
            }
          </div>

          {/* Linked practice sessions */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2.5">
              <SectionTitle>Practice sessions</SectionTitle>
              <button onClick={() => setShowLinkEntry(v => !v)}
                className="text-[11px] text-text-secondary hover:text-text-primary bg-transparent border-none cursor-pointer">
                {showLinkEntry ? 'Done' : '+ Link session'}
              </button>
            </div>

            {showLinkEntry && (
              <div className="mb-3 fade-up">
                <Input value={entrySearch} onChange={e => setEntrySearch(e.target.value)} placeholder="Search sessions…" className="mb-2" />
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                  {availableEntries.map(e => (
                    <button key={e.id} onClick={async () => { await linkEntryCard(e.id, card.id); setEntrySearch('') }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border-subtle hover:border-border-default text-left cursor-pointer transition-colors w-full">
                      <span className="text-[12px] text-text-primary flex-1 truncate">{e.title || 'Untitled session'}</span>
                      <span className="font-mono text-[10px] text-text-hint flex-shrink-0">{new Date(e.practiced_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <span className="text-[11px] text-text-hint">+ link</span>
                    </button>
                  ))}
                  {availableEntries.length === 0 && <p className="text-[12px] text-text-hint italic px-1">No sessions to link.</p>}
                </div>
              </div>
            )}

            {linkedEntries.length === 0 && !showLinkEntry
              ? <p className="text-[12px] text-text-hint italic">No linked sessions yet.</p>
              : <div className="flex flex-col gap-1.5">
                {linkedEntries.map(e => (
                  <div key={e.id} className="flex items-center gap-3 bg-surface border border-border-subtle rounded-lg px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className={clsx('text-[13px] truncate', !e.title && 'italic text-text-hint')}>{e.title || 'Untitled session'}</p>
                      <p className="font-mono text-[10px] text-text-hint">{new Date(e.practiced_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                    </div>
                    <button onClick={() => unlinkEntryCard(e.id, card.id)} className="text-[11px] text-text-hint hover:text-red bg-transparent border-none cursor-pointer">✕</button>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
      )}
    </div>
  )
}
