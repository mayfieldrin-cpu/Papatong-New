// lib/notion.ts
// ─────────────────────────────────────────────────────────────
// Read-only Notion integration for Papatong.
// Never writes back to Notion — your app only reads.
// Expects your Notion database to have these properties:
//   Title  (title type — default)
//   Date   (date type)
//   Tags   (multi_select type)
//   Related skill  (rich_text OR multi_select type)
// Property names are case-sensitive. Adjust below if yours differ.
// ─────────────────────────────────────────────────────────────

const NOTION_API     = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

function headers() {
  return {
    'Authorization':  `Bearer ${process.env.NOTION_TOKEN}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type':   'application/json',
  }
}

// ── Types ─────────────────────────────────────────────────────

export interface NotionNote {
  notion_page_id: string
  title:          string
  date:           string | null   // 'YYYY-MM-DD'
  tags:           string[]
  skill_names:    string[]
  excerpt:        string          // first plain-text paragraph, max 120 chars
  notion_url:     string
  last_edited:    string          // ISO timestamp
}

// ── Fetch all notes from your database ───────────────────────

export async function fetchNotionNotes(): Promise<NotionNote[]> {
  const dbId = process.env.NOTION_NOTES_DB_ID
  if (!dbId) throw new Error('NOTION_NOTES_DB_ID is not set')

  const results: NotionNote[] = []
  let cursor: string | undefined

  // Paginate through all results (Notion returns max 100 per page)
  do {
    const body: Record<string, unknown> = {
      sorts:     [{ property: 'Date', direction: 'descending' }],
      page_size: 100,
    }
    if (cursor) body.start_cursor = cursor

    const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
      method:  'POST',
      headers: headers(),
      body:    JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Notion query failed: ${(err as Record<string,string>).message ?? res.status}`)
    }

    const data = await res.json()
    for (const page of data.results ?? []) {
      results.push(normalizePage(page))
    }
    cursor = data.has_more ? data.next_cursor : undefined
  } while (cursor)

  return results
}

// ── Fetch full block content for a single note ────────────────
// Used when the user opens a note to read it in full

export async function fetchNotionBlocks(pageId: string): Promise<string> {
  const res = await fetch(`${NOTION_API}/blocks/${pageId}/children?page_size=100`, {
    headers: headers(),
  })
  if (!res.ok) throw new Error('Failed to fetch Notion blocks')

  const data = await res.json()
  return blocksToHtml(data.results ?? [])
}

// ── Normalize a raw Notion page → NotionNote ─────────────────

function normalizePage(page: Record<string, unknown>): NotionNote {
  const props = (page.properties ?? {}) as Record<string, unknown>

  // Title — find the property with type 'title'
  const titleProp  = Object.values(props).find((p) => (p as Record<string,unknown>).type === 'title') as Record<string,unknown> | undefined
  const titleArr   = (titleProp?.title as unknown[]) ?? []
  const title      = titleArr.map((t) => ((t as Record<string,unknown>).plain_text as string) ?? '').join('') || 'Untitled'

  // Date
  const dateProp   = (props['Date'] ?? props['date']) as Record<string, unknown> | undefined
  const date       = ((dateProp?.date as Record<string,unknown>)?.start as string) ?? null

  // Tags multi-select
  const tagsProp   = (props['Tags'] ?? props['tags']) as Record<string, unknown> | undefined
  const tags       = ((tagsProp?.multi_select as unknown[]) ?? [])
    .map((t) => (t as Record<string,unknown>).name as string)
    .filter(Boolean)

  // Related skill — supports rich_text, multi_select, or relation
  const skillProp  = (
    props['Related skill'] ?? props['Skill'] ?? props['Skills'] ?? props['related_skill']
  ) as Record<string, unknown> | undefined
  const skill_names = extractSkillNames(skillProp)

  return {
    notion_page_id: page.id as string,
    title,
    date,
    tags,
    skill_names,
    excerpt:     '',        // populated separately via extractExcerpt
    notion_url:  (page.url as string) ?? '',
    last_edited: (page.last_edited_time as string) ?? new Date().toISOString(),
  }
}

