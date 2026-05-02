import type { PracticeMode } from './practiceData'

export type DurationOption = 0 | 60 | 180

export interface TypingStatsInput {
  prompt: string
  typedText: string
  startedAt: number | null
  finishedAt: number | null
  errorCount: number
  now: number
}

export interface TypingStats {
  elapsedSeconds: number
  progress: number
  correctChars: number
  attemptedChars: number
  accuracy: number
  wpm: number
  cpm: number
  errorCount: number
}

export interface PracticeResult {
  id: string
  mode: PracticeMode
  prompt: string
  accuracy: number
  wpm: number
  cpm: number
  errorCount: number
  elapsedSeconds: number
  completedAt: string
}

export interface HistorySummary {
  runCount: number
  bestWpm: number
  averageWpm: number
  averageAccuracy: number
}

export const DURATION_OPTIONS: Array<{ value: DurationOption; label: string }> = [
  { value: 0, label: '不限时' },
  { value: 60, label: '1 分钟' },
  { value: 180, label: '3 分钟' }
]

export function countCorrectCharacters(prompt: string, typedText: string) {
  const promptCharacters = Array.from(prompt)

  return Array.from(typedText).reduce((total, character, index) => {
    return total + (character === promptCharacters[index] ? 1 : 0)
  }, 0)
}

export function calculateTypingStats({
  prompt,
  typedText,
  startedAt,
  finishedAt,
  errorCount,
  now
}: TypingStatsInput): TypingStats {
  const endTime = finishedAt ?? now
  const elapsedSeconds = startedAt ? Math.max((endTime - startedAt) / 1000, 0) : 0
  const elapsedMinutes = Math.max(elapsedSeconds / 60, 1 / 60)
  const attemptedChars = Array.from(typedText).length
  const correctChars = countCorrectCharacters(prompt, typedText)
  const accuracy = attemptedChars === 0 ? 100 : Math.round((correctChars / attemptedChars) * 100)
  const cpm = startedAt ? Math.round(correctChars / elapsedMinutes) : 0
  const wpm = startedAt ? Math.round(correctChars / 5 / elapsedMinutes) : 0
  const promptLength = Array.from(prompt).length
  const progress = promptLength === 0 ? 0 : Math.min(100, Math.round((attemptedChars / promptLength) * 100))

  return {
    elapsedSeconds,
    progress,
    correctChars,
    attemptedChars,
    accuracy,
    wpm,
    cpm,
    errorCount
  }
}

export function formatElapsedTime(seconds: number) {
  const roundedSeconds = Math.floor(seconds)
  const minutes = Math.floor(roundedSeconds / 60)
  const restSeconds = roundedSeconds % 60

  return `${minutes}:${restSeconds.toString().padStart(2, '0')}`
}

export function createPracticeResult(
  mode: PracticeMode,
  prompt: string,
  stats: TypingStats
): PracticeResult {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    mode,
    prompt,
    accuracy: stats.accuracy,
    wpm: stats.wpm,
    cpm: stats.cpm,
    errorCount: stats.errorCount,
    elapsedSeconds: stats.elapsedSeconds,
    completedAt: new Date().toISOString()
  }
}

export function summarizeHistory(history: PracticeResult[]): HistorySummary {
  if (history.length === 0) {
    return {
      runCount: 0,
      bestWpm: 0,
      averageWpm: 0,
      averageAccuracy: 0
    }
  }

  const totals = history.reduce(
    (summary, item) => ({
      wpm: summary.wpm + item.wpm,
      accuracy: summary.accuracy + item.accuracy,
      bestWpm: Math.max(summary.bestWpm, item.wpm)
    }),
    { wpm: 0, accuracy: 0, bestWpm: 0 }
  )

  return {
    runCount: history.length,
    bestWpm: totals.bestWpm,
    averageWpm: Math.round(totals.wpm / history.length),
    averageAccuracy: Math.round(totals.accuracy / history.length)
  }
}
