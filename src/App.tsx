import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, CompositionEvent, ReactNode } from 'react'
import {
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  Flame,
  Keyboard,
  Layers3,
  PauseCircle,
  Play,
  RefreshCcw,
  RotateCcw,
  Search,
  Sparkles,
  Target,
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
  getNextPrompt,
  getPracticePrompts,
  type PracticeCategoryFilter,
  type PracticeMode,
  type PracticePrompt
} from './practiceData'
import {
  DURATION_OPTIONS,
  calculateTypingStats,
  createPracticeResult,
  formatElapsedTime,
  summarizeHistory,
  type DurationOption,
  type PracticeResult
} from './typingUtils'

const HISTORY_KEY = 'typing-practice-history'
const MAX_HISTORY_ITEMS = 8

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

function loadHistory() {
  try {
    const rawHistory = window.localStorage.getItem(HISTORY_KEY)
    return rawHistory ? (JSON.parse(rawHistory) as PracticeResult[]) : []
  } catch {
    return []
  }
}

function saveHistory(history: PracticeResult[]) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    // localStorage 不可用时只影响历史记录，不影响练习本身。
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
  return `${prompt.mode}-${prompt.difficulty}-${prompt.text}`
}

function getPromptTitle(prompt: PracticePrompt) {
  return prompt.title
}

function isPromptInCategory(prompt: PracticePrompt, category: PracticeCategoryFilter) {
  return category === 'all' || prompt.category === category
}

