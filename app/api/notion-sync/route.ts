// app/api/notion-sync/route.ts
// ─────────────────────────────────────────────────────────────
// POST /api/notion-sync  (also accepts GET for easy browser testing)
// Fetches all notes from your Notion database, builds excerpts,
// and upserts them into notion_notes_cache in Supabase.
// Uses the service role key — runs server-side only, never exposed.
// ─────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server'
import { createClient }  from '@supabase/supabase-js'
import { fetchNotionNotes, fetchNotionBlocks, extractExcerpt } from '@/lib/notion'

// Service key bypasses RLS — only used server-side here
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST() {
  try {
    // 1. Fetch all note metadata from Notion
    const notes = await fetchNotionNotes()

    // 2. Fetch excerpts in small batches (Notion rate limit ~3 req/sec)
    const BATCH = 4
    for (let i = 0; i < notes.length; i += BATCH) {
      await Promise.all(
        notes.slice(i, i + BATCH).map(async (note) => {
          try {
            const blocks  = await fetchNotionBlocks(note.notion_page_id)
            // fetchNotionBlocks returns HTML — we need raw blocks for excerpt
            // so we re-fetch raw blocks here for excerpt extraction
            const res = await fetch(
              `https://api.notion.com/v1/blocks/${note.notion_page_id}/children?page_size=10`,
              {
                headers: {
                  'Authorization':  `Bearer ${process.env.NOTION_TOKEN}`,
                  'Notion-Version': '2022-06-28',
                },
              }
            )
            if (res.ok) {
              const data = await res.json()
              note.excerpt = extractExcerpt(data.results ?? [])
            }
          } catch {
            note.excerpt = ''
          }
        })
      )
      if (i + BATCH < notes.length) await sleep(350)
    }

    // 3. Upsert into Supabase cache
    const rows = notes.map((n) => ({
      notion_page_id: n.notion_page_id,
      title:          n.title,
      date:           n.date,
      tags:           n.tags,
      skill_names:    n.skill_names,
      excerpt:        n.excerpt,
      notion_url:     n.notion_url,
      last_edited:    n.last_edited,
      synced_at:      new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('notion_notes_cache')
      .upsert(rows, { onConflict: 'notion_page_id' })

    if (error) throw error

    // 4. Delete stale rows (notes deleted from Notion)
    const liveIds = notes.map((n) => n.notion_page_id)
    if (liveIds.length > 0) {
      await supabase
        .from('notion_notes_cache')
        .delete()
        .not('notion_page_id', 'in', `(${liveIds.map((id) => `"${id}"`).join(',')})`)
    }

    return NextResponse.json({ ok: true, synced: notes.length })
  } catch (err) {
    console.error('[notion-sync]', err)
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    )
  }
}

export async function GET() {
  return POST()
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
