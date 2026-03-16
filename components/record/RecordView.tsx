'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import PracticeJournal from './PracticeJournal'
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
  const { entries } = useStore()
  const [open, setOpen] = useState<'' | 'practice'>('')

  const practiceStreak = calcStreak(entries.map(e => e.practiced_at.slice(0, 10)))

  return (
    <div>
      {/* Practice Journal slide-in page */}
      <div className={clsx('slide-page', open === 'practice' && 'open')}>
        <div className="max-w-[640px] mx-auto px-5 pt-8 pb-20">
          <PracticeJournal onBack={() => setOpen('')} />
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

        {/* Visual Creation card — coming soon */}
        <div className="bg-surface border border-border-subtle rounded-xl p-5 flex flex-col gap-3 min-h-[160px] relative opacity-50">
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-hint">Visual</span>
          <span className="text-[17px] font-medium text-text-primary leading-tight">Visual Creation</span>
          <span className="text-[11px] text-text-hint mt-auto">Coming soon</span>
        </div>
      </div>
    </div>
  )
}
