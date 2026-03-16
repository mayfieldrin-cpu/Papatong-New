'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { palColor, confInfo, PALETTE } from '@/lib/palette'
import { computeSkillStats, neglectScore, momentumScore } from '@/lib/algorithms'
import { Btn, Card, SectionTitle, Dot, ConfBadge, Input, Select, Toggle, Empty } from '@/components/shared/ui'
import type { Skill, PaletteId, ConfidenceLevel } from '@/types'
import clsx from 'clsx'

function uid() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) }

interface SkillFormState {
  name: string
  catId: string
  domainId: string
  tag: string
  priority: boolean
  confidence: ConfidenceLevel
}

export default function LibrarySection() {
  const { categories, domains, skills, logs, addSkill, updateSkill, deleteSkill } = useStore()

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SkillFormState>({ name: '', catId: '', domainId: '', tag: '', priority: false, confidence: 1 })
  const [libState, setLibState] = useState<Record<string, { sort: 'count'|'momentum'|'neglect', domain: string }>>({})

  function getLS(catId: string) {
    return libState[catId] ?? { sort: 'count', domain: 'all' }
  }
  function setLS(catId: string, patch: Partial<typeof libState[string]>) {
    setLibState(prev => ({ ...prev, [catId]: { ...getLS(catId), ...patch } }))
  }

  function openAdd(catId?: string) {
    setEditingId(null)
    setForm({ name: '', catId: catId ?? categories[0]?.id ?? '', domainId: '', tag: '', priority: false, confidence: 1 })
    setShowModal(true)
  }

  function openEdit(s: Skill) {
    setEditingId(s.id)
    setForm({ name: s.name, catId: s.catId ?? '', domainId: s.domainId ?? '', tag: s.tag ?? '', priority: s.priority, confidence: s.confidence })
    setShowModal(true)
  }

  async function saveSkill() {
    if (!form.name.trim()) return
    if (editingId) {
      await updateSkill(editingId, { ...form, name: form.name.trim() })
    } else {
      await addSkill({ id: uid(), ...form, name: form.name.trim() })
    }
    setShowModal(false)
    setEditingId(null)
  }

  const uncat = skills.filter(s => !s.catId || !categories.find(c => c.id === s.catId))

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <SectionTitle>{skills.length} skill atom{skills.length !== 1 ? 's' : ''}</SectionTitle>
        <Btn size="sm" onClick={() => openAdd()}>+ Add skill</Btn>
      </div>

      {/* Category sections */}
      {categories.map(cat => {
        const p = palColor(cat.color)
        const ls = getLS(cat.id)
        const catSkills = skills.filter(s => s.catId === cat.id)
        const usedDomainIds = [...new Set(catSkills.filter(s => s.domainId).map(s => s.domainId!))]
        const usedDomains = usedDomainIds.map(id => domains.find(d => d.id === id)).filter(Boolean) as typeof domains

        let filtered = ls.domain === 'all' ? catSkills : catSkills.filter(s => s.domainId === ls.domain)
        const statsMap = new Map(filtered.map(s => [s.id, computeSkillStats(logs, s)]))

        filtered = [...filtered].sort((a, b) => {
          if (ls.sort === 'count')    return (statsMap.get(b.id)?.count ?? 0) - (statsMap.get(a.id)?.count ?? 0)
          if (ls.sort === 'momentum') return (statsMap.get(b.id)?.momentumScore ?? 0) - (statsMap.get(a.id)?.momentumScore ?? 0)
          if (ls.sort === 'neglect')  return (statsMap.get(b.id)?.neglectScore ?? 0) - (statsMap.get(a.id)?.neglectScore ?? 0)
          return 0
        })

        const maxCount = Math.max(1, ...catSkills.map(s => statsMap.get(s.id)?.count ?? 0))

        return (
          <div key={cat.id} className="mb-8">
            {/* Category header */}
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-[2px] rounded-full" style={{ background: p.bg, color: p.text }}>
                  <Dot color={p.dot} size={4} />
                  {cat.name}
                </span>
                <span className="font-mono text-[11px] text-text-hint">{catSkills.length}</span>
              </div>
              <Btn size="xs" onClick={() => openAdd(cat.id)}>+ add</Btn>
            </div>

            {/* Sort + domain filters */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {(['count', 'momentum', 'neglect'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setLS(cat.id, { sort: s })}
                  className={clsx(
                    'px-2.5 py-1 text-[11px] rounded-full border transition-all cursor-pointer font-sans',
                    ls.sort === s
                      ? 'bg-surface2 text-text-primary border-border-default'
                      : 'bg-transparent text-text-hint border-border-subtle hover:text-text-secondary hover:border-border-default'
                  )}
                >
                  {s === 'count' ? '↓ practiced' : s === 'momentum' ? '↑ momentum' : '↑ neglect'}
                </button>
              ))}
              {usedDomains.length > 0 && (
                <>
                  <span className="w-px h-3.5 bg-border-default mx-0.5" />
                  <button
                    onClick={() => setLS(cat.id, { domain: 'all' })}
                    className={clsx(
                      'px-2.5 py-1 text-[11px] rounded-full border transition-all cursor-pointer font-sans',
                      ls.domain === 'all'
                        ? 'bg-text-primary text-bg border-text-primary'
                        : 'bg-transparent text-text-hint border-border-subtle hover:text-text-secondary'
                    )}
                  >All</button>
                  {usedDomains.map(d => {
                    const dp = palColor(d.color)
                    return (
                      <button
                        key={d.id}
                        onClick={() => setLS(cat.id, { domain: d.id })}
                        className="px-2.5 py-1 text-[11px] rounded-full border transition-all cursor-pointer font-sans flex items-center gap-1"
                        style={ls.domain === d.id ? { background: dp.dot, color: 'white', borderColor: dp.dot } : { background: 'transparent', color: '#9a9a94', borderColor: 'rgba(255,255,255,0.12)' }}
                      >
                        <Dot color={dp.dot} size={4} />
                        {d.name}
                      </button>
                    )
                  })}
                </>
              )}
            </div>

            {/* Skill cards */}
            {filtered.length === 0
              ? <p className="text-[12px] text-text-hint italic py-2">No skills yet.</p>
              : <div className="flex flex-col gap-1.5">
                {filtered.map((skill, rank) => {
                  const stats = statsMap.get(skill.id)
                  const dom = skill.domainId ? domains.find(d => d.id === skill.domainId) : null
                  const dp = dom ? palColor(dom.color) : null
                  const pct = Math.round(((stats?.count ?? 0) / maxCount) * 100)
                  const momentum = stats?.momentumScore ?? 0
                  const neglect = stats?.neglectScore ?? 0

                  return (
                    <Card key={skill.id} className={clsx('flex items-center gap-3', skill.priority && 'border-amber/30')}>
                      <span className="font-mono text-[11px] text-text-hint min-w-[18px] text-right flex-shrink-0">
                        {rank + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[13px] font-medium truncate">{skill.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                          {dp && (
                            <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-[1px] rounded-full" style={{ background: dp.bg, color: dp.text }}>
                              <Dot color={dp.dot} size={3} />{dom!.name}
                            </span>
                          )}
                          {skill.tag && (
                            <span className="font-mono text-[10px] text-text-hint bg-surface2 px-1.5 py-[1px] rounded-full">{skill.tag}</span>
                          )}
                          <ConfBadge level={skill.confidence} />
                          {stats?.daysSinceLastPractice !== null && (
                            <span className="font-mono text-[10px] text-text-hint">
                              {stats?.daysSinceLastPractice === 0 ? 'today' : stats?.daysSinceLastPractice === 1 ? 'yesterday' : `${stats?.daysSinceLastPractice}d ago`}
                            </span>
                          )}
                        </div>
                        {/* Progress bar + stats */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-[3px] bg-surface2 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: skill.priority ? '#EF9F27' : (dp?.dot ?? '#5a5a56') }} />
                          </div>
                          <span className="font-mono text-[10px] text-text-hint whitespace-nowrap">{stats?.count ?? 0}×</span>
                          {/* Momentum indicator */}
                          <span
                            className="font-mono text-[9px] px-1.5 py-[1px] rounded"
                            style={{ background: `rgba(29,158,117,${momentum / 100 * 0.3})`, color: momentum > 50 ? '#1D9E75' : '#5a5a56' }}
                            title={`Momentum: ${momentum}`}
                          >
                            M{momentum}
                          </span>
                          {/* Neglect indicator */}
                          {neglect > 40 && (
                            <span
                              className="font-mono text-[9px] px-1.5 py-[1px] rounded"
                              style={{ background: `rgba(239,159,39,${neglect / 100 * 0.3})`, color: neglect > 70 ? '#EF9F27' : '#9a9a94' }}
                              title={`Neglect: ${neglect}`}
                            >
                              N{neglect}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => updateSkill(skill.id, { priority: !skill.priority })}
                          className={clsx('border-none bg-transparent cursor-pointer text-[14px] px-1 py-0.5 transition-colors rounded', skill.priority ? 'text-amber' : 'text-text-hint hover:text-amber')}
                        >★</button>
                        <button onClick={() => openEdit(skill)} className="border-none bg-transparent cursor-pointer text-[13px] text-text-hint hover:text-text-primary px-1 py-0.5 transition-colors rounded">✎</button>
                        <button onClick={() => deleteSkill(skill.id)} className="border-none bg-transparent cursor-pointer text-[13px] text-text-hint hover:text-red px-1 py-0.5 transition-colors rounded">✕</button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            }
          </div>
        )
      })}

      {/* Uncategorized */}
      {uncat.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border-subtle">
            <span className="text-[11px] font-medium text-text-hint bg-surface2 px-2 py-[2px] rounded-full">Uncategorized</span>
            <span className="font-mono text-[11px] text-text-hint">{uncat.length}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {uncat.map(skill => (
              <Card key={skill.id} className="flex items-center gap-3">
                <span className="flex-1 text-[13px]">{skill.name}</span>
                <ConfBadge level={skill.confidence} />
                <button onClick={() => openEdit(skill)} className="border-none bg-transparent cursor-pointer text-[13px] text-text-hint hover:text-text-primary">✎</button>
                <button onClick={() => deleteSkill(skill.id)} className="border-none bg-transparent cursor-pointer text-[13px] text-text-hint hover:text-red">✕</button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {skills.length === 0 && <Empty>No skills yet. Add your first skill atom above.</Empty>}

      {/* Skill modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-surface border border-border-default rounded-xl p-6 w-full max-w-[420px] my-auto" style={{ animation: 'scaleIn .18s ease' }}>
            <h2 className="text-[15px] font-medium mb-5">{editingId ? 'Edit skill' : 'New skill atom'}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-text-secondary mb-1.5 tracking-wide">Category</label>
                <Select value={form.catId} onChange={e => setForm(f => ({ ...f, catId: e.target.value }))} className="w-full">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="">— uncategorized —</option>
                </Select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-text-secondary mb-1.5 tracking-wide">Name</label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. walk cycle, translucent…"
                  onKeyDown={e => e.key === 'Enter' && saveSkill()}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-text-secondary mb-1.5 tracking-wide">Domain <span className="font-normal text-text-hint">(optional)</span></label>
                <Select value={form.domainId} onChange={e => setForm(f => ({ ...f, domainId: e.target.value }))} className="w-full">
                  <option value="">— no domain —</option>
                  {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-text-secondary mb-1.5 tracking-wide">Tag <span className="font-normal text-text-hint">(optional free text)</span></label>
                <Input
                  value={form.tag}
                  onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
                  placeholder="e.g. character, abstract…"
                  onKeyDown={e => e.key === 'Enter' && saveSkill()}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-text-secondary mb-2 tracking-wide">Confidence</label>
                <div className="flex gap-2 flex-wrap">
                  {[1,2,3,4].map(v => {
                    const ci = confInfo(v)
                    const sel = form.confidence === v
                    return (
                      <button
                        key={v}
                        onClick={() => setForm(f => ({ ...f, confidence: v as ConfidenceLevel }))}
                        className="px-3 py-1.5 text-[12px] rounded-full border transition-all cursor-pointer font-sans"
                        style={sel ? { background: ci.bg, color: ci.color, borderColor: ci.color } : { background: 'transparent', color: '#9a9a94', borderColor: 'rgba(255,255,255,0.12)' }}
                      >
                        {ci.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[13px] text-text-primary">Mark as priority</span>
                <Toggle checked={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Btn size="sm" onClick={() => { setShowModal(false); setEditingId(null) }}>Cancel</Btn>
              <Btn size="sm" variant="primary" onClick={saveSkill}>{editingId ? 'Save changes' : 'Add atom'}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
