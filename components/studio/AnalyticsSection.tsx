'use client'
import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { palColor, confInfo } from '@/lib/palette'
import { practiceVolumeCurve, computeSkillStats } from '@/lib/algorithms'
import { SectionTitle, Card, Empty } from '@/components/shared/ui'
import clsx from 'clsx'

type AnalyticsView = 'rhythm' | 'momentum' | 'neglect' | 'volume' | 'confidence'
type Window = '30' | '90' | 'all'

function isoWeekStart(date: Date): string {
  const d = new Date(date); d.setHours(0,0,0,0); d.setDate(d.getDate()-d.getDay())
  return d.toISOString().slice(0,10)
}

export default function AnalyticsSection() {
  const { entries, skills, logs, categories, domains } = useStore()
  const [av, setAv] = useState<AnalyticsView>('rhythm')
  const [win, setWin] = useState<Window>('30')

  const cutoff = useMemo(() => {
    if (win === 'all') return 0
    return Date.now() - (win === '30' ? 30 : 90) * 86400000
  }, [win])

  const filteredEntries = useMemo(() =>
    entries.filter(e => new Date(e.practiced_at).getTime() >= cutoff),
    [entries, cutoff]
  )

  const allStats = useMemo(() =>
    skills.map(s => computeSkillStats(logs, s)),
    [skills, logs]
  )

  const VIEWS: { k: AnalyticsView, l: string }[] = [
    { k: 'rhythm',     l: 'Rhythm'     },
    { k: 'volume',     l: 'Volume'     },
    { k: 'momentum',   l: 'Momentum'   },
    { k: 'neglect',    l: 'Neglect'    },
    { k: 'confidence', l: 'Confidence' },
  ]

  function calcStreak() {
    if (!entries.length) return 0
    const today = new Date(); today.setHours(0,0,0,0)
    const dates = new Set(entries.map(e => e.practiced_at.slice(0,10)))
    let streak = 0, d = new Date(today)
    while (dates.has(d.toISOString().slice(0,10))) { streak++; d.setDate(d.getDate()-1) }
    return streak
  }

  return (
    <div>
      {/* View tabs */}
      <div className="flex gap-1 flex-wrap mb-5">
        {VIEWS.map(v => (
          <button
            key={v.k}
            onClick={() => setAv(v.k)}
            className={clsx(
              'px-3 py-1.5 text-[12px] rounded border transition-all cursor-pointer font-sans',
              av === v.k
                ? 'bg-text-primary text-bg border-text-primary font-medium'
                : 'bg-transparent text-text-secondary border-border-subtle hover:text-text-primary hover:border-border-default'
            )}
          >{v.l}</button>
        ))}
      </div>

      {/* Time window — not for confidence */}
      {av !== 'confidence' && (
        <div className="flex gap-1.5 mb-5">
          {(['30','90','all'] as Window[]).map(w => (
            <button
              key={w}
              onClick={() => setWin(w)}
              className={clsx(
                'px-2.5 py-1 text-[11px] rounded-full border transition-all cursor-pointer font-sans',
                win === w
                  ? 'bg-text-primary text-bg border-text-primary'
                  : 'bg-transparent text-text-hint border-border-subtle hover:text-text-secondary hover:border-border-default'
              )}
            >{w === 'all' ? 'All time' : `${w}d`}</button>
          ))}
        </div>
      )}

      {av === 'rhythm'     && <RhythmView entries={filteredEntries} total={entries.length} streak={calcStreak()} />}
      {av === 'volume'     && <VolumeView entries={entries} />}
      {av === 'momentum'   && <MomentumView stats={allStats} skills={skills} />}
      {av === 'neglect'    && <NeglectView stats={allStats} skills={skills} />}
      {av === 'confidence' && <ConfidenceView skills={skills} categories={categories} />}
    </div>
  )
}

