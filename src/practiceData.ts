export type PracticeMode = "mixed" | "chinese" | "english" | "custom"
export type PracticeCategory =
  | "article"
  | "sentence"
  | "phrase"
  | "punctuation"
  | "number"
  | "classic"
  | "code"
  | "custom"

export type PracticeCategoryFilter = "all" | PracticeCategory

export interface PracticeModeMeta {
  id: PracticeMode
  label: string
  shortLabel: string
  description: string
}

export interface PracticeCategoryMeta {
  id: PracticeCategoryFilter
  label: string
  shortLabel: string
  description: string
}

export interface PracticePrompt {
  mode: PracticeMode
  category: PracticeCategory
  difficulty: number
  title: string
  text: string
  source: string
}

type PromptSeed = Omit<PracticePrompt, "difficulty" | "title">

export const PRACTICE_MODES: PracticeModeMeta[] = [
  {
    id: "chinese",
    label: "中文练习",
    shortLabel: "中文",
    description: "中文文章、短句、词组、标点和数字专项"
  },
  {
    id: "english",
    label: "English practice",
    shortLabel: "英文",
    description: "英文段落、句子、短语和标点节奏"
  },
  {
    id: "mixed",
    label: "综合练习",
    shortLabel: "混合",
    description: "中文、英文、数字符号和代码素材混合推进"
  },
  {
    id: "custom",
    label: "自定义练习",
    shortLabel: "自定义",
    description: "导入或粘贴自己的文本，按本地账号保存"
  }
]

export const PRACTICE_CATEGORIES: PracticeCategoryMeta[] = [
  {
    id: "all",
    label: "全部分类",
    shortLabel: "全部",
    description: "显示当前语言下的所有练习素材"
  },
  {
    id: "article",
    label: "文章练习",
    shortLabel: "文章",
    description: "约 100 字的完整段落，适合稳定节奏"
  },
  {
    id: "sentence",
    label: "好句练习",
    shortLabel: "好句",
    description: "连续短句，练停顿、换气和完整句号"
  },
  {
    id: "phrase",
    label: "词组专项",
    shortLabel: "词组",
    description: "高频词组和短语串联，适合提速"
  },
  {
    id: "punctuation",
    label: "标点专项",
    shortLabel: "标点",
    description: "逗号、引号、括号、冒号和分号练习"
  },
  {
    id: "number",
    label: "数字符号",
    shortLabel: "数字",
    description: "日期、金额、百分比、编号和符号输入"
  },
  {
    id: "classic",
    label: "经典摘意",
    shortLabel: "经典",
    description: "公共领域经典气质的原创改写练习"
  },
  {
    id: "code",
    label: "代码片段",
    shortLabel: "代码",
    description: "常见代码符号、括号和英文单词专项"
  },
  {
    id: "custom",
    label: "自定义文本",
    shortLabel: "自定义",
    description: "来自粘贴内容或本地文本文件的练习"
  }
]

const categoryShortLabels: Record<PracticeCategory, string> = {
  article: "文章",
  sentence: "好句",
  phrase: "词组",
  punctuation: "标点",
  number: "数字",
  classic: "经典",
  code: "代码",
  custom: "自定义"
}

const chineseSubjects = [
  "清晨的教室",
  "安静的图书馆",
  "傍晚的街角",
  "雨后的操场",
  "明亮的办公室",
  "周末的厨房",
  "新开的书店",
  "返程的地铁",
  "海边的栈道",
  "冬日的窗台",
  "热闹的菜市场",
  "午后的会议室",
  "小区的花园",
  "城市的天桥",
  "远处的山坡",
  "社区的活动室",
  "整洁的实验室",
  "夜晚的公交站",
  "开学的走廊",
  "临街的咖啡馆"
]

const chineseActions = [
  "把一天的安排写在便签上",
  "认真核对每一行记录",
  "慢慢整理散乱的资料",
  "听见键盘声一下一下响起",
  "把复杂的问题拆成几步",
  "沿着清楚的线索继续推敲",
  "在短暂的停顿里调整呼吸",
  "把重要的名字重新标记",
  "用更稳的节奏完成练习",
  "从细小的错误里找到原因",
  "把新的想法写进草稿",
  "等待屏幕上的光逐渐稳定",
  "把相似的词语分开放好",
  "提醒自己先准确再加速",
  "给每个段落留出余地",
  "认真读完最后一个句号",
  "把数字和标点一起检查",
  "在重复中找到更好的手感",
  "把昨天的结果和今天比较",
  "给下一次练习定下目标"
]

