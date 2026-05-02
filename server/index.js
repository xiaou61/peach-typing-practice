import { randomBytes, createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import cookieParser from 'cookie-parser'
import express from 'express'
import rateLimit from 'express-rate-limit'
import { query, withTransaction } from './db.js'

const envResult = dotenv.config()
const fileEnv = envResult.parsed ?? {}

const app = express()
const port = Number(process.env.API_PORT ?? fileEnv.API_PORT ?? 3001)
const sessionDays = Number(process.env.SESSION_DAYS ?? fileEnv.SESSION_DAYS ?? 7)
const sessionCookieName = 'typing_session'
const maxCustomTextChars = 12000
const passwordMinLength = 6
const currentDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = dirname(currentDir)
const distDir = join(projectRoot, 'dist')

app.use(express.json({ limit: '300kb' }))
app.use(cookieParser())

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'rate_limited',
      message: '请求太频繁，请稍后再试。'
    }
  }
})

function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next)
  }
}

function sendData(response, data, status = 200) {
  response.status(status).json({ data })
}

function sendError(response, status, code, message, details) {
  response.status(status).json({
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  })
}

function sanitizeName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 24)
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
    .slice(0, maxCustomTextChars)
}

function sessionHash(token) {
  return createHash('sha256').update(token).digest('hex')
}

function createSessionToken() {
  return randomBytes(32).toString('base64url')
}

function setSessionCookie(response, token) {
  response.cookie(sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionDays * 24 * 60 * 60 * 1000
  })
}

function clearSessionCookie(response) {
  response.clearCookie(sessionCookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  })
}

function getFriendlyServerError(error) {
  if (error?.code === 'ECONNREFUSED' && error?.port) {
    return `当前连不上数据库服务（127.0.0.1:${error.port}）。请先启动 PostgreSQL 再试。`
  }

  if (error?.code === '3D000') {
    return '数据库还没准备好，请先创建数据库并执行迁移。'
  }

  if (error?.code === '28P01') {
    return '数据库账号或密码不对，请检查 .env 里的 DATABASE_URL。'
  }

  return '服务器暂时出错，请稍后再试。'
}

async function createSession(response, userId) {
  const token = createSessionToken()
  const hashedToken = sessionHash(token)
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000)

  await query(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
    [hashedToken, userId, expiresAt]
  )
  setSessionCookie(response, token)
}

function mapHistory(row) {
  return {
    id: row.id,
    mode: row.mode,
    prompt: row.prompt,
    accuracy: row.accuracy,
    wpm: row.wpm,
    cpm: row.cpm,
    errorCount: row.error_count,
    elapsedSeconds: row.elapsed_seconds,
    completedAt: row.completed_at.toISOString()
  }
}

function mapCustomPrompt(row) {
  return {
    id: row.id,
    title: row.title,
    text: row.text,
    createdAt: row.created_at.toISOString()
  }
}

