# Papatong

Creative skill practice tracker — built with Next.js 14, TypeScript, Tailwind, Zustand, Supabase.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Environment variables
Copy `.env.local.example` to `.env.local` and fill in your values:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_MW_THESAURUS_KEY=your-key  # from dictionaryapi.com
```

### 3. Run locally
```bash
npm run dev
```
Open http://localhost:3000

### 4. Deploy to Vercel
Push to GitHub, connect repo to Vercel, add the same env vars in Vercel dashboard → Settings → Environment Variables.

## Supabase schema
Your existing schema works as-is. No changes needed.

## Project structure
```
app/
  practice/       Session Builder + Explore tab
  record/         Practice Journal + Visual Creation
  studio/         Library + Analytics
  settings/       Categories + Domains
components/
  practice/       PracticeView, SessionBuilder, ExploreTab
  record/         RecordView, PracticeJournal
  studio/         StudioView, LibrarySection, AnalyticsSection, SettingsView
  shared/         Nav, ui primitives, DataProvider
lib/
  algorithms.ts   Momentum score, Neglect score, Volume curve
  store.ts        Zustand global state + all DB operations
  supabase.ts     Supabase client + data normalization
  palette.ts      Color system + confidence levels
types/
  index.ts        All TypeScript types
```
