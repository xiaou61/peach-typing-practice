import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, CompositionEvent, FormEvent, ReactNode } from 'react'
import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  CalendarRange,
  CheckCircle2,
  Clock3,
  FastForward,
  FileText,
  Flame,
  Gauge,
  Eye,
  EyeOff,
  History,
  Keyboard,
  Layers3,
  LockKeyhole,
  LogIn,
  LogOut,
  Medal,
  PauseCircle,
  Play,
  RefreshCcw,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
  Upload,
  UserCheck,
  UserRound,
  Volume2,
  VolumeX
} from 'lucide-react'
import {
  PRACTICE_CATEGORIES,
  PRACTICE_MODES,
  PRACTICE_PROMPT_COUNT,
  getCategoryMeta,
  getModeMeta,
  getInitialPrompt,
  getPracticePrompts,
  type PracticeCategoryFilter,
  type PracticeMode,
  type PracticePrompt
} from './practiceData'
import {
  DURATION_OPTIONS,
  calculateTypingStats,
  formatElapsedTime,
  type DurationOption,
  type PracticeResult
} from './typingUtils'

const MAX_CUSTOM_TEXT_CHARS = 12000
const MAX_IMPORT_FILE_SIZE = 256 * 1024
const ALLOWED_IMPORT_EXTENSIONS = ['.txt', '.md', '.csv', '.json']
const PASSWORD_MIN_LENGTH = 6
const EMPTY_USER_STATE: UserState = { activeProfileId: '', profiles: [] }

interface CustomPromptRecord {
  id: string
  title: string
  text: string
  createdAt: string
}

interface ProfileSettings {
  duration: DurationOption
  soundEnabled: boolean
  autoNext: boolean
  autoNextDelayMs: number
}

interface DailyTrendPoint {
  label: string
  date: string
  sessionCount: number
  averageWpm: number
  averageAccuracy: number
  practiceSeconds: number
}

interface ModeBreakdownStat {
  mode: PracticeMode
  runCount: number
  averageWpm: number
  bestWpm: number
  averageAccuracy: number
}

interface ProfileStats {
  runCount: number
  averageWpm: number
  bestWpm: number
  averageAccuracy: number
  bestAccuracy: number
  averageCpm: number
  bestCpm: number
  totalPracticeSeconds: number
  totalErrors: number
  completedToday: number
  completedThisWeek: number
  practiceSecondsThisWeek: number
  currentStreakDays: number
  bestStreakDays: number
  dailyTrend: DailyTrendPoint[]
  modeBreakdown: ModeBreakdownStat[]
}

interface UserProfile {
  id: string
  name: string
  createdAt: string
  lastPracticedAt?: string
  history: PracticeResult[]
  customPrompts: CustomPromptRecord[]
  stats: ProfileStats
  settings: ProfileSettings
}

interface UserState {
  activeProfileId: string
  profiles: UserProfile[]
}

type LevelId = 'all' | 'starter' | 'growth' | 'steady' | 'challenge'

interface LevelFilter {
  id: LevelId
  label: string
  range: string
  min: number
  max: number
}

const LEVEL_FILTERS: LevelFilter[] = [
  { id: 'all', label: '全部', range: `1-${PRACTICE_PROMPT_COUNT}`, min: 1, max: Number.POSITIVE_INFINITY },
  { id: 'starter', label: '入门', range: '1-200', min: 1, max: 200 },
  { id: 'growth', label: '进阶', range: '201-450', min: 201, max: 450 },
  { id: 'steady', label: '熟练', range: '451-750', min: 451, max: 750 },
  { id: 'challenge', label: '挑战', range: '751+', min: 751, max: Number.POSITIVE_INFINITY }
]

function createDefaultSettings(): ProfileSettings {
  return {
    duration: 0,
    soundEnabled: false,
    autoNext: false,
    autoNextDelayMs: 900
  }
}

function createEmptyStats(): ProfileStats {
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
    modeBreakdown: PRACTICE_MODES.map((mode) => ({
      mode: mode.id,
      runCount: 0,
      averageWpm: 0,
      bestWpm: 0,
      averageAccuracy: 0
    }))
  }
}

function sanitizeProfileName(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 24)
}

function normalizeImportedText(value: string) {
  return value
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
    .slice(0, MAX_CUSTOM_TEXT_CHARS)
}

function createFallbackProfile(): UserProfile {
  return {
    id: '',
    name: '未登录',
    createdAt: '',
    history: [],
    customPrompts: [],
    stats: createEmptyStats(),
    settings: createDefaultSettings()
  }
}

function profileToUserState(profile: UserProfile): UserState {
  return {
    activeProfileId: profile.id,
    profiles: [profile]
  }
}

function getApiErrorMessage(error: unknown, fallback = '请求失败，请稍后再试。') {
  return error instanceof Error ? error.message : fallback
}

async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? '请求失败，请稍后再试。')
  }

  return payload.data as T
}

function getActiveProfile(userState: UserState) {
  return userState.profiles.find((profile) => profile.id === userState.activeProfileId) ?? null
}

function customRecordToPrompt(record: CustomPromptRecord, index: number): PracticePrompt & { id: string } {
  return {
    id: record.id,
    mode: 'custom',
    category: 'custom',
    difficulty: index + 1,
    title: record.title,
    text: record.text,
    source: `自定义导入 · ${new Date(record.createdAt).toLocaleDateString()}`
  }
}

