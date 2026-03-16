'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { palColor, PALETTE } from '@/lib/palette'
import { Btn, SectionTitle, Input } from '@/components/shared/ui'
import type { PaletteId } from '@/types'
import clsx from 'clsx'

function uid() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) }

export default function SettingsView() {
  const { categories, domains, skills, addCategory, updateCategory, deleteCategory, addDomain, updateDomain, deleteDomain } = useStore()
  const [editCat, setEditCat] = useState<string|null>(null)
  const [editDomain, setEditDomain] = useState<string|null>(null)

  async function newCat() {
    const used = new Set(categories.map(c => c.color))
    const color = PALETTE.find(p => !used.has(p.id))?.id ?? 'sky'
    const c = { id: uid(), name: `Category ${categories.length + 1}`, color: color as PaletteId }
    await addCategory(c)
    setEditCat(c.id)
  }

  async function newDomain() {
    const used = new Set(domains.map(d => d.color))
    const color = PALETTE.find(p => !used.has(p.id))?.id ?? 'teal'
    const d = { id: uid(), name: `Domain ${domains.length + 1}`, color: color as PaletteId }
    await addDomain(d)
    setEditDomain(d.id)
  }

  return (
    <div>
      <h1 className="text-[15px] font-medium mb-6">Settings</h1>

      {/* Domains */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
          <SectionTitle>Domains</SectionTitle>
          <Btn size="xs" onClick={newDomain}>+ new domain</Btn>
        </div>
        <div className="space-y-2">
          {domains.map(d => {
            const p = palColor(d.color)
            const isEditing = editDomain === d.id
            const count = skills.filter(s => s.domainId === d.id).length
            return (
              <div key={d.id} className="fade-up">
                <div className="flex items-center gap-3 bg-surface border border-border-subtle rounded-lg px-3.5 py-2.5">
                  <button
                    onClick={() => setEditDomain(isEditing ? null : d.id)}
                    className="w-[18px] h-[18px] rounded-full flex-shrink-0 cursor-pointer border-none transition-transform hover:scale-110"
                    style={{ background: p.dot }}
                  />
                  {isEditing
                    ? <input
                        defaultValue={d.name}
                        onBlur={async e => { await updateDomain(d.id, { name: e.target.value.trim() || d.name }) }}
                        onKeyDown={async e => { if (e.key === 'Enter') { await updateDomain(d.id, { name: (e.target as HTMLInputElement).value.trim() || d.name }); setEditDomain(null) } }}
                        className="flex-1 bg-transparent text-text-primary text-[13px] font-medium border-none outline-none"
                        autoFocus
                      />
                    : <span className="flex-1 text-[13px] font-medium">{d.name}</span>
                  }
                  <span className="font-mono text-[11px] text-text-hint">{count} skill{count !== 1 ? 's' : ''}</span>
                  {isEditing
                    ? <button onClick={() => setEditDomain(null)} className="text-green text-[13px] bg-transparent border-none cursor-pointer">✓</button>
                    : <button onClick={() => { setEditDomain(d.id) }} className="text-text-hint hover:text-text-primary text-[13px] bg-transparent border-none cursor-pointer">✎</button>
                  }
                  <button
                    onClick={async () => {
                      if (count > 0 && !confirm(`Delete "${d.name}"? ${count} skill${count !== 1 ? 's' : ''} will lose this domain.`)) return
                      await deleteDomain(d.id)
                    }}
                    className="text-text-hint hover:text-red text-[13px] bg-transparent border-none cursor-pointer"
                  >✕</button>
                </div>
                {isEditing && (
                  <div className="mt-2 p-3 bg-surface2 rounded-lg">
                    <p className="text-[11px] text-text-secondary mb-2">Color</p>
                    <div className="flex flex-wrap gap-2">
                      {PALETTE.map(pal => (
                        <button
                          key={pal.id}
                          onClick={() => updateDomain(d.id, { color: pal.id as PaletteId })}
                          className="w-[22px] h-[22px] rounded-full cursor-pointer border-2 transition-all hover:scale-110 flex-shrink-0"
                          style={{ background: pal.dot, borderColor: d.color === pal.id ? '#f0f0ec' : 'transparent' }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Categories */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
          <SectionTitle>Categories</SectionTitle>
          <Btn size="xs" onClick={newCat}>+ new category</Btn>
        </div>
        <div className="space-y-2">
          {categories.map(cat => {
            const p = palColor(cat.color)
            const isEditing = editCat === cat.id
            const count = skills.filter(s => s.catId === cat.id).length
            return (
              <div key={cat.id} className="fade-up">
                <div className="flex items-center gap-3 bg-surface border border-border-subtle rounded-lg px-3.5 py-2.5">
                  <button
                    onClick={() => setEditCat(isEditing ? null : cat.id)}
                    className="w-[18px] h-[18px] rounded-full flex-shrink-0 cursor-pointer border-none transition-transform hover:scale-110"
                    style={{ background: p.dot }}
                  />
                  {isEditing
                    ? <input
                        defaultValue={cat.name}
                        onBlur={async e => { await updateCategory(cat.id, { name: e.target.value.trim() || cat.name }) }}
                        onKeyDown={async e => { if (e.key === 'Enter') { await updateCategory(cat.id, { name: (e.target as HTMLInputElement).value.trim() || cat.name }); setEditCat(null) } }}
                        className="flex-1 bg-transparent text-text-primary text-[13px] font-medium border-none outline-none"
                        autoFocus
                      />
                    : <span className="flex-1 text-[13px] font-medium">{cat.name}</span>
                  }
                  <span className="font-mono text-[11px] text-text-hint">{count} skill{count !== 1 ? 's' : ''}</span>
                  {isEditing
                    ? <button onClick={() => setEditCat(null)} className="text-green text-[13px] bg-transparent border-none cursor-pointer">✓</button>
                    : <button onClick={() => setEditCat(cat.id)} className="text-text-hint hover:text-text-primary text-[13px] bg-transparent border-none cursor-pointer">✎</button>
                  }
                  <button
                    onClick={async () => {
                      if (count > 0 && !confirm(`Delete "${cat.name}"? ${count} skill${count !== 1 ? 's' : ''} will become uncategorized.`)) return
                      await deleteCategory(cat.id)
                    }}
                    className="text-text-hint hover:text-red text-[13px] bg-transparent border-none cursor-pointer"
                  >✕</button>
                </div>
                {isEditing && (
                  <div className="mt-2 p-3 bg-surface2 rounded-lg">
                    <p className="text-[11px] text-text-secondary mb-2">Color</p>
                    <div className="flex flex-wrap gap-2">
                      {PALETTE.map(pal => (
                        <button
                          key={pal.id}
                          onClick={() => updateCategory(cat.id, { color: pal.id as PaletteId })}
                          className="w-[22px] h-[22px] rounded-full cursor-pointer border-2 transition-all hover:scale-110 flex-shrink-0"
                          style={{ background: pal.dot, borderColor: cat.color === pal.id ? '#f0f0ec' : 'transparent' }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
