'use client'
import { useState } from 'react'
import LibrarySection from './LibrarySection'
import AnalyticsSection from './AnalyticsSection'
import clsx from 'clsx'

type Tab = 'library' | 'analytics'

export default function StudioView() {
  const [tab, setTab] = useState<Tab>('library')

  return (
    <div>
      <div className="flex gap-1 mb-6">
        {(['library', 'analytics'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-3.5 py-[5px] text-[13px] rounded border transition-all cursor-pointer font-sans capitalize',
              tab === t
                ? 'bg-surface2 text-text-primary border-border-default font-medium'
                : 'bg-transparent text-text-secondary border-transparent hover:text-text-primary hover:bg-surface'
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'library' ? <LibrarySection /> : <AnalyticsSection />}
    </div>
  )
}
