# Papatong × Notion — Integration Setup

## What was built

| File | Action |
|------|--------|
| `schema.sql` | Run in Supabase SQL editor |
| `lib/notion.ts` | Copy into your `lib/` folder |
| `app/api/notion-sync/route.ts` | Copy into `app/api/notion-sync/` (create folder) |
| `types/index.ts.append` | Paste contents at bottom of your `types/index.ts` |
| `lib/supabase.ts.append` | Paste contents at bottom of your `lib/supabase.ts` |
| `lib/store.ts.patch` | Follow the 5 edits described in the file |
| `components/record/NotionNotesPanel.tsx` | Copy into `components/record/` |
| `components/record/PracticeJournal.tsx.patch` | Follow the 2 edits described in the file |

---

## Step 1 — Supabase schema

Open your Supabase dashboard → SQL Editor → paste and run `schema.sql`.
Creates 2 tables: `notion_notes_cache` and `note_entry_links`.

---

## Step 2 — Notion integration setup

### Create an integration
1. Go to https://www.notion.so/my-integrations
2. Click **New integration**
3. Name it "Papatong", set type to Internal
4. Copy the **Internal Integration Secret** (starts with `secret_`)

### Connect your database
1. Open your notes database in Notion
2. Click ··· → **Connections** → **Add connection** → Papatong
3. Copy your **Database ID** from the URL:
   `https://notion.so/yourworkspace/[DATABASE_ID]?v=...`
   It's the 32-character string before the `?`

### Check your database properties
The integration expects these exact property names (case-sensitive):

| Property | Type |
|----------|------|
| Title | title (default) |
| Date | date |
| Tags | multi_select |
| Related skill | rich_text or multi_select |

If your property names differ, update `lib/notion.ts` lines ~75–95.

---

## Step 3 — Environment variables

Add to your `.env.local`:

```bash
# Already there:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Add these:
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_NOTES_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_KEY=eyJ...   # Supabase → Settings → API → service_role key
```

Add the same three new vars in **Vercel dashboard → Settings → Environment Variables**.

---

## Step 4 — Install files

```
lib/notion.ts                              → copy to lib/notion.ts
app/api/notion-sync/route.ts               → copy to app/api/notion-sync/route.ts
components/record/NotionNotesPanel.tsx     → copy to components/record/NotionNotesPanel.tsx
```

Then apply the patch files (they have instructions inside):
- `lib/supabase.ts.append` → paste at bottom of `lib/supabase.ts`
- `types/index.ts.append` → paste at bottom of `types/index.ts`
- `lib/store.ts.patch` → follow 5 edits described inside
- `components/record/PracticeJournal.tsx.patch` → follow 2 edits described inside

---

## Step 5 — First sync

Run locally:
```bash
npm run dev
# then in browser:
http://localhost:3000/api/notion-sync
```

Or hit the **↻ sync** button inside any practice entry detail.

---

## Step 6 — Auto-sync with Vercel Cron (optional, free)

Update your `vercel.json`:

```json
{
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/notion-sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

This syncs every hour automatically. Vercel free tier includes 2 cron jobs.

---

## How it works in the app

1. Open **Record → Practice Journal**
2. Click any practice entry
3. Scroll to the new **Notion notes** section at the bottom
4. Click **+ Link note** → search by title, tag, or skill name
5. Click a note to link it — it appears instantly
6. Click **↗** on any linked note to open it in Notion
7. Click **↻ sync** to pull in new notes from Notion

---

## Total cost: $0

- Supabase free tier: 500MB — the cache table is tiny
- Notion API: unlimited reads, free forever
- Vercel free tier: covers cron + API routes