// ── Rhythm ────────────────────────────────────────
function RhythmView({ entries, total, streak }: { entries: ReturnType<typeof useStore>['entries'], total: number, streak: number }) {
  const days = 90
  const today = new Date(); today.setHours(0,0,0,0)
  const entryDates = new Set(entries.map(e => e.practiced_at.slice(0,10)))
  const cells: string[] = []
  for (let i = days-1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate()-i)
    cells.push(d.toISOString().slice(0,10))
  }
  const startDow = new Date(cells[0]).getDay()
  const padded = [...Array(startDow).fill(null), ...cells]
  const weeks: (string|null)[][] = []
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i+7))
  let lastMonth = ''
  const monthLabels = weeks.map(w => {
    const first = w.find(d => d)
    if (!first) return ''
    const m = new Date(first).toLocaleDateString('en-US', { month: 'short' })
    if (m !== lastMonth) { lastMonth = m; return m }
    return ''
  })

  return (
    <div className="space-y-5">
      <div className="flex gap-6">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[22px] font-light">{entries.length}</span>
          <span className="text-[11px] text-text-hint">sessions (window)</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[22px] font-light">{streak}</span>
          <span className="text-[11px] text-text-hint">day streak</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[22px] font-light">{total}</span>
          <span className="text-[11px] text-text-hint">total ever</span>
        </div>
      </div>

      <div>
        <SectionTitle className="mb-3">90-day heatmap</SectionTitle>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-1 mb-1">
            {monthLabels.map((m, i) => (
              <div key={i} className="font-mono text-[9px] text-text-hint" style={{ width: 10, overflow: 'visible', whiteSpace: 'nowrap' }}>{m}</div>
            ))}
          </div>
          <div className="flex gap-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((d, di) => (
                  <div
                    key={di}
                    className="rounded-[2px] flex-shrink-0"
                    style={{
                      width: 10, height: 10,
                      background: !d ? 'transparent' : entryDates.has(d) ? '#378ADD' : 'rgba(255,255,255,0.06)',
                      opacity: !d ? 0 : entryDates.has(d) ? 1 : 0.5
                    }}
                    title={d ?? ''}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Volume Curve ──────────────────────────────────
function VolumeView({ entries }: { entries: ReturnType<typeof useStore>['entries'] }) {
  const data = useMemo(() => practiceVolumeCurve(entries, 24), [entries])
  if (!data.length) return <Empty>No data yet.</Empty>
  const maxCount = Math.max(1, ...data.map(d => d.count))
  const maxAvg = Math.max(1, ...data.map(d => d.movingAvg))
  const maxVal = Math.max(maxCount, maxAvg)

  return (
    <div>
      <SectionTitle className="mb-1">Sessions per week · 24-week view</SectionTitle>
      <p className="text-[11px] text-text-hint mb-4">Bar = weekly count · Line = 4-week rolling average</p>
      <div className="relative">
        {/* Chart */}
        <div className="flex items-end gap-[3px]" style={{ height: 100 }}>
          {data.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 relative group">
              <div
                className="w-full rounded-t-[2px] bg-border-default group-hover:bg-text-secondary transition-colors"
                style={{ height: `${(d.count / maxVal) * 100}%`, minHeight: d.count > 0 ? 2 : 0 }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 bg-surface2 border border-border-default rounded px-2 py-1 text-[10px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {d.weekStart}<br/>{d.count} sessions · avg {d.movingAvg}
              </div>
            </div>
          ))}
        </div>
        {/* Rolling average line overlay */}
        <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: 100 }}>
          <polyline
            points={data.map((d, i) => {
              const x = ((i + 0.5) / data.length) * 100
              const y = 100 - (d.movingAvg / maxVal) * 100
              return `${x}%,${y}`
            }).join(' ')}
            fill="none"
            stroke="#378ADD"
            strokeWidth="1.5"
            strokeLinejoin="round"
            opacity="0.7"
          />
        </svg>
      </div>
      <div className="flex gap-4 mt-3">
        <span className="flex items-center gap-1.5 text-[11px] text-text-hint">
          <span className="w-3 h-2.5 bg-border-default rounded-sm inline-block" /> Weekly count
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-text-hint">
          <span className="w-3 h-px bg-sky-500 inline-block" style={{ background: '#378ADD' }} /> 4-week avg
        </span>
      </div>
    </div>
  )
}

