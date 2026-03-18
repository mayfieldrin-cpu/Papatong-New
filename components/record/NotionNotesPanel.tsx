'use client'
// components/record/NotionNotesPanel.tsx
// ─────────────────────────────────────────────────────────────
// Shown inside the entry detail slide-in in PracticeJournal.
// Lets the user browse cached Notion notes and link them to
// the current practice entry. Read-only — never writes to Notion.
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { SectionTitle, Input } from '@/components/shared/ui'
import type { NotionNote } from '@/types'
import clsx from 'clsx'

interface Props {
  entryId: string
}

export default function NotionNotesPanel({ entryId }: Props) {
  const { notionNotes, notionLinks, linkNotionNote, unlinkNotionNote } = useStore()

  const [showPicker, setShowPicker]   = useState(false)
  const [search, setSearch]           = useState('')
  const [syncing, setSyncing]         = useState(false)
  const [syncMsg, setSyncMsg]         = useState<string | null>(null)

  // Notes already linked to this entry
  const linkedIds = useMemo(
    () => new Set(notionLinks.filter(l => l.entry_id === entryId).map(l => l.notion_page_id)),
    [notionLinks, entryId]
  )

  const linkedNotes = useMemo(
    () => notionNotes.filter(n => linkedIds.has(n.notion_page_id)),
    [notionNotes, linkedIds]
  )

  // Notes available to link (not yet linked, filtered by search)
  const available = useMemo(() => {
    const q = search.toLowerCase().trim()
    return notionNotes.filter(n => {
      if (linkedIds.has(n.notion_page_id)) return false
      if (!q) return true
      return (
        n.title.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q)) ||
        n.skill_names.some(s => s.toLowerCase().includes(q)) ||
        n.excerpt.toLowerCase().includes(q)
      )
    })
  }, [notionNotes, linkedIds, search])

  async function handleSync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res  = await fetch('/api/notion-sync', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setSyncMsg(`✓ Synced ${data.synced} notes`)
        // Reload Notion data into store
        await useStore.getState().loadNotionNotes()
      } else {
        setSyncMsg('Sync failed — check console')
      }
    } catch {
      setSyncMsg('Sync failed — check console')
    }
    setSyncing(false)
    setTimeout(() => setSyncMsg(null), 3000)
  }

  return (
    <div className="mt-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-2.5">
        <SectionTitle>Notion notes</SectionTitle>
        <div className="flex items-center gap-2">
          {syncMsg && (
            <span className="font-mono text-[10px] text-green">{syncMsg}</span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="font-mono text-[10px] text-text-hint hover:text-text-secondary bg-transparent border-none cursor-pointer disabled:opacity-40 transition-colors"
          >
            {syncing ? 'syncing…' : '↻ sync'}
          </button>
          <button
            onClick={() => { setShowPicker(v => !v); setSearch('') }}
            className="text-[11px] text-text-secondary hover:text-text-primary bg-transparent border-none cursor-pointer transition-colors"
          >
            {showPicker ? 'Done' : '+ Link note'}
          </button>
        </div>
      </div>

      {/* Note picker */}
      {showPicker && (
        <div className="mb-3 fade-up">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, tag, skill…"
            className="mb-2"
          />
          {notionNotes.length === 0 ? (
            <p className="text-[12px] text-text-hint italic px-1">
              No notes synced yet.{' '}
              <button
                onClick={handleSync}
                className="underline underline-offset-2 bg-transparent border-none cursor-pointer text-text-hint hover:text-text-secondary"
              >
                Sync now
              </button>
            </p>
          ) : available.length === 0 ? (
            <p className="text-[12px] text-text-hint italic px-1">
              {search ? 'No notes match.' : 'All notes already linked.'}
            </p>
          ) : (
            <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
              {available.slice(0, 12).map(note => (
                <NotePickerItem
                  key={note.notion_page_id}
                  note={note}
                  onLink={async () => {
                    await linkNotionNote(note.notion_page_id, entryId)
                    setShowPicker(false)
                    setSearch('')
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Linked notes list */}
      {linkedNotes.length === 0 && !showPicker ? (
        <p className="text-[12px] text-text-hint italic">No Notion notes linked yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {linkedNotes.map(note => (
            <LinkedNoteItem
              key={note.notion_page_id}
              note={note}
              onUnlink={() => unlinkNotionNote(note.notion_page_id, entryId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Linked note row ───────────────────────────────────────────

function LinkedNoteItem({
  note,
  onUnlink,
}: {
  note: NotionNote
  onUnlink: () => void
}) {
  return (
    <div className="flex items-center gap-3 bg-surface border border-border-subtle rounded-lg px-3 py-2.5 group hover:border-border-default transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-text-primary truncate">{note.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {note.date && (
            <span className="font-mono text-[10px] text-text-hint">{note.date}</span>
          )}
          {note.tags.slice(0, 2).map(t => (
            <span key={t} className="font-mono text-[9px] bg-surface2 text-text-hint px-1.5 py-[1px] rounded-full">
              {t}
            </span>
          ))}
          {note.skill_names.slice(0, 1).map(s => (
            <span key={s} className="font-mono text-[9px] text-text-hint italic">{s}</span>
          ))}
        </div>
        {note.excerpt && (
          <p className="text-[11px] text-text-secondary mt-1 truncate leading-relaxed">
            {note.excerpt}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <a
          href={note.notion_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] text-text-hint hover:text-text-secondary transition-colors"
          title="Open in Notion"
          onClick={e => e.stopPropagation()}
        >
          ↗
        </a>
        <button
          onClick={onUnlink}
          className="text-[11px] text-text-hint hover:text-red bg-transparent border-none cursor-pointer transition-colors"
          title="Unlink"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// ── Picker row ────────────────────────────────────────────────

function NotePickerItem({
  note,
  onLink,
}: {
  note: NotionNote
  onLink: () => void
}) {
  return (
    <button
      onClick={onLink}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border-subtle hover:border-border-default text-left cursor-pointer transition-colors w-full group"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-text-primary truncate">{note.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {note.date && (
            <span className="font-mono text-[10px] text-text-hint">{note.date}</span>
          )}
          {note.tags.slice(0, 2).map(t => (
            <span key={t} className="font-mono text-[9px] text-text-hint">{t}</span>
          ))}
        </div>
      </div>
      <span className="text-[11px] text-text-hint group-hover:text-text-secondary transition-colors flex-shrink-0">
        + link
      </span>
    </button>
  )
}