function getFilteredPrompts(
  mode: PracticeMode,
  levelId: LevelId,
  category: PracticeCategoryFilter,
  searchTerm: string
) {
  const normalizedSearch = searchTerm.trim().toLowerCase()

  return getPracticePrompts(mode).filter((prompt) => {
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
  const [duration, setDuration] = useState<DurationOption>(0)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [history, setHistory] = useState<PracticeResult[]>([])
  const [streakCount, setStreakCount] = useState(0)
  const [now, setNow] = useState(Date.now())
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isComposingRef = useRef(false)
  const resultSavedRef = useRef(false)
  const typedTextRef = useRef('')

  const visiblePrompts = useMemo(
    () => getFilteredPrompts(selectedMode, selectedLevel, selectedCategory, searchTerm),
    [searchTerm, selectedCategory, selectedLevel, selectedMode]
  )
  const levelCounts = useMemo(() => {
    return LEVEL_FILTERS.map((level) => ({
      ...level,
      count: getFilteredPrompts(selectedMode, level.id, selectedCategory, '').length
    }))
  }, [selectedCategory, selectedMode])
  const categoryCounts = useMemo(() => {
    return PRACTICE_CATEGORIES.map((category) => ({
      ...category,
      count: getFilteredPrompts(selectedMode, selectedLevel, category.id, '').length
    }))
  }, [selectedLevel, selectedMode])
  const promptCharacters = useMemo(() => Array.from(activePrompt.text), [activePrompt.text])
  const typedCharacters = useMemo(() => Array.from(typedText), [typedText])
  const isFinished = finishedAt !== null
  const activeModeMeta = getModeMeta(selectedMode)
  const actualModeMeta = getModeMeta(activePrompt.mode)
  const activeCategoryMeta = getCategoryMeta(activePrompt.category)
  const selectedCategoryMeta = getCategoryMeta(selectedCategory)
  const activeLevel = getLevelForDifficulty(activePrompt.difficulty)
  const historySummary = useMemo(() => summarizeHistory(history), [history])

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
    setHistory(loadHistory())
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

  function recordResult(endTime: number, finalTypedText = typedText) {
    if (resultSavedRef.current) return

    const finalStats = calculateTypingStats({
      prompt: activePrompt.text,
      typedText: finalTypedText,
      startedAt,
      finishedAt: endTime,
      errorCount,
      now: endTime
    })
    const result = createPracticeResult(activePrompt.mode, activePrompt.text, finalStats)

    resultSavedRef.current = true
    setHistory((currentHistory) => {
      const nextHistory = [result, ...currentHistory].slice(0, MAX_HISTORY_ITEMS)
      saveHistory(nextHistory)
      return nextHistory
    })
  }

  function finishPractice(endTime = Date.now(), finalTypedText = typedText) {
    setFinishedAt(endTime)
    recordResult(endTime, finalTypedText)
  }

  function getNextVisiblePrompt() {
    if (visiblePrompts.length === 0) return getNextPrompt(selectedMode, activePrompt)

    const currentIndex = visiblePrompts.findIndex((prompt) => getPromptKey(prompt) === getPromptKey(activePrompt))
    return visiblePrompts[currentIndex === -1 ? 0 : (currentIndex + 1) % visiblePrompts.length]
  }

  function handleModeChange(mode: PracticeMode) {
    setSelectedMode(mode)
    resetSession(getFilteredPrompts(mode, selectedLevel, selectedCategory, searchTerm)[0] ?? getInitialPrompt(mode))
  }

  function handleLevelChange(levelId: LevelId) {
    setSelectedLevel(levelId)
    resetSession(getFilteredPrompts(selectedMode, levelId, selectedCategory, searchTerm)[0] ?? getInitialPrompt(selectedMode))
  }

  function handleCategoryChange(category: PracticeCategoryFilter) {
    setSelectedCategory(category)
    resetSession(getFilteredPrompts(selectedMode, selectedLevel, category, searchTerm)[0] ?? getInitialPrompt(selectedMode))
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

    const clippedValue = clipToPrompt(value)
    const nextCharacters = Array.from(clippedValue)
    const previousValue = typedTextRef.current
    const previousLength = Array.from(previousValue).length

    if (clippedValue === previousValue) return

    if (!startedAt && clippedValue.length > 0) {
      setStartedAt(Date.now())
      setNow(Date.now())
    }

    if (nextCharacters.length > previousLength) {
      const addedCharacters = nextCharacters.slice(previousLength)
      const mistakes = addedCharacters.reduce((total, character, offset) => {
        const promptIndex = previousLength + offset
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

    typedTextRef.current = clippedValue
    setTypedText(clippedValue)

    if (nextCharacters.length >= promptCharacters.length) {
      finishPractice(Date.now(), clippedValue)
    }
  }

  function clipToPrompt(value: string) {
    return Array.from(value).slice(0, promptCharacters.length).join('')
  }

  function handleTypingInput(event: ChangeEvent<HTMLTextAreaElement>) {
    const nativeEvent = event.nativeEvent as InputEvent
    const clippedValue = clipToPrompt(event.target.value)

    setInputText(clippedValue)
    if (isComposingRef.current || nativeEvent.isComposing) return

    handleTypingChange(clippedValue)
  }

  function handleCompositionStart() {
    isComposingRef.current = true
  }

  function handleCompositionEnd(event: CompositionEvent<HTMLTextAreaElement>) {
    isComposingRef.current = false
    const clippedValue = clipToPrompt(event.currentTarget.value)
    setInputText(clippedValue)
    handleTypingChange(clippedValue)
  }

  function handleDurationChange(nextDuration: DurationOption) {
    setDuration(nextDuration)
    resetSession(activePrompt)
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
            {visiblePrompts.length}/{PRACTICE_PROMPT_COUNT} 篇
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
            难度 {activePrompt.difficulty}/{PRACTICE_PROMPT_COUNT}
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
                className={soundEnabled ? 'icon-button active' : 'icon-button'}
                onClick={() => setSoundEnabled((enabled) => !enabled)}
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

          <div className="status-card">
            {startedAt && !isFinished ? <PauseCircle size={20} /> : <Target size={20} />}
            <div>
              <strong>{startedAt ? (isFinished ? '已完成' : '练习中') : '等待开始'}</strong>
              <span>{startedAt ? `击键速度 ${stats.cpm} 字符/分` : `${promptCharacters.length} 字符`}</span>
            </div>
          </div>

          <div className="mini-history" aria-label="最近成绩">
            <div className="mini-history-heading">
              <p className="panel-title">最近成绩</p>
              <Sparkles size={16} />
            </div>
            <div className="summary-grid" aria-label="历史统计概览">
              <SummaryCard icon={<BarChart3 size={17} />} label="次数" value={`${historySummary.runCount}`} />
              <SummaryCard icon={<Award size={17} />} label="最佳" value={`${historySummary.bestWpm}`} />
              <SummaryCard icon={<Keyboard size={17} />} label="均速" value={`${historySummary.averageWpm}`} />
              <SummaryCard icon={<CheckCircle2 size={17} />} label="准确" value={`${historySummary.averageAccuracy}%`} />
            </div>
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
