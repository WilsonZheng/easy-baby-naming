/**
 * 分析一个「已经定下来的」名字。
 *
 * 和生成引擎的区别：这里不做筛选、不打分排序，只把能查到的事实摆出来 ——
 * 逐字读音字义、连读、谐音、以及在英语环境里会被念成什么。
 * 遇到字库里没有的字就如实说不认识，不猜。
 */
import { CHAR_MAP, type Element } from '../data/characters'
import { LOOKUP_CHARS } from '../data/lookupChars'
import { SURNAME_MAP, SURNAMES } from '../data/surnames'
import { findSource } from '../data/sources'
import { checkTones, stripTone } from './pinyin'
import { assessReadability, type ReadabilityResult } from './readability'
import { checkHomophone, type HomophoneHit } from './homophone'
import { sameRadical } from './radicals'

export interface AnalyzedChar {
  char: string
  pinyin: string | null
  tone: number | null
  meaning: string | null
  element: Element | null
  strokes: number | null
  /** 两张表里都查不到 */
  unknown: boolean
}

export interface NameAnalysis {
  surname: string
  given: string
  full: string
  surnameChars: AnalyzedChar[]
  givenChars: AnalyzedChar[]
  /** 全名带调拼音，查不到的字用「?」占位 */
  pinyin: string
  /** 有几个字查不到 */
  unknownCount: number
  totalStrokes: number | null
  readability: ReadabilityResult | null
  homophones: HomophoneHit[]
  toneNotes: string[]
  source: { line: string; ref: string } | null
  sameRadical: string | null
}

const COMPOUND_SURNAMES = new Set(
  SURNAMES.filter((s) => s.surname.length === 2).map((s) => s.surname),
)

/** 从完整姓名里切出姓和名。复姓优先，其次单姓。 */
export function splitName(full: string): { surname: string; given: string } {
  const clean = full.replace(/[^一-龥]/g, '')
  if (clean.length >= 3 && COMPOUND_SURNAMES.has(clean.slice(0, 2))) {
    return { surname: clean.slice(0, 2), given: clean.slice(2) }
  }
  if (clean.length >= 2) return { surname: clean.slice(0, 1), given: clean.slice(1) }
  return { surname: clean, given: '' }
}

function analyzeChar(char: string): AnalyzedChar {
  const main = CHAR_MAP.get(char)
  if (main) {
    return {
      char,
      pinyin: main.pinyin,
      tone: main.tone,
      meaning: main.meaning,
      element: main.element,
      strokes: main.strokes,
      unknown: false,
    }
  }
  const extra = LOOKUP_CHARS.get(char)
  if (extra) {
    // 查询表只有读音和字义，五行笔画留空 —— 没把握的信息不如不给
    return {
      char,
      pinyin: extra.pinyin,
      tone: extra.tone,
      meaning: extra.meaning,
      element: null,
      strokes: null,
      unknown: false,
    }
  }
  return { char, pinyin: null, tone: null, meaning: null, element: null, strokes: null, unknown: true }
}

export function analyzeName(input: string): NameAnalysis | null {
  const { surname, given } = splitName(input)
  if (!surname || !given) return null

  const surnameEntry = SURNAME_MAP.get(surname)
  const surnameChars: AnalyzedChar[] = surnameEntry
    ? surname.split('').map((c, i) => ({
        char: c,
        pinyin: surnameEntry.pinyin.split(' ')[i] ?? null,
        tone: i === surname.length - 1 ? surnameEntry.tone : null,
        meaning: null,
        element: null,
        strokes: null,
        unknown: false,
      }))
    : surname.split('').map(analyzeChar)

  const givenChars = given.split('').map(analyzeChar)
  const allChars = [...surnameChars, ...givenChars]

  const pinyin = allChars.map((c) => c.pinyin ?? '?').join(' ')
  const unknownCount = allChars.filter((c) => c.unknown).length

  const givenPinyins = givenChars.map((c) => c.pinyin).filter(Boolean) as string[]
  const readability = givenPinyins.length ? assessReadability(givenPinyins) : null

  const syllables = allChars.map((c) => (c.pinyin ? stripTone(c.pinyin) : '')).filter(Boolean)
  const homophones = syllables.length >= 2 ? checkHomophone(syllables) : []

  const tones = allChars.map((c) => c.tone).filter((t): t is number => t !== null)
  const toneNotes = tones.length === allChars.length ? checkTones(tones).map((i) => i.note) : []

  const strokeValues = givenChars.map((c) => c.strokes)
  const totalStrokes = strokeValues.every((s) => s !== null)
    ? (strokeValues as number[]).reduce((a, b) => a + b, 0)
    : null

  const src = givenChars.length === 2 && !givenChars.some((c) => c.unknown)
    ? findSource(givenChars[0].char, givenChars[1].char)
    : undefined

  return {
    surname,
    given,
    full: surname + given,
    surnameChars,
    givenChars,
    pinyin,
    unknownCount,
    totalStrokes,
    readability,
    homophones,
    toneNotes,
    source: src ? { line: src.line, ref: src.ref } : null,
    sameRadical: givenChars.length === 2
      ? sameRadical(givenChars[0].char, givenChars[1].char)
      : null,
  }
}

/** 输入的是中文还是英文 */
export function detectInputKind(text: string): 'zh' | 'en' | 'unknown' {
  const t = text.trim()
  if (!t) return 'unknown'
  if (/[一-龥]/.test(t)) return 'zh'
  if (/^[A-Za-z][A-Za-z'\- ]*$/.test(t)) return 'en'
  return 'unknown'
}