const chineseDetails = [
  "窗外有细碎的声音，却没有打乱眼前的节奏",
  "每个字都像小小的台阶，连起来就能走得更远",
  "如果急着追速度，最容易忽略那些普通的标点",
  "一段话写得越清楚，输入时越能发现自己的习惯",
  "手指慢慢熟悉路线以后，心里也会安静下来",
  "反复练习不是为了机械重复，而是为了减少犹豫",
  "看似简单的短句，常常藏着逗号和顿号的细节",
  "他没有马上修改错误，而是先把整段节奏稳住",
  "当注意力回到文字本身，速度就不再显得慌张",
  "那些被忽略的空格和符号，决定了成绩是否稳定",
  "越是常见的词语，越需要打得自然、准确、干净",
  "练习结束时，屏幕上留下的是一条清楚的进步线",
  "熟悉的文章能练速度，陌生的内容能练专注",
  "输入不是单纯敲键，而是在眼睛和手指之间传递秩序",
  "只要每一轮都比上一轮少错一点，训练就有了意义",
  "他把难读的句子拆成两段，顿时觉得轻松许多",
  "词组、数字、标点交替出现时，真实场景才会接近",
  "一百字左右的练习刚好足够热身，也不会让人疲惫",
  "从第一行到最后一行，稳定比偶然的爆发更可靠",
  "清晰的分类让练习变得有方向，也更容易坚持"
]

const chineseClosings = [
  "于是这一课不只练速度，也练耐心和判断。",
  "这样的节奏虽然不快，却能让错误一点点减少。",
  "等到最后一个字落下，整段文字也变得顺滑起来。",
  "他知道真正的熟练，往往来自这些看不见的细节。",
  "练习继续向前，手指和目光终于配合得更自然。",
  "如果每天都能这样完成一段，进步就会慢慢显现。",
  "这不是一场比赛，而是一段可以被记录的训练。",
  "越到后面越要放稳，因为准确率会说明一切。",
  "当心态放松下来，文字也会跟着变得清楚。",
  "下一段开始之前，他先记住了这一段的手感。"
]

const chinesePhrases = [
  "清晰目标",
  "稳定节奏",
  "准确输入",
  "连续练习",
  "细心校对",
  "专注阅读",
  "自然停顿",
  "快速反应",
  "温和提醒",
  "逐步提升",
  "沉着应对",
  "轻声朗读",
  "重复巩固",
  "完整记录",
  "认真观察",
  "及时复盘",
  "减少错误",
  "拆分难点",
  "重新开始",
  "保持耐心",
  "键位熟悉",
  "手眼配合",
  "文章选择",
  "分类训练",
  "速度统计",
  "结果保存",
  "整洁页面",
  "舒适配色",
  "温柔反馈",
  "目标达成"
]

const classicImages = [
  "山色入窗",
  "灯影摇红",
  "春水初生",
  "秋声在树",
  "月落前庭",
  "远帆过浦",
  "松风满袖",
  "细雨敲阶",
  "晨钟未歇",
  "书卷半开",
  "竹影横窗",
  "寒星照水",
  "落花无语",
  "白云出岫",
  "小桥流水",
  "长街微雪"
]

const englishSubjects = [
  "The quiet library",
  "A careful student",
  "The morning station",
  "A patient writer",
  "The small workshop",
  "A bright classroom",
  "The city garden",
  "A steady typist",
  "The open notebook",
  "A late train",
  "The project team",
  "A calm designer",
  "The evening desk",
  "A focused reader",
  "The science club",
  "A friendly editor"
]

const englishActions = [
  "turned scattered notes into a clear plan",
  "checked every comma before moving to the next line",
  "learned to slow down whenever the sentence became difficult",
  "kept a steady rhythm instead of chasing a lucky burst of speed",
  "noticed that accuracy improved when the eyes stayed one word ahead",
  "marked the hardest phrase and practiced it twice without complaint",
  "used short breaks to reset attention before the next paragraph",
  "compared today's result with yesterday's quiet progress",
  "kept the screen simple so the words could carry the lesson",
  "turned an ordinary passage into a useful typing drill",
  "watched small mistakes reveal habits that needed attention",
  "finished the exercise with fewer pauses and a calmer hand"
]

