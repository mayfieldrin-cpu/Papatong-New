'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import PracticeJournal from './PracticeJournal'
import KnowledgeView from './KnowledgeView'
import { SectionTitle } from '@/components/shared/ui'
import clsx from 'clsx'

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0
  const set = new Set(dates)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  let streak = 0
  const d = new Date(today)
  while (set.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1) }
  return streak
}

export default function RecordView() {
  const { entries, cards } = useStore()
  const [open, setOpen] = useState<'' | 'practice' | 'knowledge'>('')
  // Lifted card open state — allows cross-navigation from journal → card
  const [openCardId, setOpenCardId] = useState<string | null>(null)

  const practiceStreak = calcStreak(entries.map(e => e.practiced_at.slice(0, 10)))

  function navigateToCard(cardId: string) {
    // Switch to knowledge page and open that card
    setOpen('knowledge')
    setOpenCardId(cardId)
  }

  return (
    <div>
      {/* Practice Journal slide-in page */}
      <div className={clsx('slide-page', open === 'practice' && 'open')}>
        <div className="max-w-[640px] mx-auto px-5 pt-8 pb-20">
          <PracticeJournal onBack={() => setOpen('')} onNavigateToCard={navigateToCard} />
        </div>
      </div>

      {/* Knowledge slide-in page */}
      <div className={clsx('slide-page', open === 'knowledge' && 'open')}>
        <div className="max-w-[640px] mx-auto px-5 pt-8 pb-20">
          <button onClick={() => { setOpen(''); setOpenCardId(null) }} className="flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer mb-6">
            ← Journals
          </button>
          <KnowledgeView initialOpenCardId={openCardId} onClearInitialCard={() => setOpenCardId(null)} />
        </div>
      </div>

      {/* Landing */}
      <div className="sec-header flex items-center justify-between mb-5">
        <SectionTitle>Journals</SectionTitle>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Practice Journal card */}
        <button
          onClick={() => setOpen('practice')}
          className="bg-surface border border-border-subtle rounded-xl p-5 text-left cursor-pointer hover:border-border-default transition-all group flex flex-col gap-3 min-h-[160px] relative"
        >
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-hint">Practice</span>
          <span className="text-[17px] font-medium text-text-primary leading-tight">Practice Journal</span>
          <div className="flex gap-4 mt-auto">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[20px] font-light">{entries.length}</span>
              <span className="text-[10px] text-text-hint">entries</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[20px] font-light">{practiceStreak}</span>
              <span className="text-[10px] text-text-hint">day streak</span>
            </div>
          </div>
          <span className="absolute bottom-5 right-5 text-[16px] text-text-hint group-hover:text-text-secondary transition-colors">→</span>
        </button>

        {/* Knowledge card */}
        <button
          onClick={() => setOpen('knowledge')}
          className="bg-surface border border-border-subtle rounded-xl p-5 text-left cursor-pointer hover:border-border-default transition-all group flex flex-col gap-3 min-h-[160px] relative"
        >
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-hint">Knowledge</span>
          <span className="text-[17px] font-medium text-text-primary leading-tight">Knowledge Cards</span>
          <div className="flex gap-4 mt-auto">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[20px] font-light">{cards.length}</span>
              <span className="text-[10px] text-text-hint">cards</span>
            </div>
          </div>
          <span className="absolute bottom-5 right-5 text-[16px] text-text-hint group-hover:text-text-secondary transition-colors">→</span>
        </button>
      </div>
    </div>
  )
}