// ── Momentum ──────────────────────────────────────
function MomentumView({ stats, skills }: { stats: ReturnType<typeof computeSkillStats>[], skills: ReturnType<typeof useStore>['skills'] }) {
  const ranked = [...stats].sort((a, b) => b.momentumScore - a.momentumScore).slice(0, 15)
  if (!ranked.length || ranked.every(s => s.momentumScore === 0)) return <Empty>No practice data yet.</Empty>
  const max = Math.max(1, ranked[0].momentumScore)

  return (
    <div>
      <SectionTitle className="mb-1">Practice momentum score</SectionTitle>
      <p className="text-[11px] text-text-hint mb-4">Combines recency (40%) · frequency (35%) · consistency (25%)</p>
      <div className="space-y-2">
        {ranked.map(s => {
          const skill = skills.find(x => x.id === s.skillId)
          if (!skill) return null
          const pct = Math.round((s.momentumScore / max) * 100)
          return (
            <div key={s.skillId} className="flex items-center gap-3">
              <span className="text-[12px] truncate flex-[0_0_130px] min-w-0 text-text-primary">{skill.name}</span>
              <div className="flex-1 h-2 bg-surface2 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `rgba(29,158,117,${0.3 + (pct/100)*0.7})` }} />
              </div>
              <span className="font-mono text-[11px] text-text-hint w-8 text-right flex-shrink-0">{s.momentumScore}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Neglect ───────────────────────────────────────
function NeglectView({ stats, skills }: { stats: ReturnType<typeof computeSkillStats>[], skills: ReturnType<typeof useStore>['skills'] }) {
  const ranked = [...stats].sort((a, b) => b.neglectScore - a.neglectScore).slice(0, 15)
  if (!ranked.length) return <Empty>No skills yet.</Empty>
  const max = Math.max(1, ranked[0].neglectScore)

  return (
    <div>
      <SectionTitle className="mb-1">Skill neglect score</SectionTitle>
      <p className="text-[11px] text-text-hint mb-4">How overdue each skill is relative to its usual frequency</p>
      <div className="space-y-2">
        {ranked.map(s => {
          const skill = skills.find(x => x.id === s.skillId)
          if (!skill) return null
          const pct = Math.round((s.neglectScore / max) * 100)
          const color = s.neglectScore > 70 ? '#EF9F27' : s.neglectScore > 40 ? '#D85A30' : '#5a5a56'
          return (
            <div key={s.skillId} className="flex items-center gap-3">
              <span className="text-[12px] truncate flex-[0_0_130px] min-w-0 text-text-primary">{skill.name}</span>
              <div className="flex-1 h-2 bg-surface2 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
              </div>
              <div className="flex items-center gap-1 w-16 flex-shrink-0 justify-end">
                <span className="font-mono text-[11px] text-text-hint">{s.neglectScore}</span>
                {skill.priority && <span className="text-amber text-[10px]">★</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Confidence Map ────────────────────────────────
function ConfidenceView({ skills, categories }: { skills: ReturnType<typeof useStore>['skills'], categories: ReturnType<typeof useStore>['categories'] }) {
  return (
    <div>
      <SectionTitle className="mb-1">Confidence map</SectionTitle>
      <p className="text-[11px] text-text-hint mb-4">All skills sorted weakest first within each category</p>
      <div className="space-y-5">
        {categories.map(cat => {
          const p = palColor(cat.color)
          const catSkills = skills.filter(s => s.catId === cat.id).sort((a, b) => (a.confidence ?? 1) - (b.confidence ?? 1))
          if (!catSkills.length) return null
          return (
            <div key={cat.id}>
              <div className="mb-2.5">
                <span className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-[2px] rounded-full inline-flex" style={{ background: p.bg, color: p.text }}>
                  <span className="w-[4px] h-[4px] rounded-full flex-shrink-0 inline-block" style={{ background: p.dot }} />
                  {cat.name}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {catSkills.map(s => {
                  const ci = confInfo(s.confidence ?? 1)
                  return (
                    <span key={s.id} className="text-[11px] px-2.5 py-1 rounded-full border" style={{ background: ci.bg, color: ci.color, borderColor: 'transparent' }}>
                      {s.name}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