const englishDetails = [
  "The goal was not to win a race, but to build reliable control.",
  "Each sentence asked for clean spaces, firm punctuation, and patient hands.",
  "When the paragraph felt long, the best strategy was to breathe and continue.",
  "The lesson became easier once the typist stopped fighting the keyboard.",
  "Good practice rewards attention before it rewards speed.",
  "A familiar word can still cause trouble when it arrives beside a symbol.",
  "The final line felt smoother because the first line had been careful.",
  "Progress appeared as a series of small corrections rather than one big leap.",
  "The passage stayed short enough to repeat and long enough to matter.",
  "Every clean attempt made the next attempt feel a little less uncertain."
]

const englishPhrases = [
  "steady rhythm",
  "clean spacing",
  "patient hands",
  "careful punctuation",
  "quiet focus",
  "daily progress",
  "short practice",
  "clear target",
  "better accuracy",
  "smooth reading",
  "simple layout",
  "warm feedback",
  "honest score",
  "quick review",
  "strong habit",
  "focused lesson",
  "natural pause",
  "fresh attempt",
  "final sentence",
  "typing control"
]

function pick<T>(items: T[], index: number, step = 1) {
  return items[(index * step) % items.length]
}

function closeChinese(text: string) {
  return /[。！？]$/.test(text) ? text : `${text}。`
}

function fitChineseLength(text: string, index: number) {
  const fillers = [
    "这一点看似普通，却能帮助练习者把注意力放回文字。",
    "分类越清楚，训练越容易坚持，成绩也更方便比较。",
    "如果能把每次错误记录下来，下一轮就会更有方向。",
    "一百字左右的长度适合反复练习，也适合观察节奏。"
  ]
  let fitted = closeChinese(text)
  let guard = 0

  while (Array.from(fitted).length < 92 && guard < 6) {
    fitted = `${fitted}${pick(fillers, index + guard)}`
    guard += 1
  }

  const chars = Array.from(fitted)
  if (chars.length <= 138) return fitted

  const sliced = chars.slice(0, 136).join("").replace(/[，、；：,. ]+$/u, "")
  return closeChinese(sliced)
}

function fitEnglishLength(text: string, index: number) {
  const fillers = [
    "The short length keeps the exercise repeatable without making it feel empty.",
    "Clean repetition turns an ordinary paragraph into useful training.",
    "A steady hand can learn more from one careful attempt than from many rushed ones.",
    "The best result is a passage that feels calm, readable, and precise."
  ]
  let fitted = text.trim()
  let guard = 0

  while (fitted.length < 105 && guard < 6) {
    fitted = `${fitted} ${pick(fillers, index + guard)}`
    guard += 1
  }

  if (fitted.length <= 165) return fitted

  const cut = fitted.slice(0, 160)
  const lastSpace = cut.lastIndexOf(" ")
  return `${cut.slice(0, Math.max(96, lastSpace)).replace(/[,:; ]+$/u, "")}.`
}

function buildChineseArticle(index: number): PromptSeed {
  const subject = pick(chineseSubjects, index)
  const action = pick(chineseActions, index, 3)
  const detail = pick(chineseDetails, index, 5)
  const closing = pick(chineseClosings, index, 7)

  return {
    mode: "chinese",
    category: "article",
    text: fitChineseLength(`${subject}里，有人${action}。${detail}${closing}`, index),
    source: "原创分类素材：中文文章"
  }
}

function buildChineseSentence(index: number): PromptSeed {
  const subject = pick(chineseSubjects, index, 2)
  const one = pick(chineseDetails, index, 3)
  const two = pick(chineseClosings, index, 4)
  const three = pick(chineseActions, index, 5)

  return {
    mode: "chinese",
    category: "sentence",
    text: fitChineseLength(`${subject}适合慢慢练。${one}${two}随后他${three}，把下一段也读得清楚。`, index),
    source: "原创分类素材：好句练习"
  }
}

