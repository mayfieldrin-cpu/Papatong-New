import type { Skill, PracticeLog, PracticeEntry, SkillStats, WeeklyVolume } from '@/types'

// ── Helpers ──────────────────────────────────────
function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function isoWeek(date: Date): string {
  return startOfWeek(date).toISOString().slice(0, 10)
}

// ── Per-skill log helpers ─────────────────────────
export function logsForSkill(logs: PracticeLog[], skillId: string): PracticeLog[] {
  return logs.filter(l => l.skill_id === skillId && l.done)
}

export function practiceCount(logs: PracticeLog[], skillId: string): number {
  return logsForSkill(logs, skillId).length
}

export function lastPracticed(logs: PracticeLog[], skillId: string): string | null {
  const l = logsForSkill(logs, skillId)[0]
  return l ? l.practiced_at.slice(0, 10) : null
}

// ── Practice Momentum Score (0–100) ──────────────
// Rewards: high total frequency × recent practice × consistency
// Penalizes: long gap since last practice
export function momentumScore(logs: PracticeLog[], skillId: string): number {
  const skillLogs = logsForSkill(logs, skillId)
  if (!skillLogs.length) return 0

  const total = skillLogs.length
  const lastDate = skillLogs[0].practiced_at.slice(0, 10)
  const gap = daysSince(lastDate) ?? 999

  // Recency factor: full score within 2 days, decays to 0 at 30 days
  const recency = Math.max(0, 1 - gap / 30)

  // Frequency factor: log scale, caps at 50 sessions
  const frequency = Math.min(1, Math.log10(total + 1) / Math.log10(51))

  // Consistency: how many of the last 4 weeks had at least one session
  const now = new Date()
  let consistencyHits = 0
  for (let w = 0; w < 4; w++) {
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - w * 7)
    const weekStart = startOfWeek(weekAgo)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)
    const hasLog = skillLogs.some(l => {
      const d = new Date(l.practiced_at)
      return d >= weekStart && d < weekEnd
    })
    if (hasLog) consistencyHits++
  }
  const consistency = consistencyHits / 4

  // Weighted combination
  const score = (recency * 0.4 + frequency * 0.35 + consistency * 0.25) * 100
  return Math.round(Math.min(100, Math.max(0, score)))
}

// ── Skill Neglect Score (0–100) ───────────────────
// High score = needs attention. Based on:
// - Days since last practice relative to that skill's usual frequency
// - Priority flag amplifies the score
export function neglectScore(logs: PracticeLog[], skill: Skill): number {
  const skillLogs = logsForSkill(logs, skill.id)
  if (!skillLogs.length) return skill.priority ? 80 : 40

  const lastDate = skillLogs[0].practiced_at.slice(0, 10)
  const gap = daysSince(lastDate) ?? 999

  // Calculate usual frequency: total sessions / weeks since first session
  const firstDate = new Date(skillLogs[skillLogs.length - 1].practiced_at)
  const weeksSinceFirst = Math.max(1, (Date.now() - firstDate.getTime()) / (7 * 86400000))
  const usualFreqPerWeek = skillLogs.length / weeksSinceFirst

  // Expected days between sessions based on usual frequency
  const expectedGap = usualFreqPerWeek > 0 ? 7 / usualFreqPerWeek : 14

  // How overdue is it (0 = on schedule, 1 = 2× overdue, etc.)
  const overdueRatio = Math.max(0, (gap - expectedGap) / expectedGap)

  let score = Math.min(100, overdueRatio * 50)

  // Boost for priority skills — they matter more
  if (skill.priority) score = Math.min(100, score * 1.3 + 10)

  // Boost for low confidence — beginner skills need more attention
  if (skill.confidence === 1) score = Math.min(100, score + 8)
  if (skill.confidence === 2) score = Math.min(100, score + 4)

  return Math.round(score)
}

// ── Full skill stats ──────────────────────────────
export function computeSkillStats(logs: PracticeLog[], skill: Skill): SkillStats {
  const skillLogs = logsForSkill(logs, skill.id)
  const last = skillLogs[0]?.practiced_at.slice(0, 10) ?? null
  const gap = daysSince(last)

  // Weekly avg over last 8 weeks
  const now = new Date()
  let weeklyCount = 0
  for (const log of skillLogs) {
    const d = new Date(log.practiced_at)
    const weeksAgo = (Date.now() - d.getTime()) / (7 * 86400000)
    if (weeksAgo <= 8) weeklyCount++
  }
  const weeklyAvg = weeklyCount / 8

  return {
    skillId:               skill.id,
    count:                 skillLogs.length,
    lastPracticed:         last,
    daysSinceLastPractice: gap,
    weeklyAvg,
    momentumScore:         momentumScore(logs, skill.id),
    neglectScore:          neglectScore(logs, skill),
  }
}

// ── Practice Volume Curve ─────────────────────────
// Returns weekly session counts + 4-week rolling average
// for the last N weeks (default 24 = ~6 months)
export function practiceVolumeCurve(entries: PracticeEntry[], weeks = 24): WeeklyVolume[] {
  const now = new Date()

  // Build week buckets
  const buckets: Record<string, number> = {}
  for (let w = 0; w < weeks; w++) {
    const d = new Date(now)
    d.setDate(now.getDate() - w * 7)
    buckets[isoWeek(d)] = 0
  }

  // Count entries per week
  for (const entry of entries) {
    const week = isoWeek(new Date(entry.practiced_at))
    if (week in buckets) buckets[week]++
  }

  // Sort chronologically
  const sorted = Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, count]) => ({ weekStart, count, movingAvg: 0 }))

  // Compute 4-week rolling average
  for (let i = 0; i < sorted.length; i++) {
    const window = sorted.slice(Math.max(0, i - 3), i + 1)
    const avg = window.reduce((s, w) => s + w.count, 0) / window.length
    sorted[i].movingAvg = Math.round(avg * 10) / 10
  }

  return sorted
}

// ── Suggestion ranking ────────────────────────────
// Priority gate + confidence × neglect score
export function suggestionRank(logs: PracticeLog[], skill: Skill): number {
  if (!skill.priority) return -1
  const neglect = neglectScore(logs, skill)
  const confPenalty = 5 - (skill.confidence ?? 1) // lower confidence = higher rank
  return neglect + confPenalty * 5
}

export function sortedSuggestions(logs: PracticeLog[], skills: Skill[], catId: string): Skill[] {
  return skills
    .filter(s => s.catId === catId && s.priority)
    .sort((a, b) => suggestionRank(logs, b) - suggestionRank(logs, a))
}
