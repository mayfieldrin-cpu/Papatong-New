'use client'
import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { Btn, Card, SectionTitle, LoadingDots, Empty } from '@/components/shared/ui'
import type { ExploreResults, BreadcrumbItem } from '@/types'
import clsx from 'clsx'

const MW_KEY = process.env.NEXT_PUBLIC_MW_THESAURUS_KEY ?? ''

const RANDOM_POOL = [
  'cloud','iron','salt','debt','frost','echo','vapor','grain','pulse','amber',
  'hollow','vivid','dense','sharp','loose','tender','rigid','volatile','static','fluid',
  'tension','weight','decay','bloom','rupture','scatter','anchor','drift','surge','graze',
]

async function mwThesaurus(word: string): Promise<{ synonyms: string[], antonyms: string[] }> {
  if (!MW_KEY) return { synonyms: [], antonyms: [] }
  try {
    const r = await fetch(
      `https://www.dictionaryapi.com/api/v3/references/thesaurus/json/${encodeURIComponent(word)}?key=${MW_KEY}`
    )
    const data = await r.json()
    const synonyms: string[] = [], antonyms: string[] = []
    for (const entry of data) {
      if (typeof entry !== 'object' || !entry?.meta) continue
      ;(entry.meta.syns ?? []).forEach((g: string[]) => g.forEach((w: string) => synonyms.push(w)))
      ;(entry.meta.ants ?? []).forEach((g: string[]) => g.forEach((w: string) => antonyms.push(w)))
    }
    return {
      synonyms: [...new Set(synonyms)],
      antonyms: [...new Set(antonyms)],
    }
  } catch { return { synonyms: [], antonyms: [] } }
}

async function generateWords(seeds: string[], adjCount: number, rndCount: number): Promise<ExploreResults> {
  const seedSet = new Set(seeds.map(w => w.toLowerCase()))
  const results = await Promise.all(seeds.map(w => mwThesaurus(w)))
  const seen = new Set<string>([...seedSet])
  const synonyms: string[] = [], antonyms: string[] = []
  results.forEach(({ synonyms: s, antonyms: a }) => {
    s.forEach(w => { if (!seen.has(w.toLowerCase())) { seen.add(w.toLowerCase()); synonyms.push(w) } })
    a.forEach(w => { if (!seen.has(w.toLowerCase() + '_ant')) { seen.add(w.toLowerCase() + '_ant'); antonyms.push(w) } })
  })
  const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5)
  const adjWords = shuffle([...synonyms]).slice(0, adjCount)
  const antWords = shuffle([...antonyms]).slice(0, Math.ceil(adjCount / 3))
  const usedWords = new Set([...seedSet, ...adjWords.map(w => w.toLowerCase())])
  const random = shuffle(RANDOM_POOL.filter(w => !usedWords.has(w))).slice(0, rndCount)
  return { synonyms: adjWords, antonyms: antWords, random }
}

interface WordChipProps {
  word: string
  collected: boolean
  onDrill: (w: string) => void
  onCollect: (w: string) => void
  onAddSpont: (w: string) => void
}

function WordChip({ word, collected, onDrill, onCollect, onAddSpont }: WordChipProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-flex">
      <button
        onClick={() => onDrill(word)}
        className="bg-surface border border-border-default text-text-primary rounded-l px-3 py-1.5 text-[13px] hover:bg-surface2 hover:border-border-strong transition-all cursor-pointer font-sans"
      >
        {word}
      </button>
      <button
        onClick={() => { onCollect(word); setOpen(false) }}
        className={clsx(
          'border border-l-0 rounded-r px-2 py-1.5 text-[12px] font-medium transition-all cursor-pointer',
          collected
            ? 'text-green border-green/40 bg-green/10'
            : 'text-text-hint border-border-default bg-surface hover:text-text-primary hover:bg-surface2'
        )}
        title={collected ? 'Remove' : 'Collect'}
      >
        {collected ? '✓' : '+'}
      </button>
    </div>
  )
}