function getLevelForDifficulty(difficulty: number) {
  return LEVEL_FILTERS.find((level) => difficulty >= level.min && difficulty <= level.max) ?? LEVEL_FILTERS[0]
}

function isPromptInLevel(prompt: PracticePrompt, levelId: LevelId) {
  if (levelId === 'all') return true

  const level = LEVEL_FILTERS.find((item) => item.id === levelId)
  return level ? prompt.difficulty >= level.min && prompt.difficulty <= level.max : true
}

function getPromptKey(prompt: PracticePrompt) {
  const id = (prompt as PracticePrompt & { id?: string }).id
  if (id) return id

  return `${prompt.mode}-${prompt.difficulty}-${prompt.text}`
}

function getPromptTitle(prompt: PracticePrompt) {
  return prompt.title
}

function getModeShortLabel(mode: PracticeMode) {
  return getModeMeta(mode).shortLabel
}

function formatPracticeDuration(seconds: number) {
  if (seconds <= 0) return '0 分钟'

  const roundedSeconds = Math.round(seconds)
  const hours = Math.floor(roundedSeconds / 3600)
  const minutes = Math.floor((roundedSeconds % 3600) / 60)

  if (hours > 0) {
    return `${hours} 小时 ${minutes} 分钟`
  }

  if (minutes > 0) {
    return `${minutes} 分钟`
  }

  return `${roundedSeconds} 秒`
}

function formatRelativeDate(iso?: string) {
  if (!iso) return '还没有练习记录'

  const date = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000))

  if (diffDays <= 0) return '今天练过'
  if (diffDays === 1) return '昨天练过'

  return `${date.getMonth() + 1}/${date.getDate()}`
}

function isPromptInCategory(prompt: PracticePrompt, category: PracticeCategoryFilter) {
  return category === 'all' || prompt.category === category
}

function filterPrompts(
  prompts: PracticePrompt[],
  levelId: LevelId,
  category: PracticeCategoryFilter,
  searchTerm: string
) {
  const normalizedSearch = searchTerm.trim().toLowerCase()

  return prompts.filter((prompt) => {
    const matchesLevel = isPromptInLevel(prompt, levelId)
    const matchesCategory = isPromptInCategory(prompt, category)
    if (!matchesLevel || !matchesCategory) return false

    if (!normalizedSearch) return true

    return `${prompt.text} ${prompt.source} ${getPromptTitle(prompt)}`
      .toLowerCase()
      .includes(normalizedSearch)
  })
}

function playSoftErrorTone(enabled: boolean) {
  if (!enabled) return

  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return

  const audioContext = new AudioContextClass()
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()

  oscillator.type = 'triangle'
  oscillator.frequency.value = 180
  gain.gain.value = 0.04
  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start()
  oscillator.stop(audioContext.currentTime + 0.07)
}

