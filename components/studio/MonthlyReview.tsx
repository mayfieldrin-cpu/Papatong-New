'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { palColor, confInfo } from '@/lib/palette'
import { SectionTitle, Card, Dot } from '@/components/shared/ui'
import { practiceCount } from '@/lib/algorithms'
import type { ConfidenceLevel } from '@/types'
import clsx from 'clsx'

export default function MonthlyReview() {
  const { categories, skills, logs, updateSkill } = useStore()
  const [saving, setSaving] = useState<string | null>(null)
  const [localGoals, setLocalGoals] = useState<Record<string, string>>({})
  const [localConf, setLocalConf] = useState<Record<string, ConfidenceLevel>>({})

  function getGoal(skillId: string): string {
    if (localGoals[skillId] !== undefined) return localGoals[skillId]
    const s = skills.find(x => x.id === skillId)
    return s?.goal != null ? String(s.goal) : ''
  }

  function getConf(skillId: string): ConfidenceLevel {
    if (localConf[skillId] !== undefined) return localConf[skillId]
    const s = skills.find(x => x.id === skillId)
    return s?.confidence ?? 1
  }

  async function saveSkill(skillId: string) {
    setSaving(skillId)
    const goalStr = localGoals[skillId]
    const conf = localConf[skillId]
    const patch: Record<string, unknown> = {}
    if (goalStr !== undefined) patch.goal = goalStr.trim() === '' ? null : Number(goalStr)
    if (conf !== undefined) patch.confidence = conf
    await updateSkill(skillId, patch as Parameters<typeof updateSkill>[1])
    // Clear local state — committed to store
    setLocalGoals(prev => { const n = { ...prev }; delete n[skillId]; return n })
    setLocalConf(prev => { const n = { ...prev }; delete n[skillId]; return n })
    setSaving(null)
  }

  const isDirty = (skillId: string) =>
    localGoals[skillId] !== undefined || localConf[skillId] !== undefined

  return (
    <div>
      <div className="mb-5">
        <SectionTitle className="mb-1">Monthly Review</SectionTitle>
        <p className="text-[12px] text-text-hint">Set practice goals and update confidence levels for each skill.</p>
      </div>

      {categories.map(cat => {
        const p = palColor(cat.color)
        const catSkills = skills.filter(s => s.catId === cat.id)
        if (!catSkills.length) return null
        return (
          <div key={cat.id} className="mb-8">
            <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border-subtle">
              <span
                className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-[2px] rounded-full"
                style={{ background: p.bg, color: p.text }}
              >
                <Dot color={p.dot} size={4} />
                {cat.name}
              </span>
            </div>

            <div className="space-y-3">
              {catSkills.map(skill => {
                const count = practiceCount(logs, skill.id)
                const goal = skill.goal
                const conf = getConf(skill.id)
                const ci = confInfo(conf)
                const dirty = isDirty(skill.id)
                const isSaving = saving === skill.id

                // Progress toward goal
                const pct = goal ? Math.min(100, Math.round((count / goal) * 100)) : null
                const reached = goal != null && count >= goal

                return (
                  <Card key={skill.id} className={clsx(dirty && 'border-border-strong')}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate mb-0.5">{skill.name}</p>
                        <p className="font-mono text-[11px] text-text-hint">
                          {count} practice{count !== 1 ? 's' : ''} total
                          {goal != null && ` · goal: ${goal}`}
                        </p>
                      </div>
                      {dirty && (
                        <button
                          onClick={() => saveSkill(skill.id)}
                          disabled={isSaving}
                          className="flex-shrink-0 text-[12px] font-medium text-green border border-green/40 bg-green/10 rounded px-2.5 py-1 cursor-pointer hover:bg-green/20 transition-colors disabled:opacity-50"
                        >
                          {isSaving ? 'Saving…' : 'Save'}
                        </button>
                      )}
                    </div>

                    {/* Goal progress bar */}
                    {goal != null && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-text-hint">Progress toward goal</span>
                          <span className={clsx('font-mono text-[11px]', reached ? 'text-green' : 'text-text-hint')}>
                            {count}/{goal} {reached && '✓'}
                          </span>
                        </div>
                        <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: reached ? '#1D9E75' : p.dot }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Goal input */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[12px] text-text-secondary whitespace-nowrap">Practice goal</span>
                      <input
                        type="number"
                        min={1}
                        value={getGoal(skill.id)}
                        onChange={e => setLocalGoals(prev => ({ ...prev, [skill.id]: e.target.value }))}
                        placeholder="e.g. 20"
                        className="w-20 bg-surface border border-border-default text-text-primary rounded px-2.5 py-1.5 text-[13px] focus:border-border-strong focus:outline-none font-mono"
                      />
                      <span className="text-[11px] text-text-hint">sessions</span>
                      {getGoal(skill.id) && (
                        <button
                          onClick={() => setLocalGoals(prev => ({ ...prev, [skill.id]: '' }))}
                          className="text-[11px] text-text-hint hover:text-red bg-transparent border-none cursor-pointer"
                        >clear</button>
                      )}
                    </div>

                    {/* Confidence picker */}
                    <div>
                      <p className="text-[11px] text-text-secondary mb-2">Confidence</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {([1, 2, 3, 4] as ConfidenceLevel[]).map(v => {
                          const ci2 = confInfo(v)
                          const sel = conf === v
                          return (
                            <button
                              key={v}
                              onClick={() => setLocalConf(prev => ({ ...prev, [skill.id]: v }))}
                              className="px-2.5 py-1 text-[11px] rounded-full border transition-all cursor-pointer font-sans"
                              style={sel
                                ? { background: ci2.bg, color: ci2.color, borderColor: ci2.color }
                                : { background: 'transparent', color: '#5a5a56', borderColor: 'rgba(255,255,255,0.08)' }
                              }
                            >
                              {ci2.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}

      {skills.length === 0 && (
        <p className="text-[13px] text-text-hint italic text-center py-8">No skills yet. Add skills in Studio first.</p>
      )}
    </div>
  )
}
