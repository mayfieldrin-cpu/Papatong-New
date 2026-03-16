'use client'
import { useState } from 'react'
import SessionBuilder from './SessionBuilder'
import ExploreTab from './ExploreTab'
import clsx from 'clsx'

type Tab = 'builder' | 'explore'

export default function PracticeView() {
  const [tab, setTab] = useState<Tab>('builder')

  return (
    <div>
      <div className="flex gap-1 mb-6">
        {(['builder', 'explore'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-3.5 py-[5px] text-[13px] rounded border transition-all cursor-pointer font-sans',
              tab === t
                ? 'bg-surface2 text-text-primary border-border-default font-medium'
                : 'bg-transparent text-text-secondary border-transparent hover:text-text-primary hover:bg-surface'
            )}
          >
            {t === 'builder' ? 'Session Builder' : 'Explore'}
          </button>
        ))}
      </div>
      {tab === 'builder' ? <SessionBuilder /> : <ExploreTab />}
    </div>
  )
}