function countStreakDays(days) {
  if (days.length === 0) {
    return { currentStreakDays: 0, bestStreakDays: 0 }
  }

  const orderedDays = [...days]
    .map((value) => new Date(value))
    .sort((left, right) => right.getTime() - left.getTime())

  const oneDayMs = 24 * 60 * 60 * 1000
  let bestStreakDays = 1
  let runningStreak = 1

  for (let index = 1; index < orderedDays.length; index += 1) {
    const difference = orderedDays[index - 1].getTime() - orderedDays[index].getTime()
    if (difference === oneDayMs) {
      runningStreak += 1
      bestStreakDays = Math.max(bestStreakDays, runningStreak)
    } else if (difference > oneDayMs) {
      runningStreak = 1
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today.getTime() - oneDayMs)
  const latestDay = orderedDays[0]
  latestDay.setHours(0, 0, 0, 0)

  let currentStreakDays = 0
  if (latestDay.getTime() === today.getTime() || latestDay.getTime() === yesterday.getTime()) {
    currentStreakDays = 1
    for (let index = 1; index < orderedDays.length; index += 1) {
      const previous = new Date(orderedDays[index - 1])
      const current = new Date(orderedDays[index])
      previous.setHours(0, 0, 0, 0)
      current.setHours(0, 0, 0, 0)

      if (previous.getTime() - current.getTime() !== oneDayMs) break
      currentStreakDays += 1
    }
  }

  return { currentStreakDays, bestStreakDays }
}

function createEmptyStats() {
  return {
    runCount: 0,
    averageWpm: 0,
    bestWpm: 0,
    averageAccuracy: 0,
    bestAccuracy: 0,
    averageCpm: 0,
    bestCpm: 0,
    totalPracticeSeconds: 0,
    totalErrors: 0,
    completedToday: 0,
    completedThisWeek: 0,
    practiceSecondsThisWeek: 0,
    currentStreakDays: 0,
    bestStreakDays: 0,
    dailyTrend: [],
    modeBreakdown: []
  }
}

async function fetchProfile(userId) {
  const userResult = await query(
    'SELECT id, username, created_at FROM users WHERE id = $1',
    [userId]
  )

  const user = userResult.rows[0]
  if (!user) return null

  await query(
    `INSERT INTO profile_settings (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  )

  const [
    settingsResult,
    historyResult,
    customPromptsResult,
    aggregateStatsResult,
    dailyTrendResult,
    modeBreakdownResult,
    streakDaysResult
  ] = await Promise.all([
    query(
      `SELECT duration, sound_enabled, auto_next, auto_next_delay_ms
       FROM profile_settings
       WHERE user_id = $1`,
      [userId]
    ),
    query(
      `SELECT id, mode, prompt, accuracy, wpm, cpm, error_count, elapsed_seconds, completed_at
       FROM practice_results
       WHERE user_id = $1
       ORDER BY completed_at DESC
       LIMIT 50`,
      [userId]
    ),
    query(
      `SELECT id, title, text, created_at
       FROM custom_prompts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    ),
    query(
      `SELECT
         COUNT(*)::int AS run_count,
         COALESCE(ROUND(AVG(wpm)), 0)::int AS average_wpm,
         COALESCE(MAX(wpm), 0)::int AS best_wpm,
         COALESCE(ROUND(AVG(accuracy)), 0)::int AS average_accuracy,
         COALESCE(MAX(accuracy), 0)::int AS best_accuracy,
         COALESCE(ROUND(AVG(cpm)), 0)::int AS average_cpm,
         COALESCE(MAX(cpm), 0)::int AS best_cpm,
         COALESCE(ROUND(SUM(elapsed_seconds)), 0)::int AS total_practice_seconds,
         COALESCE(SUM(error_count), 0)::int AS total_errors
       FROM practice_results
       WHERE user_id = $1`,
      [userId]
    ),
    query(
      `SELECT
         TO_CHAR(day::date, 'MM-DD') AS label,
         day::date AS day,
         COUNT(pr.id)::int AS session_count,
         COALESCE(ROUND(AVG(pr.wpm)), 0)::int AS average_wpm,
         COALESCE(ROUND(AVG(pr.accuracy)), 0)::int AS average_accuracy,
         COALESCE(ROUND(SUM(pr.elapsed_seconds)), 0)::int AS practice_seconds
       FROM generate_series(current_date - interval '6 day', current_date, interval '1 day') AS day
       LEFT JOIN practice_results pr
         ON pr.user_id = $1
        AND pr.completed_at >= day
        AND pr.completed_at < day + interval '1 day'
       GROUP BY day
       ORDER BY day`,
      [userId]
    ),
    query(
      `SELECT
         mode,
         COUNT(*)::int AS run_count,
         COALESCE(ROUND(AVG(wpm)), 0)::int AS average_wpm,
         COALESCE(MAX(wpm), 0)::int AS best_wpm,
         COALESCE(ROUND(AVG(accuracy)), 0)::int AS average_accuracy
       FROM practice_results
       WHERE user_id = $1
       GROUP BY mode`,
      [userId]
    ),
    query(
      `SELECT DISTINCT completed_at::date AS day
       FROM practice_results
       WHERE user_id = $1
       ORDER BY day DESC`,
      [userId]
    )
  ])

  const settings = settingsResult.rows[0]
  const history = historyResult.rows.map(mapHistory)
  const aggregate = aggregateStatsResult.rows[0]
  const dailyTrend = dailyTrendResult.rows.map((row) => ({
    label: row.label,
    date: row.day.toISOString().slice(0, 10),
    sessionCount: row.session_count,
    averageWpm: row.average_wpm,
    averageAccuracy: row.average_accuracy,
    practiceSeconds: row.practice_seconds
  }))
  const completedThisWeek = dailyTrend.reduce((total, item) => total + item.sessionCount, 0)
  const practiceSecondsThisWeek = dailyTrend.reduce((total, item) => total + item.practiceSeconds, 0)
  const streakSummary = countStreakDays(streakDaysResult.rows.map((row) => row.day))
  const knownModes = ['chinese', 'english', 'mixed', 'custom']
  const modeMap = new Map(
    modeBreakdownResult.rows.map((row) => [
      row.mode,
      {
        mode: row.mode,
        runCount: row.run_count,
        averageWpm: row.average_wpm,
        bestWpm: row.best_wpm,
        averageAccuracy: row.average_accuracy
      }
    ])
  )
  const modeBreakdown = knownModes.map((mode) => {
    return modeMap.get(mode) ?? {
      mode,
      runCount: 0,
      averageWpm: 0,
      bestWpm: 0,
      averageAccuracy: 0
    }
  })
  const stats = aggregate?.run_count
    ? {
        runCount: aggregate.run_count,
        averageWpm: aggregate.average_wpm,
        bestWpm: aggregate.best_wpm,
        averageAccuracy: aggregate.average_accuracy,
        bestAccuracy: aggregate.best_accuracy,
        averageCpm: aggregate.average_cpm,
        bestCpm: aggregate.best_cpm,
        totalPracticeSeconds: aggregate.total_practice_seconds,
        totalErrors: aggregate.total_errors,
        completedToday: dailyTrend.at(-1)?.sessionCount ?? 0,
        completedThisWeek,
        practiceSecondsThisWeek,
        currentStreakDays: streakSummary.currentStreakDays,
        bestStreakDays: streakSummary.bestStreakDays,
        dailyTrend,
        modeBreakdown
      }
    : createEmptyStats()

  return {
    id: user.id,
    name: user.username,
    createdAt: user.created_at.toISOString(),
    lastPracticedAt: history[0]?.completedAt,
    history,
    customPrompts: customPromptsResult.rows.map(mapCustomPrompt),
    stats,
    settings: {
      duration: settings.duration,
      soundEnabled: settings.sound_enabled,
      autoNext: settings.auto_next,
      autoNextDelayMs: settings.auto_next_delay_ms
    }
  }
}

