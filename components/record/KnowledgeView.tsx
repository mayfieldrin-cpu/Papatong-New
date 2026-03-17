'use client'
import { useState, useMemo, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { palColor } from '@/lib/palette'
import { SectionTitle, Empty, Input } from '@/components/shared/ui'
import KnowledgeCardDetail from './KnowledgeCardDetail'
import type { KnowledgeCard } from '@/types'
import clsx from 'clsx'

function uid() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) }

function snippet(body: string, len = 80): string {
  return body.replace(/#{1,6}\s/g, '').replace(/[-*]\s/g, '').replace(/\n/g, ' ').trim().slice(0, len)
}

interface KnowledgeViewProps {
  initialOpenCardId?: string | null
  onClearInitialCard?: () => void
}

export default function KnowledgeView({ initialOpenCardId, onClearInitialCard }: KnowledgeViewProps = {}) {
  const { cards, skills, categories, addCard } = useStore()
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>(initialOpenCardId ?? null)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return cards
    return cards.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.body.toLowerCase().includes(q)
    )
  }, [cards, search])

  // Sync when parent navigates us to a specific card
  useEffect(() => {
    if (initialOpenCardId) setOpenId(initialOpenCardId)
  }, [initialOpenCardId])

  const openCard = openId ? cards.find(c => c.id === openId) : null

  async function createCard() {
    const title = newTitle.trim()
    if (!title) return
    const card: KnowledgeCard = {
      id: uid(),
      title,
      body: '',
      skill_ids: [],
      parent_id: null,
      linked_card_ids: [],
      linked_entry_ids: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await addCard(card)
    setNewTitle('')
    setCreating(false)
    setOpenId(card.id)
  }

  return (
    <div>
      {/* Card detail slide-in */}
      <div className={clsx('slide-page', openCard && 'open')} style={{ zIndex: 60 }}>
        {openCard && (
          <div className="max-w-[640px] mx-auto px-5 pt-8 pb-20">
            <KnowledgeCardDetail
              card={openCard}
              onBack={() => { setOpenId(null); onClearInitialCard?.() }}
              onNavigate={id => setOpenId(id)}
            />
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <SectionTitle>{cards.length} card{cards.length !== 1 ? 's' : ''}</SectionTitle>
        <button
          onClick={() => setCreating(true)}
          className="text-[12px] font-medium px-3 py-1.5 rounded border border-border-default bg-transparent text-text-primary hover:bg-surface2 transition-colors cursor-pointer"
        >
          + New card
        </button>
      </div>

      {/* New card inline form */}
      {creating && (
        <div className="mb-4 flex gap-2 items-center fade-up">
          <Input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createCard(); if (e.key === 'Escape') { setCreating(false); setNewTitle('') } }}
            placeholder="Card title…"
            autoFocus
            className="flex-1"
          />
          <button onClick={createCard} className="px-3 py-[7px] text-[13px] bg-text-primary text-bg rounded border border-text-primary cursor-pointer hover:opacity-80 font-sans">Create</button>
          <button onClick={() => { setCreating(false); setNewTitle('') }} className="px-3 py-[7px] text-[13px] bg-transparent text-text-secondary rounded border border-border-default cursor-pointer hover:bg-surface2 font-sans">Cancel</button>
        </div>
      )}

      {/* Search */}
      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search title or body…"
        className="mb-5"
      />

      {/* Grid */}
      {cards.length === 0 ? (
        <Empty>No knowledge cards yet.<br />Create your first card above.</Empty>
      ) : filtered.length === 0 ? (
        <Empty>No cards match your search.</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          {filtered.map(card => {
            const snip = snippet(card.body)
            const skillObjs = (card.skill_ids ?? []).map(id => skills.find(s => s.id === id)).filter(Boolean) as typeof skills
            const parentCard = card.parent_id ? cards.find(c => c.id === card.parent_id) : null

            return (
              <button
                key={card.id}
                onClick={() => setOpenId(card.id)}
                className="bg-surface border border-border-subtle rounded-xl p-4 text-left hover:border-border-default transition-all cursor-pointer flex flex-col gap-2 min-h-[110px] fade-up"
              >
                {/* Parent label */}
                {parentCard && (
                  <span className="font-mono text-[9px] uppercase tracking-widest text-text-hint truncate">
                    ↑ {parentCard.title}
                  </span>
                )}
                <span className="text-[13px] font-medium text-text-primary leading-snug line-clamp-2">
                  {card.title}
                </span>
                {snip && (
                  <span className="text-[11px] text-text-secondary leading-relaxed line-clamp-2 flex-1">
                    {snip}{card.body.length > 80 ? '…' : ''}
                  </span>
                )}
                <div className="flex items-center justify-between mt-auto pt-1">
                  <div className="flex flex-wrap gap-1">
                    {skillObjs.slice(0, 2).map(s => {
                      const cat = categories.find(c => c.id === s.catId)
                      const p = cat ? palColor(cat.color) : null
                      return (
                        <span
                          key={s.id}
                          className="text-[9px] font-medium px-1.5 py-[1px] rounded-full"
                          style={p ? { background: p.bg, color: p.text } : { background: '#242422', color: '#9a9a94' }}
                        >
                          {s.name}
                        </span>
                      )
                    })}
                    {skillObjs.length > 2 && (
                      <span className="text-[9px] text-text-hint">+{skillObjs.length - 2}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(card.linked_card_ids ?? []).length > 0 && (
                      <span className="font-mono text-[9px] text-text-hint">
                        {(card.linked_card_ids ?? []).length} link{(card.linked_card_ids ?? []).length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {(card.linked_entry_ids ?? []).length > 0 && (
                      <span className="font-mono text-[9px] text-text-hint">
                        {(card.linked_entry_ids ?? []).length} session{(card.linked_entry_ids ?? []).length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
