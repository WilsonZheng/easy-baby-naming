import type { Element, StyleTag } from './data/characters'
import type { EnStyle } from './data/englishNames'

export type Gender = 'boy' | 'girl' | 'neutral'

export interface BirthInfo {
  /** YYYY-MM-DD */
  date: string
  /** HH:mm，留空表示不知道具体时辰 */
  time: string
  /** cities.ts 里的中文城市名 */
  city: string
}

/** 先定中文名，还是先定英文名 */
export type NameMode = 'zh' | 'en'

export interface Prefs {
  mode: NameMode
  surname: string
  gender: Gender
  /** 'any' 表示不挑风格 */
  style: StyleTag | 'any'
  /** 名字用几个字 */
  length: 1 | 2
  birth: BirthInfo | null
  /** 'none' 不参考五行；'auto' 按八字补最弱的；或指定一个五行 */
  element: Element | 'auto' | 'none'
  /** 必须包含的字（辈分字等），只能是库里的字 */
  mustInclude: string
  /** 家族避讳的字，逐字排除 */
  avoidChars: string
  /** 英文姓氏拼写，用于首字母与节奏检查 */
  englishSurname: string
  /** 已有孩子的名字，新名字会尽量呼应 */
  siblingName: string
  avoidPopular: boolean
  easyToWrite: boolean
  englishFriendly: boolean
  enStyle: EnStyle | 'any'
}

export const DEFAULT_PREFS: Prefs = {
  mode: 'zh',
  surname: '',
  gender: 'neutral',
  style: 'any',
  length: 2,
  birth: null,
  element: 'none',
  mustInclude: '',
  avoidChars: '',
  englishSurname: '',
  siblingName: '',
  avoidPopular: true,
  easyToWrite: false,
  englishFriendly: true,
  enStyle: 'any',
}

export interface ScoreBreakdown {
  label: string
  value: number
  detail: string
}

export interface NameCandidate {
  id: string
  surname: string
  given: string
  full: string
  chars: {
    char: string
    pinyin: string
    tone: number
    element: Element
    strokes: number
    meaning: string
  }[]
  /** 姓 + 名的完整拼音，带调 */
  pinyin: string
  totalStrokes: number
  elements: Element[]
  score: number
  breakdown: ScoreBreakdown[]
  /** 为什么推荐它，一句话 */
  why: string
  source: { line: string; ref: string } | null
  toneNotes: string[]
  readability: {
    score: number
    issues: { syllable: string; level: 'hard' | 'medium'; heardAs: string; note: string }[]
    clashes: { syllable: string; note: string }[]
  }
  homophones: { level: 'block' | 'warn'; reads: string; note: string }[]
  popularity: 'rare' | 'moderate' | 'common' | 'very-common'
  sameRadical: string | null
}