function App() {
  const [userState, setUserState] = useState<UserState>(EMPTY_USER_STATE)
  const [authChecked, setAuthChecked] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register')
  const [authName, setAuthName] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authConfirmPassword, setAuthConfirmPassword] = useState('')
  const [authStatus, setAuthStatus] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedMode, setSelectedMode] = useState<PracticeMode>('chinese')
  const [selectedLevel, setSelectedLevel] = useState<LevelId>('all')
  const [selectedCategory, setSelectedCategory] = useState<PracticeCategoryFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [activePrompt, setActivePrompt] = useState(() => getInitialPrompt('chinese'))
  const [inputText, setInputText] = useState('')
  const [typedText, setTypedText] = useState('')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [errorCount, setErrorCount] = useState(0)
  const [streakCount, setStreakCount] = useState(0)
  const [customTitle, setCustomTitle] = useState('')
  const [customText, setCustomText] = useState('')
  const [customStatus, setCustomStatus] = useState('')
  const [now, setNow] = useState(Date.now())
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isComposingRef = useRef(false)
  const resultSavedRef = useRef(false)
  const typedTextRef = useRef('')

  const activeProfile = useMemo(() => getActiveProfile(userState), [userState])
  const profileForView = activeProfile ?? createFallbackProfile()
  const duration = profileForView.settings.duration
  const soundEnabled = profileForView.settings.soundEnabled
  const autoNextEnabled = profileForView.settings.autoNext
  const customPracticePrompts = useMemo(
    () => profileForView.customPrompts.map((prompt, index) => customRecordToPrompt(prompt, index)),
    [profileForView.customPrompts]
  )
  const promptPool = useMemo(
    () => (selectedMode === 'custom' ? customPracticePrompts : getPracticePrompts(selectedMode)),
    [customPracticePrompts, selectedMode]
  )
  const visiblePrompts = useMemo(
    () => filterPrompts(promptPool, selectedLevel, selectedCategory, searchTerm),
    [promptPool, searchTerm, selectedCategory, selectedLevel]
  )
  const levelCounts = useMemo(() => {
    return LEVEL_FILTERS.map((level) => ({
      ...level,
      count: filterPrompts(promptPool, level.id, selectedCategory, '').length
    }))
  }, [promptPool, selectedCategory])
  const categoryCounts = useMemo(() => {
    return PRACTICE_CATEGORIES.map((category) => ({
      ...category,
      count: filterPrompts(promptPool, selectedLevel, category.id, '').length
    }))
  }, [promptPool, selectedLevel])
  const promptCharacters = useMemo(() => Array.from(activePrompt.text), [activePrompt.text])
  const typedCharacters = useMemo(() => Array.from(typedText), [typedText])
  const isFinished = finishedAt !== null
  const activeModeMeta = getModeMeta(selectedMode)
  const actualModeMeta = getModeMeta(activePrompt.mode)
  const activeCategoryMeta = getCategoryMeta(activePrompt.category)
  const selectedCategoryMeta = getCategoryMeta(selectedCategory)
  const activeLevel = getLevelForDifficulty(activePrompt.difficulty)
  const profileStats = profileForView.stats ?? createEmptyStats()
  const trendPeak = useMemo(() => {
    return Math.max(1, ...profileStats.dailyTrend.map((item) => item.sessionCount))
  }, [profileStats.dailyTrend])
  const recentResults = useMemo(() => profileForView.history.slice(0, 6), [profileForView.history])
  const strongestMode = useMemo(() => {
    return [...profileStats.modeBreakdown].sort((left, right) => {
      if (right.runCount !== left.runCount) return right.runCount - left.runCount
      return right.bestWpm - left.bestWpm
    })[0]
  }, [profileStats.modeBreakdown])
  const totalPromptCount = Math.max(promptPool.length, visiblePrompts.length)

  const stats = useMemo(
    () =>
      calculateTypingStats({
        prompt: activePrompt.text,
        typedText,
        startedAt,
        finishedAt,
        errorCount,
        now
      }),
    [activePrompt.text, errorCount, finishedAt, now, startedAt, typedText]
  )

  const remainingSeconds =
    duration > 0 && startedAt
      ? Math.max(0, duration - Math.floor(((finishedAt ?? now) - startedAt) / 1000))
      : null

  const completionTitle = duration > 0 && remainingSeconds === 0 ? '计时结束' : '本课完成'

  useEffect(() => {
    let ignore = false

    apiRequest<UserProfile>('/api/me')
      .then((profile) => {
        if (!ignore) setUserState(profileToUserState(profile))
      })
      .catch(() => {
        if (!ignore) setUserState(EMPTY_USER_STATE)
      })
      .finally(() => {
        if (!ignore) setAuthChecked(true)
      })

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (!startedAt || isFinished) return

    const timerId = window.setInterval(() => {
      setNow(Date.now())
    }, 250)

    return () => window.clearInterval(timerId)
  }, [isFinished, startedAt])

  useEffect(() => {
    if (!startedAt || finishedAt || duration === 0) return

    const elapsedSeconds = (now - startedAt) / 1000
    if (elapsedSeconds >= duration) {
      finishPractice(startedAt + duration * 1000)
    }
  }, [duration, finishedAt, now, startedAt])

  function resetSession(nextPrompt = activePrompt) {
    setActivePrompt(nextPrompt)
    setInputText('')
    setTypedText('')
    typedTextRef.current = ''
    setStartedAt(null)
    setFinishedAt(null)
    setErrorCount(0)
    setStreakCount(0)
    setNow(Date.now())
    isComposingRef.current = false
    resultSavedRef.current = false
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  function applyProfile(profile: UserProfile) {
    setUserState(profileToUserState(profile))
  }

  async function updateProfileSettings(settings: Partial<ProfileSettings>) {
    const nextSettings = {
      ...profileForView.settings,
      ...settings
    }
    const profile = await apiRequest<UserProfile>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(nextSettings)
    })
    applyProfile(profile)
  }

  async function recordResult(endTime: number, finalTypedText = typedText) {
    if (resultSavedRef.current) return

    const finalStats = calculateTypingStats({
      prompt: activePrompt.text,
      typedText: finalTypedText,
      startedAt,
      finishedAt: endTime,
      errorCount,
      now: endTime
    })

    resultSavedRef.current = true
    try {
      const profile = await apiRequest<UserProfile>('/api/results', {
        method: 'POST',
        body: JSON.stringify({
          mode: activePrompt.mode,
          prompt: activePrompt.text,
          accuracy: finalStats.accuracy,
          wpm: finalStats.wpm,
          cpm: finalStats.cpm,
          errorCount: finalStats.errorCount,
          elapsedSeconds: finalStats.elapsedSeconds
        })
      })
      applyProfile(profile)
    } catch (error) {
      setCustomStatus(getApiErrorMessage(error, '成绩保存失败。'))
    }
  }

  function finishPractice(endTime = Date.now(), finalTypedText = typedText) {
    setFinishedAt(endTime)
    recordResult(endTime, finalTypedText)
  }

  function getNextVisiblePrompt() {
    if (visiblePrompts.length === 0) return promptPool[0] ?? activePrompt

    const currentIndex = visiblePrompts.findIndex((prompt) => getPromptKey(prompt) === getPromptKey(activePrompt))
    return visiblePrompts[currentIndex === -1 ? 0 : (currentIndex + 1) % visiblePrompts.length]
  }

  function getPromptPoolForMode(mode: PracticeMode) {
    return mode === 'custom' ? customPracticePrompts : getPracticePrompts(mode)
  }

  function getFirstPromptForMode(
    mode: PracticeMode,
    levelId: LevelId,
    category: PracticeCategoryFilter,
    term: string
  ) {
    const nextPool = getPromptPoolForMode(mode)
    return filterPrompts(nextPool, levelId, category, term)[0] ?? nextPool[0] ?? activePrompt
  }

  function handleModeChange(mode: PracticeMode) {
    const nextCategory = mode === 'custom' ? 'all' : selectedCategory
    setSelectedMode(mode)
    setSelectedCategory(nextCategory)
    resetSession(getFirstPromptForMode(mode, selectedLevel, nextCategory, searchTerm))
  }

  function handleLevelChange(levelId: LevelId) {
    setSelectedLevel(levelId)
    resetSession(getFirstPromptForMode(selectedMode, levelId, selectedCategory, searchTerm))
  }

  function handleCategoryChange(category: PracticeCategoryFilter) {
    setSelectedCategory(category)
    resetSession(getFirstPromptForMode(selectedMode, selectedLevel, category, searchTerm))
  }

  function handlePromptSelect(prompt: PracticePrompt) {
    resetSession(prompt)
  }

  function handleNextPrompt() {
    resetSession(getNextVisiblePrompt())
  }

  function handleRestart() {
    resetSession(activePrompt)
  }

  function handleTypingChange(value: string) {
    if (isFinished) return

    const nextCharacters = Array.from(value)
    const previousCharacters = Array.from(typedTextRef.current)
    const previousValue = typedTextRef.current
    let firstChangedIndex = 0

    if (value === previousValue) return

    while (
      firstChangedIndex < previousCharacters.length &&
      firstChangedIndex < nextCharacters.length &&
      previousCharacters[firstChangedIndex] === nextCharacters[firstChangedIndex]
    ) {
      firstChangedIndex += 1
    }

    if (!startedAt && value.length > 0) {
      setStartedAt(Date.now())
      setNow(Date.now())
    }

    if (nextCharacters.length > previousCharacters.length) {
      const insertedCount = nextCharacters.length - previousCharacters.length
      const addedCharacters = nextCharacters.slice(firstChangedIndex, firstChangedIndex + insertedCount)
      const mistakes = addedCharacters.reduce((total, character, offset) => {
        const promptIndex = firstChangedIndex + offset
        return total + (character === promptCharacters[promptIndex] ? 0 : 1)
      }, 0)

      if (mistakes > 0) {
        setErrorCount((current) => current + mistakes)
        setStreakCount(0)
        playSoftErrorTone(soundEnabled)
      } else {
        setStreakCount((current) => current + addedCharacters.length)
      }
    }

    typedTextRef.current = value
    setTypedText(value)

    if (value === activePrompt.text) {
      finishPractice(Date.now(), value)
    }
  }

  function handleTypingInput(event: ChangeEvent<HTMLTextAreaElement>) {
    const nativeEvent = event.nativeEvent as InputEvent
    const nextValue = event.target.value

    setInputText(nextValue)
    if (isComposingRef.current || nativeEvent.isComposing) return

    handleTypingChange(nextValue)
  }

  function handleCompositionStart() {
    isComposingRef.current = true
  }

  function handleCompositionEnd(event: CompositionEvent<HTMLTextAreaElement>) {
    isComposingRef.current = false
    const nextValue = event.currentTarget.value
    setInputText(nextValue)
    handleTypingChange(nextValue)
  }

  async function handleDurationChange(nextDuration: DurationOption) {
    await updateProfileSettings({ duration: nextDuration }).catch((error) => {
      setCustomStatus(getApiErrorMessage(error, '设置保存失败。'))
    })
    resetSession(activePrompt)
  }

  function handleSoundToggle() {
    updateProfileSettings({ soundEnabled: !soundEnabled }).catch((error) => {
      setCustomStatus(getApiErrorMessage(error, '设置保存失败。'))
    })
  }

  function handleAutoNextToggle() {
    updateProfileSettings({ autoNext: !autoNextEnabled }).catch((error) => {
      setCustomStatus(getApiErrorMessage(error, '设置保存失败。'))
    })
  }

  function clearAuthFields() {
    setAuthPassword('')
    setAuthConfirmPassword('')
    setAuthStatus('')
  }

  function enterProfile(profile: UserProfile) {
    applyProfile(profile)
    clearAuthFields()

    if (selectedMode === 'custom') {
      const nextCustomPrompt = profile.customPrompts.map((prompt, index) => customRecordToPrompt(prompt, index))[0]
      if (nextCustomPrompt) {
        resetSession(nextCustomPrompt)
      } else {
        setSelectedMode('chinese')
        setSelectedCategory('all')
        resetSession(getInitialPrompt('chinese'))
      }
      return
    }

    resetSession(activePrompt)
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const name = sanitizeProfileName(authName)
    const password = authPassword
    if (!name) {
      setAuthStatus('请输入账号名。')
      return
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      setAuthStatus(`密码至少 ${PASSWORD_MIN_LENGTH} 位。`)
      return
    }

    setAuthBusy(true)
    setAuthStatus('')

    try {
      if (authMode === 'login') {
        const profile = await apiRequest<UserProfile>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ name, password })
        })
        enterProfile(profile)
        return
      }

      if (authConfirmPassword !== password) {
        setAuthStatus('两次输入的密码不一致。')
        return
      }

      const nextProfile = await apiRequest<UserProfile>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, password })
      })
      enterProfile(nextProfile)
      setSelectedMode('chinese')
      setSelectedCategory('all')
      setSelectedLevel('all')
      resetSession(getInitialPrompt('chinese'))
    } catch (error) {
      setAuthStatus(getApiErrorMessage(error))
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleLogout() {
    await apiRequest<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    setUserState(EMPTY_USER_STATE)
    setAuthMode('login')
    clearAuthFields()
    resetSession(getInitialPrompt('chinese'))
  }

  async function handleCustomFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
    const isTextFile = file.type.startsWith('text/') || file.type === 'application/json' || file.type === ''

    if (file.size > MAX_IMPORT_FILE_SIZE) {
      setCustomStatus('文件太大，先限制在 256KB 内。')
      return
    }

    if (!isTextFile && (!extension || !ALLOWED_IMPORT_EXTENSIONS.includes(extension))) {
      setCustomStatus('先支持 txt、md、csv、json 这类纯文本文件。')
      return
    }

    try {
      const text = normalizeImportedText(await file.text())
      setCustomTitle((currentTitle) => currentTitle || file.name.replace(/\.[^.]+$/u, '').slice(0, 40))
      setCustomText(text)
      setCustomStatus(text ? `已读取 ${Array.from(text).length} 个字符。` : '文件里没有可导入的文本。')
    } catch {
      setCustomStatus('文件读取失败，可以先把文本复制进输入框。')
    }
  }

  async function handleAddCustomPrompt() {
    const text = normalizeImportedText(customText)
    if (Array.from(text).length < 2) {
      setCustomStatus('至少放 2 个字符，才能生成练习。')
      return
    }

    const title = sanitizeProfileName(customTitle) || `自定义文本 ${profileForView.customPrompts.length + 1}`
    try {
      const profile = await apiRequest<UserProfile>('/api/custom-prompts', {
        method: 'POST',
        body: JSON.stringify({ title: title.slice(0, 40), text })
      })
      const newPromptRecord = profile.customPrompts[0]
      if (!newPromptRecord) {
        throw new Error('自定义文本保存失败。')
      }
      const prompt = customRecordToPrompt(newPromptRecord, 0)

      applyProfile(profile)
      setSelectedMode('custom')
      setSelectedCategory('all')
      setSelectedLevel('all')
      setSearchTerm('')
      setCustomTitle('')
      setCustomText('')
      setCustomStatus('已添加到自定义练习。')
      resetSession(prompt)
    } catch (error) {
      setCustomStatus(getApiErrorMessage(error, '自定义文本保存失败。'))
    }
  }

  useEffect(() => {
    function handleKeyboardShortcuts(event: KeyboardEvent) {
      if (event.isComposing) return

      if (event.key === 'Escape') {
        event.preventDefault()
        handleRestart()
      }

      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        handleNextPrompt()
      }
    }

    window.addEventListener('keydown', handleKeyboardShortcuts)

    return () => window.removeEventListener('keydown', handleKeyboardShortcuts)
  }, [activePrompt, selectedMode, visiblePrompts])

  useEffect(() => {
    if (!isFinished || !autoNextEnabled) return

    const timerId = window.setTimeout(() => {
      handleNextPrompt()
    }, profileForView.settings.autoNextDelayMs)

    return () => window.clearTimeout(timerId)
  }, [profileForView.settings.autoNextDelayMs, autoNextEnabled, activePrompt, isFinished, selectedMode, visiblePrompts])

  if (!authChecked) {
    return (
      <main className="auth-shell">
        <section className="auth-panel" aria-label="正在连接后端">
          <div className="auth-brand">
            <div className="brand-mark" aria-hidden="true">
              <Keyboard size={25} />
            </div>
            <div>
              <p className="eyebrow">Typing studio</p>
              <h1>粉桃打字课</h1>
            </div>
          </div>
          <div className="auth-footnote">
            <LockKeyhole size={16} />
            <span>正在连接后端服务...</span>
          </div>
        </section>
      </main>
    )
  }

  if (!activeProfile) {
    const passwordType = showPassword ? 'text' : 'password'

    return (
      <main className="auth-shell">
        <section className="auth-panel" aria-label="账号登录">
          <div className="auth-brand">
            <div className="brand-mark" aria-hidden="true">
              <Keyboard size={25} />
            </div>
            <div>
              <p className="eyebrow">Typing studio</p>
              <h1>粉桃打字课</h1>
            </div>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="账号操作">
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'login'}
              className={authMode === 'login' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => {
                setAuthMode('login')
                clearAuthFields()
              }}
            >
              登录
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'register'}
              className={authMode === 'register' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => {
                setAuthMode('register')
                clearAuthFields()
              }}
            >
              注册
            </button>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <label>
              <span>账号</span>
              <input
                value={authName}
                onChange={(event) => setAuthName(event.target.value)}
                autoComplete="username"
                placeholder="输入账号名"
              />
            </label>

            <label>
              <span>密码</span>
              <div className="password-field">
                <input
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  type={passwordType}
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="至少 6 位"
                />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} title={showPassword ? '隐藏密码' : '显示密码'}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            {authMode === 'register' && (
              <label>
                <span>确认密码</span>
                <input
                  value={authConfirmPassword}
                  onChange={(event) => setAuthConfirmPassword(event.target.value)}
                  type={passwordType}
                  autoComplete="new-password"
                  placeholder="再输入一次"
                />
              </label>
            )}

            {authStatus && <p className="auth-status" role="alert">{authStatus}</p>}

            <button type="submit" className="auth-submit" disabled={authBusy}>
              {authMode === 'login' ? <LogIn size={18} /> : <UserCheck size={18} />}
              {authBusy ? '处理中' : authMode === 'login' ? '登录' : '注册并进入'}
            </button>
          </form>

          <div className="auth-footnote">
            <LockKeyhole size={16} />
            <span>后端账号密码登录 · PostgreSQL 持久保存</span>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="练习设置">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <Keyboard size={24} />
          </div>
          <div>
            <p className="eyebrow">Typing studio</p>
            <h1>粉桃打字课</h1>
          </div>
        </div>

        <div className="mode-tabs" role="tablist" aria-label="练习模式">
          {PRACTICE_MODES.map((mode) => (
            <button
              type="button"
              key={mode.id}
              role="tab"
              aria-selected={selectedMode === mode.id}
              className={selectedMode === mode.id ? 'mode-tab active' : 'mode-tab'}
              onClick={() => handleModeChange(mode.id)}
              title={mode.description}
            >
              {mode.shortLabel}
            </button>
          ))}
        </div>

        <div className="profile-dock signed-in" aria-label="登录账号">
          <UserRound size={18} aria-hidden="true" />
          <strong>{profileForView.name}</strong>
          <button type="button" className="icon-button compact" onClick={handleLogout} title="退出登录">
            <LogOut size={17} />
          </button>
        </div>
      </section>

      <section className="course-strip" aria-label="当前课程">
        <div>
          <p className="eyebrow">当前课程</p>
          <h2>{getPromptTitle(activePrompt)}</h2>
          <p>{activePrompt.source}</p>
        </div>
        <div className="hero-badges" aria-label="本轮状态">
          <span>
            <BookOpen size={16} />
            {visiblePrompts.length}/{totalPromptCount || 1} 篇
          </span>
          <span>
            <Layers3 size={16} />
            {activeLevel.label} {activeLevel.range}
          </span>
          <span>
            <Target size={16} />
            {activeCategoryMeta.shortLabel}
          </span>
          <span>
            <Award size={16} />
            难度 {activePrompt.difficulty}/{totalPromptCount || PRACTICE_PROMPT_COUNT}
          </span>
          <span>
            <Clock3 size={16} />
            {duration === 0 ? '自由练习' : `${duration / 60} 分钟`}
          </span>
        </div>
      </section>

      <section className="lesson-shell">
        <aside className="lesson-library" aria-label="文章库">
          <div className="library-heading">
            <div>
              <p className="eyebrow">Lesson library</p>
              <h2>{selectedCategoryMeta.shortLabel} · {activeModeMeta.label}</h2>
            </div>
            <span className="library-count">{visiblePrompts.length}</span>
          </div>

          <label className="search-box">
            <Search size={17} aria-hidden="true" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜索文章、来源"
              aria-label="搜索文章"
            />
          </label>

          <div className="level-grid" aria-label="难度级别">
            {levelCounts.map((level) => (
              <button
                type="button"
                key={level.id}
                className={selectedLevel === level.id ? 'level-button active' : 'level-button'}
                onClick={() => handleLevelChange(level.id)}
                disabled={level.count === 0}
              >
                <strong>{level.label}</strong>
                <span>{level.count} 篇</span>
              </button>
            ))}
          </div>

          <div className="category-grid" aria-label="练习分类">
            {categoryCounts.map((category) => (
              <button
                type="button"
                key={category.id}
                className={selectedCategory === category.id ? 'category-button active' : 'category-button'}
                onClick={() => handleCategoryChange(category.id)}
                title={category.description}
                disabled={category.count === 0}
              >
                <strong>{category.shortLabel}</strong>
                <span>{category.count} 篇</span>
              </button>
            ))}
          </div>

          <div className="custom-import-panel" aria-label="自定义文本导入">
            <div className="custom-import-heading">
              <span>
                <FileText size={16} />
                自定义文本
              </span>
              <label className="file-import-button">
                <Upload size={15} aria-hidden="true" />
                导入
                <input
                  type="file"
                  accept=".txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json"
                  onChange={handleCustomFileChange}
                />
              </label>
            </div>
            <input
              value={customTitle}
              onChange={(event) => setCustomTitle(event.target.value)}
              placeholder="标题"
              aria-label="自定义文本标题"
              className="custom-title-input"
            />
            <textarea
              value={customText}
              onChange={(event) => {
                setCustomText(event.target.value.slice(0, MAX_CUSTOM_TEXT_CHARS))
                setCustomStatus('')
              }}
              placeholder="粘贴文本，或导入 txt / md / csv / json"
              aria-label="自定义练习文本"
              className="custom-textarea"
              rows={4}
            />
            <div className="custom-import-footer">
              <small>{Array.from(customText).length}/{MAX_CUSTOM_TEXT_CHARS}</small>
              <button type="button" className="secondary-button" onClick={handleAddCustomPrompt}>
                添加练习
              </button>
            </div>
            {customStatus && <p className="custom-status">{customStatus}</p>}
          </div>

          <div className="lesson-list" aria-label="可选文章">
            {visiblePrompts.length === 0 ? (
              <div className="empty-library">没有匹配的文章。</div>
            ) : (
              visiblePrompts.map((prompt) => {
                const isActive = getPromptKey(prompt) === getPromptKey(activePrompt)
                const promptLevel = getLevelForDifficulty(prompt.difficulty)
                const promptCategory = getCategoryMeta(prompt.category)

                return (
                  <button
                    type="button"
                    key={getPromptKey(prompt)}
                    className={isActive ? 'lesson-item active' : 'lesson-item'}
                    onClick={() => handlePromptSelect(prompt)}
                  >
                    <span className="lesson-index">{prompt.difficulty.toString().padStart(3, '0')}</span>
                    <span className="lesson-main">
                      <strong>{getPromptTitle(prompt)}</strong>
                      <small>{prompt.source}</small>
                      <em>{prompt.text}</em>
                    </span>
                    <span className="lesson-level">{promptCategory.shortLabel} · {promptLevel.label}</span>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        <div className="practice-stage" onClick={() => inputRef.current?.focus()}>
          <div className="stage-toolbar">
            <div>
              <p className="eyebrow">{actualModeMeta.shortLabel} · {activeCategoryMeta.label}</p>
              <h3>{isFinished ? completionTitle : startedAt ? '保持节奏' : '准备开始'}</h3>
            </div>
            <div className="toolbar-actions">
              <span className={streakCount >= 10 ? 'streak-badge active' : 'streak-badge'} title="连续正确字符">
                <Flame size={16} />
                {streakCount}
              </span>
              <button type="button" className="icon-button" onClick={handleRestart} title="重练当前课">
                <RotateCcw size={18} />
              </button>
              <button type="button" className="icon-button" onClick={handleNextPrompt} title="下一课">
                <RefreshCcw size={18} />
              </button>
              <button
                type="button"
                className={autoNextEnabled ? 'icon-button active' : 'icon-button'}
                onClick={handleAutoNextToggle}
                title={autoNextEnabled ? '关闭自动下一课' : '开启自动下一课'}
              >
                <FastForward size={18} />
              </button>
              <button
                type="button"
                className={soundEnabled ? 'icon-button active' : 'icon-button'}
                onClick={handleSoundToggle}
                title={soundEnabled ? '关闭错误提示音' : '开启错误提示音'}
              >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
            </div>
          </div>

          <div className="prompt-card" aria-label="练习文本">
            {promptCharacters.map((character, index) => {
              const typedCharacter = typedCharacters[index]
              const isCurrent = index === typedCharacters.length && !isFinished
              const stateClass =
                typedCharacter === undefined
                  ? 'pending'
                  : typedCharacter === character
                    ? 'correct'
                    : 'wrong'

              return (
                <span
                  key={`${character}-${index}`}
                  className={`prompt-character ${stateClass} ${isCurrent ? 'current' : ''}`}
                >
                  {character === ' ' ? '\u00A0' : character}
                </span>
              )
            })}
          </div>

          <label className="typing-input-label" htmlFor="typing-input">
            实际输入
          </label>
          <textarea
            id="typing-input"
            ref={inputRef}
            value={inputText}
            onChange={handleTypingInput}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            disabled={isFinished}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="从这里开始输入..."
            className="typing-input"
          />

          {isFinished && (
            <div className="completion-strip" role="status">
              <div>
                <strong>{completionTitle}</strong>
                <span>速度 {stats.wpm} WPM · 准确率 {stats.accuracy}% · 错误 {stats.errorCount}</span>
              </div>
              <button type="button" className="primary-button" onClick={handleNextPrompt}>
                <Play size={18} />
                下一课
              </button>
            </div>
          )}
        </div>

        <aside className="side-panel" aria-label="练习统计">
          <div className="stats-hero">
            <div>
              <p className="eyebrow">Progress board</p>
              <h3>{profileStats.currentStreakDays > 0 ? `${profileStats.currentStreakDays} 天连续练习` : '开始今天的第一课'}</h3>
              <p className="stats-hero-copy">
                {profileStats.runCount > 0
                  ? `累计 ${profileStats.runCount} 次练习，最近一次 ${formatRelativeDate(profileForView.lastPracticedAt)}。`
                  : '账号、设置、自定义文本和练习成绩都会写入 PostgreSQL，换浏览器也能继续。'}
              </p>
            </div>
            <div className="stats-highlight-grid">
              <HighlightStat icon={<CalendarRange size={18} />} label="今天完成" value={`${profileStats.completedToday}`} hint="次练习" />
              <HighlightStat
                icon={<TimerReset size={18} />}
                label="本周时长"
                value={formatPracticeDuration(profileStats.practiceSecondsThisWeek)}
                hint={`${profileStats.completedThisWeek} 次`}
              />
              <HighlightStat icon={<Medal size={18} />} label="最高速度" value={`${profileStats.bestWpm}`} hint="WPM" />
            </div>
          </div>

          <div className="metric-grid">
            <Metric label="WPM" value={stats.wpm.toString()} hint="按 5 字符折算" />
            <Metric label="准确率" value={`${stats.accuracy}%`} hint={`${stats.correctChars}/${stats.attemptedChars || 0}`} />
            <Metric label="用时" value={formatElapsedTime(stats.elapsedSeconds)} hint={remainingSeconds === null ? '不限时' : `剩余 ${remainingSeconds}s`} />
            <Metric label="错误" value={stats.errorCount.toString()} hint="累计错误击键" />
          </div>

          <div className="progress-block">
            <div className="progress-header">
              <span>进度</span>
              <strong>{stats.progress}%</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: `${stats.progress}%` }} />
            </div>
            <small className="progress-footnote">
              当前课 {promptCharacters.length} 字，已正确输入 {stats.correctChars} 字。
            </small>
          </div>

          <div className="control-block">
            <p className="panel-title">练习时长</p>
            <div className="duration-options">
              {DURATION_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={duration === option.value ? 'duration-button active' : 'duration-button'}
                  onClick={() => handleDurationChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="control-block">
            <p className="panel-title">推进模式</p>
            <button
              type="button"
              className={autoNextEnabled ? 'toggle-row active' : 'toggle-row'}
              onClick={handleAutoNextToggle}
            >
              <FastForward size={18} />
              <span>
                <strong>自动下一课</strong>
                <small>{autoNextEnabled ? '完成后自动切换' : '手动切换'}</small>
              </span>
            </button>
          </div>

          <div className="status-card">
            {startedAt && !isFinished ? <PauseCircle size={20} /> : <Target size={20} />}
            <div>
              <strong>{startedAt ? (isFinished ? '已完成' : '练习中') : '等待开始'}</strong>
              <span>{startedAt ? `击键速度 ${stats.cpm} 字符/分` : `${promptCharacters.length} 字符`}</span>
            </div>
          </div>

          <div className="status-card account-card">
            <UserRound size={20} />
            <div>
              <strong>{profileForView.name}</strong>
              <span>{profileStats.runCount} 次记录 · {profileForView.customPrompts.length} 篇自定义</span>
            </div>
          </div>

          <div className="mini-history" aria-label="历史统计概览">
            <div className="mini-history-heading">
              <p className="panel-title">历史概览</p>
              <Sparkles size={16} />
            </div>
            <div className="summary-grid" aria-label="历史统计概览">
              <SummaryCard icon={<BarChart3 size={17} />} label="累计" value={`${profileStats.runCount}`} />
              <SummaryCard icon={<Award size={17} />} label="最佳" value={`${profileStats.bestWpm}`} />
              <SummaryCard icon={<Keyboard size={17} />} label="均速" value={`${profileStats.averageWpm}`} />
              <SummaryCard icon={<CheckCircle2 size={17} />} label="平均准确" value={`${profileStats.averageAccuracy}%`} />
            </div>
          </div>

          <div className="trend-panel" aria-label="最近七天趋势">
            <div className="mini-history-heading">
              <p className="panel-title">最近七天</p>
              <TrendingUp size={16} />
            </div>
            <div className="trend-chart">
              {profileStats.dailyTrend.map((point) => (
                <div key={point.date} className="trend-bar-wrap" title={`${point.label} · ${point.sessionCount} 次 · 平均 ${point.averageWpm} WPM`}>
                  <span className="trend-bar-label">{point.label}</span>
                  <div className="trend-bar-track">
                    <span
                      className={point.sessionCount > 0 ? 'trend-bar-fill active' : 'trend-bar-fill'}
                      style={{ height: `${Math.max(10, Math.round((point.sessionCount / trendPeak) * 100))}%` }}
                    />
                  </div>
                  <strong>{point.sessionCount}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="insight-list" aria-label="训练洞察">
            <div className="mini-history-heading">
              <p className="panel-title">训练洞察</p>
              <Activity size={16} />
            </div>
            <SummaryCard icon={<Gauge size={17} />} label="平均节奏" value={`${profileStats.averageCpm} CPM`} />
            <SummaryCard icon={<Flame size={17} />} label="最长连续" value={`${profileStats.bestStreakDays} 天`} />
            <SummaryCard icon={<Clock3 size={17} />} label="累计时长" value={formatPracticeDuration(profileStats.totalPracticeSeconds)} />
            <SummaryCard icon={<Target size={17} />} label="最强模式" value={strongestMode && strongestMode.runCount > 0 ? getModeShortLabel(strongestMode.mode) : '待解锁'} />
          </div>

          <div className="mode-breakdown" aria-label="模式表现">
            <div className="mini-history-heading">
              <p className="panel-title">模式表现</p>
              <Layers3 size={16} />
            </div>
            <div className="mode-breakdown-list">
              {profileStats.modeBreakdown.map((item) => (
                <div className="mode-breakdown-row" key={item.mode}>
                  <div>
                    <strong>{getModeShortLabel(item.mode)}</strong>
                    <span>{item.runCount} 次 · 平均 {item.averageAccuracy}%</span>
                  </div>
                  <div className="mode-breakdown-metrics">
                    <span>{item.averageWpm} WPM</span>
                    <strong>{item.bestWpm}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="recent-results" aria-label="最近成绩列表">
            <div className="mini-history-heading">
              <p className="panel-title">最近记录</p>
              <History size={16} />
            </div>
            {recentResults.length === 0 ? (
              <div className="empty-library">完成一篇练习后，这里会开始记录你最近几次的速度和准确率。</div>
            ) : (
              <div className="recent-results-list">
                {recentResults.map((result) => (
                  <div className="recent-result-row" key={result.id}>
                    <div>
                      <strong>{getModeShortLabel(result.mode)}</strong>
                      <span>{formatRelativeDate(result.completedAt)}</span>
                    </div>
                    <div className="recent-result-metrics">
                      <span>{result.accuracy}%</span>
                      <strong>{result.wpm} WPM</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  )
}

interface MetricProps {
  label: string
  value: string
  hint: string
}

function Metric({ label, value, hint }: MetricProps) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  )
}

interface HighlightStatProps {
  icon: ReactNode
  label: string
  value: string
  hint: string
}

function HighlightStat({ icon, label, value, hint }: HighlightStatProps) {
  return (
    <div className="highlight-stat">
      <span className="highlight-stat-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <span>{hint}</span>
      </div>
    </div>
  )
}

interface SummaryCardProps {
  icon: ReactNode
  label: string
  value: string
}

function SummaryCard({ icon, label, value }: SummaryCardProps) {
  return (
    <div className="summary-card">
      <span className="summary-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

export default App