function extractSkillNames(prop: Record<string, unknown> | undefined): string[] {
  if (!prop) return []
  if (prop.type === 'rich_text') {
    return ((prop.rich_text as unknown[]) ?? [])
      .map((t) => (t as Record<string,unknown>).plain_text as string)
      .filter(Boolean)
  }
  if (prop.type === 'multi_select') {
    return ((prop.multi_select as unknown[]) ?? [])
      .map((t) => (t as Record<string,unknown>).name as string)
      .filter(Boolean)
  }
  // relation type — only IDs available without extra fetches; return empty
  return []
}

// ── Convert Notion blocks → HTML (matching Tiptap/tiptap-editor styles) ──

function blocksToHtml(blocks: unknown[]): string {
  const parts: string[] = []
  let inBullet = false
  let inNumbered = false

  function closeLists() {
    if (inBullet)   { parts.push('</ul>'); inBullet = false }
    if (inNumbered) { parts.push('</ol>'); inNumbered = false }
  }

  for (const block of blocks) {
    const b = block as Record<string, unknown>
    const type = b.type as string
    const content = (b[type] as Record<string, unknown>) ?? {}
    const rt = (content.rich_text as unknown[]) ?? []
    const text = richTextToHtml(rt)
    const plain = rt.map((t) => (t as Record<string,unknown>).plain_text as string).join('')

    switch (type) {
      case 'heading_1':
        closeLists()
        parts.push(`<h1>${text}</h1>`)
        break
      case 'heading_2':
        closeLists()
        parts.push(`<h2>${text}</h2>`)
        break
      case 'heading_3':
        closeLists()
        parts.push(`<h3>${text}</h3>`)
        break
      case 'paragraph':
        closeLists()
        parts.push(plain ? `<p>${text}</p>` : '<p></p>')
        break
      case 'bulleted_list_item':
        if (!inBullet) { closeLists(); parts.push('<ul>'); inBullet = true }
        parts.push(`<li>${text}</li>`)
        break
      case 'numbered_list_item':
        if (!inNumbered) { closeLists(); parts.push('<ol>'); inNumbered = true }
        parts.push(`<li>${text}</li>`)
        break
      case 'quote':
        closeLists()
        parts.push(`<blockquote>${text}</blockquote>`)
        break
      case 'code':
        closeLists()
        parts.push(`<pre><code>${escapeHtml(plain)}</code></pre>`)
        break
      case 'divider':
        closeLists()
        parts.push('<hr/>')
        break
      case 'callout':
        closeLists()
        parts.push(`<p><strong>${text}</strong></p>`)
        break
      default:
        if (plain) { closeLists(); parts.push(`<p>${text}</p>`) }
    }
  }
  closeLists()
  return parts.join('\n')
}

function richTextToHtml(rt: unknown[]): string {
  return rt.map((item) => {
    const t = item as Record<string, unknown>
    const plain = (t.plain_text as string) ?? ''
    const ann   = (t.annotations as Record<string, unknown>) ?? {}
    let html = escapeHtml(plain)
    if (ann.code)          html = `<code>${html}</code>`
    if (ann.bold)          html = `<strong>${html}</strong>`
    if (ann.italic)        html = `<em>${html}</em>`
    if (ann.strikethrough) html = `<s>${html}</s>`
    const href = (t.href as string) ?? ((t as Record<string,unknown>).url as string)
    if (href) html = `<a href="${href}" target="_blank" rel="noopener">${html}</a>`
    return html
  }).join('')
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Extract plain-text excerpt from blocks ────────────────────

export function extractExcerpt(blocks: unknown[], maxChars = 120): string {
  for (const block of blocks) {
    const b = block as Record<string, unknown>
    const type = b.type as string
    if (!['paragraph', 'quote', 'bulleted_list_item', 'numbered_list_item', 'callout'].includes(type)) continue
    const content = (b[type] as Record<string,unknown>) ?? {}
    const rt = (content.rich_text as unknown[]) ?? []
    const plain = rt.map((t) => (t as Record<string,unknown>).plain_text as string).join('').trim()
    if (plain) return plain.length > maxChars ? plain.slice(0, maxChars) + '…' : plain
  }
  return ''
}