async function requireAuth(request, response, next) {
  const token = request.cookies?.[sessionCookieName]
  if (!token) {
    sendError(response, 401, 'unauthorized', '请先登录。')
    return
  }

  const hashedToken = sessionHash(token)
  const sessionResult = await query(
    `SELECT sessions.user_id
     FROM sessions
     WHERE sessions.id = $1 AND sessions.expires_at > now()`,
    [hashedToken]
  )

  const session = sessionResult.rows[0]
  if (!session) {
    clearSessionCookie(response)
    sendError(response, 401, 'unauthorized', '登录已过期，请重新登录。')
    return
  }

  request.userId = session.user_id
  next()
}

app.get('/api/health', (_request, response) => {
  sendData(response, { ok: true })
})

app.get('/api/me', requireAuth, asyncHandler(async (request, response) => {
  const profile = await fetchProfile(request.userId)
  if (!profile) {
    sendError(response, 401, 'unauthorized', '用户不存在。')
    return
  }
  sendData(response, profile)
}))

app.post('/api/auth/register', authLimiter, asyncHandler(async (request, response) => {
  const username = sanitizeName(request.body?.name)
  const password = String(request.body?.password ?? '')

  if (!username) {
    sendError(response, 422, 'validation_error', '请输入账号名。')
    return
  }

  if (password.length < passwordMinLength) {
    sendError(response, 422, 'validation_error', `密码至少 ${passwordMinLength} 位。`)
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await withTransaction(async (client) => {
    const existing = await client.query(
      'SELECT id FROM users WHERE lower(username) = lower($1)',
      [username]
    )

    if (existing.rows[0]) return null

    const created = await client.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
      [username, passwordHash]
    )
    const userId = created.rows[0].id

    await client.query(
      'INSERT INTO profile_settings (user_id) VALUES ($1)',
      [userId]
    )

    return { id: userId }
  })

  if (!user) {
    sendError(response, 409, 'duplicate_username', '这个账号已经注册，请直接登录。')
    return
  }

  await createSession(response, user.id)
  sendData(response, await fetchProfile(user.id), 201)
}))

