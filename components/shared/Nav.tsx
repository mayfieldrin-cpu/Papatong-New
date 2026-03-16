'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const TABS = [
  { href: '/practice', label: 'Practice' },
  { href: '/record',   label: 'Record'   },
  { href: '/studio',   label: 'Studio'   },
]

export default function Nav() {
  const path = usePathname()

  return (
    <nav className="flex flex-col gap-2.5 mb-8 pb-5 border-b border-border-subtle">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-medium tracking-[0.1em] uppercase text-text-hint">
          Papatong
        </span>
        <Link
          href="/settings"
          className={clsx(
            'text-[17px] px-1.5 py-1 rounded text-text-hint hover:text-text-primary hover:bg-surface2 transition-colors',
            path.startsWith('/settings') && 'text-text-primary'
          )}
        >
          ⚙
        </Link>
      </div>
      <div className="flex gap-1">
        {TABS.map(tab => {
          const active = path.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                'px-3 py-[5px] text-[13px] rounded border transition-all',
                active
                  ? 'bg-surface2 text-text-primary border-border-default font-medium'
                  : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-surface'
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