function buildChinesePhrase(index: number): PromptSeed {
  const phrases = Array.from({ length: 24 }, (_, offset) => pick(chinesePhrases, index + offset, offset + 1))
  const text = `${phrases.slice(0, 8).join("、")}；${phrases.slice(8, 16).join("、")}；${phrases.slice(16).join("、")}。`

  return {
    mode: "chinese",
    category: "phrase",
    text: fitChineseLength(text, index),
    source: "原创分类素材：词组专项"
  }
}

function buildChinesePunctuation(index: number): PromptSeed {
  const subject = pick(chineseSubjects, index)
  const action = pick(chineseActions, index, 2)
  const detail = pick(chineseDetails, index, 4)

  return {
    mode: "chinese",
    category: "punctuation",
    text: fitChineseLength(`老师说：“先看清题目，再开始输入。”${subject}里，他${action}；如果遇到逗号、顿号、括号（尤其是成对出现的符号），就放慢一点。${detail}`, index),
    source: "原创分类素材：标点专项"
  }
}

function buildChineseNumber(index: number): PromptSeed {
  const day = (index % 28) + 1
  const month = (index % 12) + 1
  const amount = 1280 + index * 17
  const rate = 72 + (index % 27)
  const code = `${(index + 3).toString().padStart(3, "0")}-${(index * 7 + 19).toString().padStart(4, "0")}`

  return {
    mode: "chinese",
    category: "number",
    text: fitChineseLength(`2026年${month}月${day}日，练习记录编号为 ${code}。本轮输入 ${amount} 个字符，准确率 ${rate}%，用时 ${(index % 5) + 1} 分 ${(index * 11) % 60} 秒；请核对数字、空格、百分号和连字符。`, index),
    source: "原创分类素材：数字符号"
  }
}

function buildChineseClassic(index: number): PromptSeed {
  const imageA = pick(classicImages, index)
  const imageB = pick(classicImages, index, 5)
  const imageC = pick(classicImages, index, 9)

  return {
    mode: "chinese",
    category: "classic",
    text: fitChineseLength(`${imageA}，${imageB}，行人缓步过桥，听见远处有人读书。${imageC}之时，心中忽然明白：文章贵在清通，练字贵在从容；一笔一画，一键一声，皆可见平日功夫。`, index),
    source: "原创公共领域风格：经典摘意"
  }
}

function buildEnglishArticle(index: number): PromptSeed {
  const subject = pick(englishSubjects, index)
  const action = pick(englishActions, index, 3)
  const detail = pick(englishDetails, index, 5)

  return {
    mode: "english",
    category: "article",
    text: fitEnglishLength(`${subject} ${action}. ${detail}`, index),
    source: "Original category material: English article"
  }
}

function buildEnglishSentence(index: number): PromptSeed {
  const subject = pick(englishSubjects, index, 2)
  const first = pick(englishDetails, index, 3)
  const second = pick(englishActions, index, 5)

  return {
    mode: "english",
    category: "sentence",
    text: fitEnglishLength(`${subject} began with one clear sentence. ${first} Then the learner ${second}, keeping every pause visible.`, index),
    source: "Original category material: sentence drill"
  }
}

function buildEnglishPhrase(index: number): PromptSeed {
  const phrases = Array.from({ length: 18 }, (_, offset) => pick(englishPhrases, index + offset, offset + 1))
  const text = `${phrases.slice(0, 6).join(", ")}; ${phrases.slice(6, 12).join(", ")}; ${phrases.slice(12).join(", ")}.`

  return {
    mode: "english",
    category: "phrase",
    text: fitEnglishLength(text, index),
    source: "Original category material: phrase drill"
  }
}

function buildEnglishPunctuation(index: number): PromptSeed {
  const subject = pick(englishSubjects, index)
  const action = pick(englishActions, index, 2)

  return {
    mode: "english",
    category: "punctuation",
    text: fitEnglishLength(`${subject} asked, "Should we pause here, or continue?" The answer was simple: ${action}; then review commas, quotes, brackets, and the final period.`, index),
    source: "Original category material: punctuation drill"
  }
}