export default function ExploreTab() {
  const { categories, skills, sessionSlots, sessionActiveCats, spontSkills, setSpontSkills } = useStore()
  const [adjCount, setAdjCount] = useState(8)
  const [rndCount, setRndCount] = useState(4)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const [loading, setLoading] = useState(false)
  const [hiddenSeeds, setHiddenSeeds] = useState<Set<string>>(new Set())
  const [extraSeeds, setExtraSeeds] = useState<string[]>([])
  const [extraInput, setExtraInput] = useState('')
  const [collection, setCollection] = useState<string[]>([])

  const allSeeds = useMemo(() => {
    const activeCats = categories.filter(c => sessionActiveCats.has(c.id))
    const fromSlots = activeCats.flatMap(c =>
      (sessionSlots[c.id] ?? []).filter(s => s.skillId).map(s => skills.find(x => x.id === s.skillId)?.name).filter(Boolean)
    ) as string[]
    return [...fromSlots, ...spontSkills]
  }, [categories, sessionActiveCats, sessionSlots, skills, spontSkills])

  const activeSeeds = [...allSeeds.filter(w => !hiddenSeeds.has(w)), ...extraSeeds]
  const current = breadcrumbs.length ? breadcrumbs[breadcrumbs.length - 1] : null
  const results = current?.results

  async function generate(seeds: string[]) {
    if (!seeds.length) return
    setLoading(true)
    const res = await generateWords(seeds, adjCount, rndCount)
    setLoading(false)
    setBreadcrumbs([{ word: '__root__', results: res }])
  }

  async function drill(word: string) {
    setLoading(true)
    const res = await generateWords([word], adjCount, rndCount)
    setLoading(false)
    setBreadcrumbs(prev => [...prev, { word, results: res }])
  }

  function jumpTo(idx: number) {
    if (idx === -1) setBreadcrumbs([])
    else setBreadcrumbs(prev => prev.slice(0, idx + 1))
  }

  function toggleHidden(w: string) {
    setHiddenSeeds(prev => {
      const n = new Set(prev)
      if (n.has(w)) n.delete(w)
      else n.add(w)
      return n
    })
  }

  function toggleCollect(w: string) {
    setCollection(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w])
  }

  function addSpont(w: string) {
    if (!spontSkills.includes(w)) setSpontSkills([...spontSkills, w])
  }

  function addExtra() {
    const v = extraInput.trim()
    if (!v || extraSeeds.includes(v)) return
    setExtraSeeds(prev => [...prev, v])
    setExtraInput('')
  }

  const visibleCrumbs = breadcrumbs.filter(b => b.word !== '__root__')

  return (
    <div className="space-y-5">
      {/* Seeds */}
      <Card>
        <SectionTitle className="mb-2.5">Seeds</SectionTitle>
        {allSeeds.length === 0 && (
          <p className="text-[12px] text-text-hint mb-2.5">Add skills to your session slots to use as seeds.</p>
        )}
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {allSeeds.map(w => {
            const hidden = hiddenSeeds.has(w)
            return (
              <span
                key={w}
                className={clsx(
                  'flex items-center gap-1.5 bg-surface2 border rounded-full px-3 py-1 text-[12px] transition-all',
                  hidden ? 'opacity-40 border-border-subtle line-through' : 'border-border-default'
                )}
              >
                {w}
                <button
                  onClick={() => toggleHidden(w)}
                  className="text-text-hint hover:text-text-primary border-none bg-transparent cursor-pointer text-[11px]"
                >
                  {hidden ? '+' : '×'}
                </button>
              </span>
            )
          })}
          {extraSeeds.map((w, i) => (
            <span key={i} className="flex items-center gap-1.5 border rounded-full px-3 py-1 text-[12px]" style={{ background: '#412402', borderColor: '#EF9F27', color: '#FAC775' }}>
              {w}
              <button onClick={() => setExtraSeeds(prev => prev.filter((_, j) => j !== i))} className="border-none bg-transparent cursor-pointer text-[10px] opacity-60 hover:opacity-100">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={extraInput}
            onChange={e => setExtraInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addExtra()}
            placeholder="Add a word to explore…"
            className="flex-1 bg-surface border border-border-default text-text-primary rounded px-2.5 py-1.5 text-[13px] focus:border-border-strong focus:outline-none"
          />
          <Btn size="sm" onClick={addExtra}>Add</Btn>
        </div>
      </Card>

      {/* Controls */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-text-secondary whitespace-nowrap">Synonyms</span>
            <button onClick={() => setAdjCount(n => Math.max(1, n - 1))} className="w-[22px] h-[22px] flex items-center justify-center rounded border border-border-default text-text-secondary hover:text-text-primary bg-bg text-[13px] cursor-pointer">−</button>
            <span className="font-mono text-[13px] min-w-[16px] text-center">{adjCount}</span>
            <button onClick={() => setAdjCount(n => Math.min(20, n + 1))} className="w-[22px] h-[22px] flex items-center justify-center rounded border border-border-default text-text-secondary hover:text-text-primary bg-bg text-[13px] cursor-pointer">+</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-text-secondary whitespace-nowrap">Random</span>
            <button onClick={() => setRndCount(n => Math.max(1, n - 1))} className="w-[22px] h-[22px] flex items-center justify-center rounded border border-border-default text-text-secondary hover:text-text-primary bg-bg text-[13px] cursor-pointer">−</button>
            <span className="font-mono text-[13px] min-w-[16px] text-center">{rndCount}</span>
            <button onClick={() => setRndCount(n => Math.min(20, n + 1))} className="w-[22px] h-[22px] flex items-center justify-center rounded border border-border-default text-text-secondary hover:text-text-primary bg-bg text-[13px] cursor-pointer">+</button>
          </div>
          <div className="flex-1" />
          <Btn size="sm" onClick={() => generate(activeSeeds)} disabled={!activeSeeds.length || loading}>
            {breadcrumbs.length === 0 ? 'Generate' : 'Regenerate'}
          </Btn>
          {breadcrumbs.length > 0 && (
            <Btn size="sm" onClick={() => { setBreadcrumbs([]); setHiddenSeeds(new Set()); setExtraSeeds([]) }}>
              Start over
            </Btn>
          )}
        </div>
      </Card>

      {/* Breadcrumbs */}
      {visibleCrumbs.length > 0 && (
        <div className="flex items-center flex-wrap gap-1">
          <button onClick={() => jumpTo(-1)} className="text-[13px] text-text-secondary hover:text-text-primary bg-transparent border-none cursor-pointer px-1">Seeds</button>
          {visibleCrumbs.map((b, i) => {
            const realIdx = breadcrumbs.indexOf(b)
            const isCurrent = realIdx === breadcrumbs.length - 1
            return (
              <span key={i} className="flex items-center gap-1">
                <span className="text-text-hint text-[12px]">›</span>
                <button
                  onClick={() => !isCurrent && jumpTo(realIdx)}
                  className={clsx(
                    'text-[13px] px-1 rounded bg-transparent border-none transition-colors',
                    isCurrent ? 'text-text-primary font-medium cursor-default' : 'text-text-secondary hover:text-text-primary cursor-pointer'
                  )}
                >
                  {b.word}
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-[13px] text-text-hint py-4">
          <LoadingDots /> <span className="ml-1">Generating…</span>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div className="space-y-4">
          {results.synonyms.length > 0 && (
            <div>
              <SectionTitle className="mb-2.5">Synonyms &amp; related</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {results.synonyms.map(w => (
                  <WordChip key={w} word={w} collected={collection.includes(w)} onDrill={drill} onCollect={toggleCollect} onAddSpont={addSpont} />
                ))}
              </div>
            </div>
          )}
          {results.antonyms.length > 0 && (
            <div>
              <SectionTitle className="mb-2.5">Antonyms &amp; opposites</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {results.antonyms.map(w => (
                  <WordChip key={w} word={w} collected={collection.includes(w)} onDrill={drill} onCollect={toggleCollect} onAddSpont={addSpont} />
                ))}
              </div>
            </div>
          )}
          {results.random.length > 0 && (
            <div>
              <SectionTitle className="mb-2.5">Random wildcards</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {results.random.map(w => (
                  <WordChip key={w} word={w} collected={collection.includes(w)} onDrill={drill} onCollect={toggleCollect} onAddSpont={addSpont} />
                ))}
              </div>
            </div>
          )}
          {!results.synonyms.length && !results.antonyms.length && (
            <Empty>No results — try a simpler single word as seed.</Empty>
          )}
        </div>
      )}

      {!results && !loading && activeSeeds.length > 0 && (
        <Empty>Hit Generate to explore words around your seeds.</Empty>
      )}

      {/* Collection tray */}
      {collection.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border-default px-5 py-3 z-40">
          <div className="max-w-[640px] mx-auto flex items-center gap-3 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-hint flex-shrink-0">Collected</span>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {collection.map((w, i) => (
                <span key={i} className="flex items-center gap-1 bg-surface2 border border-border-default rounded-full px-2.5 py-0.5 text-[12px]">
                  {w}
                  <button onClick={() => toggleCollect(w)} className="text-text-hint hover:text-red border-none bg-transparent cursor-pointer text-[11px]">×</button>
                </span>
              ))}
            </div>
            <button onClick={() => setCollection([])} className="text-[11px] text-text-hint hover:text-red border-none bg-transparent cursor-pointer whitespace-nowrap">Clear all</button>
          </div>
        </div>
      )}
    </div>
  )
}