app.post('/api/auth/login', authLimiter, asyncHandler(async (request, response) => {
  const username = sanitizeName(request.body?.name)
  const password = String(request.body?.password ?? '')

  if (!username || !password) {
    sendError(response, 422, 'validation_error', '请输入账号和密码。')
    return
  }

  const userResult = await query(
    'SELECT id, password_hash FROM users WHERE lower(username) = lower($1)',
    [username]
  )
  const user = userResult.rows[0]

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    sendError(response, 401, 'invalid_credentials', '账号或密码不正确。')
    return
  }

  await query('DELETE FROM sessions WHERE expires_at <= now()')
  await createSession(response, user.id)
  sendData(response, await fetchProfile(user.id))
}))

app.post('/api/auth/logout', asyncHandler(async (request, response) => {
  const token = request.cookies?.[sessionCookieName]
  if (token) {
    await query('DELETE FROM sessions WHERE id = $1', [sessionHash(token)])
  }
  clearSessionCookie(response)
  sendData(response, { ok: true })
}))

app.patch('/api/settings', requireAuth, asyncHandler(async (request, response) => {
  const allowedDurations = new Set([0, 60, 180])
  const duration = Number(request.body?.duration)
  const soundEnabled = Boolean(request.body?.soundEnabled)
  const autoNext = Boolean(request.body?.autoNext)
  const autoNextDelayMs = Number(request.body?.autoNextDelayMs ?? 900)

  if (!allowedDurations.has(duration) || autoNextDelayMs < 500 || autoNextDelayMs > 3000) {
    sendError(response, 422, 'validation_error', '练习设置不合法。')
    return
  }

  await query(
    `INSERT INTO profile_settings (user_id, duration, sound_enabled, auto_next, auto_next_delay_ms, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (user_id) DO UPDATE SET
       duration = excluded.duration,
       sound_enabled = excluded.sound_enabled,
       auto_next = excluded.auto_next,
       auto_next_delay_ms = excluded.auto_next_delay_ms,
       updated_at = now()`,
    [request.userId, duration, soundEnabled, autoNext, autoNextDelayMs]
  )

  sendData(response, await fetchProfile(request.userId))
}))

app.post('/api/results', requireAuth, asyncHandler(async (request, response) => {
  const body = request.body ?? {}
  const mode = String(body.mode ?? '')
  const prompt = normalizeText(body.prompt)
  const accuracy = Number(body.accuracy)
  const wpm = Number(body.wpm)
  const cpm = Number(body.cpm)
  const errorCount = Number(body.errorCount)
  const elapsedSeconds = Number(body.elapsedSeconds)

  if (
    !['chinese', 'english', 'mixed', 'custom'].includes(mode) ||
    !prompt ||
    !Number.isFinite(accuracy) ||
    accuracy < 0 ||
    accuracy > 100 ||
    !Number.isFinite(wpm) ||
    wpm < 0 ||
    !Number.isFinite(cpm) ||
    cpm < 0 ||
    !Number.isFinite(errorCount) ||
    errorCount < 0 ||
    !Number.isFinite(elapsedSeconds) ||
    elapsedSeconds < 0
  ) {
    sendError(response, 422, 'validation_error', '成绩数据不合法。')
    return
  }

  await query(
    `INSERT INTO practice_results
      (user_id, mode, prompt, accuracy, wpm, cpm, error_count, elapsed_seconds, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
    [request.userId, mode, prompt, Math.round(accuracy), Math.round(wpm), Math.round(cpm), Math.round(errorCount), elapsedSeconds]
  )

  sendData(response, await fetchProfile(request.userId), 201)
}))

app.post('/api/custom-prompts', requireAuth, asyncHandler(async (request, response) => {
  const title = sanitizeName(request.body?.title) || '自定义文本'
  const text = normalizeText(request.body?.text)

  if (Array.from(text).length < 2) {
    sendError(response, 422, 'validation_error', '至少放 2 个字符，才能生成练习。')
    return
  }

  await query(
    'INSERT INTO custom_prompts (user_id, title, text) VALUES ($1, $2, $3)',
    [request.userId, title, text]
  )

  sendData(response, await fetchProfile(request.userId), 201)
}))

app.use('/api', (_request, response) => {
  sendError(response, 404, 'not_found', '接口不存在。')
})

if (process.env.NODE_ENV === 'production' && existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/.*/, (_request, response) => {
    response.sendFile(join(distDir, 'index.html'))
  })
}

app.use((error, _request, response, _next) => {
  console.error(error)
  if (response.headersSent) return
  sendError(response, 500, 'internal_error', getFriendlyServerError(error))
})

app.listen(port, '127.0.0.1', () => {
  console.log(`API server listening on http://127.0.0.1:${port}`)
})