function buildMixedNumber(index: number): PromptSeed {
  const sku = `PX-${(index + 41).toString().padStart(4, "0")}`
  const amount = (index * 37 + 560).toLocaleString("en-US")
  const phone = `138-${(1000 + index * 13).toString().slice(0, 4)}-${(2000 + index * 29).toString().slice(0, 4)}`

  return {
    mode: "mixed",
    category: "number",
    text: fitChineseLength(`订单 ${sku}：收件电话 ${phone}，金额 ¥${amount}.00，折扣 ${(index % 30) + 5}%，状态 OK。请连续输入英文编号、中文说明、人民币符号、小数点和百分号。`, index),
    source: "原创分类素材：中英数字混输"
  }
}

function buildCode(index: number): PromptSeed {
  const names = ["typingStats", "lessonList", "promptText", "userScore", "categoryMap", "activeTimer"]
  const name = pick(names, index)
  const count = 60 + (index % 40)

  return {
    mode: "mixed",
    category: "code",
    text: fitEnglishLength(`const ${name} = items.filter((item) => item.count >= ${count}).map((item) => item.label.trim()); console.log("${name}", ${name}.length);`, index),
    source: "Original category material: code snippet"
  }
}

interface SeriesConfig {
  count: number
  build: (index: number) => PromptSeed
}

const seriesConfigs: SeriesConfig[] = [
  { count: 210, build: buildChineseArticle },
  { count: 110, build: buildChineseSentence },
  { count: 90, build: buildChinesePhrase },
  { count: 70, build: buildChinesePunctuation },
  { count: 50, build: buildChineseNumber },
  { count: 80, build: buildChineseClassic },
  { count: 150, build: buildEnglishArticle },
  { count: 80, build: buildEnglishSentence },
  { count: 60, build: buildEnglishPhrase },
  { count: 40, build: buildEnglishPunctuation },
  { count: 20, build: buildMixedNumber },
  { count: 40, build: buildCode }
]

function buildPromptSeeds() {
  const indexes = seriesConfigs.map(() => 0)
  const seeds: PromptSeed[] = []
  const targetCount = seriesConfigs.reduce((total, config) => total + config.count, 0)

  while (seeds.length < targetCount) {
    seriesConfigs.forEach((config, configIndex) => {
      if (indexes[configIndex] >= config.count) return

      seeds.push(config.build(indexes[configIndex]))
      indexes[configIndex] += 1
    })
  }

  return seeds
}

const practicePrompts: PracticePrompt[] = buildPromptSeeds().map((prompt, index) => {
  const modeMeta = PRACTICE_MODES.find((mode) => mode.id === prompt.mode) ?? PRACTICE_MODES[0]
  const categoryLabel = categoryShortLabels[prompt.category]
  const difficulty = index + 1

  return {
    ...prompt,
    difficulty,
    title: `${modeMeta.shortLabel}${categoryLabel} 第 ${difficulty.toString().padStart(4, "0")} 课`
  }
})

export const PRACTICE_PROMPT_COUNT = practicePrompts.length

const promptBanks: Record<Exclude<PracticeMode, "mixed" | "custom">, PracticePrompt[]> = {
  chinese: practicePrompts.filter((prompt) => prompt.mode === "chinese"),
  english: practicePrompts.filter((prompt) => prompt.mode === "english")
}

function getPromptPool(mode: PracticeMode) {
  if (mode === "custom") return []
  return mode === "mixed" ? practicePrompts : promptBanks[mode]
}

export function getModeMeta(mode: PracticeMode) {
  return PRACTICE_MODES.find((item) => item.id === mode) ?? PRACTICE_MODES[0]
}

export function getCategoryMeta(category: PracticeCategoryFilter) {
  return PRACTICE_CATEGORIES.find((item) => item.id === category) ?? PRACTICE_CATEGORIES[0]
}

export function getInitialPrompt(mode: PracticeMode) {
  return getPromptPool(mode)[0] ?? practicePrompts[0]
}

export function getPracticePrompts(mode: PracticeMode) {
  return getPromptPool(mode)
}

export function getNextPrompt(mode: PracticeMode, currentPrompt?: PracticePrompt) {
  const pool = getPromptPool(mode)
  if (!currentPrompt) return pool[0] ?? practicePrompts[0]

  const currentIndex = pool.findIndex(
    (prompt) => prompt.mode === currentPrompt.mode && prompt.text === currentPrompt.text
  )
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % pool.length

  return pool[nextIndex] ?? practicePrompts[0]
}
