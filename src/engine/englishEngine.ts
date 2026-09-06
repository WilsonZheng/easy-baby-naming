/**
 * 英文名筛选与配对。
 *
 * 刻意不强求中英文名读音一致 —— 硬凑出来的往往两边都不自然。
 * 配对给的是三种可解释的理由：读音相近、含义呼应、气质一致。
 */
import { ENGLISH_NAMES, type EnglishName, type EnStyle } from '../data/englishNames'
import { stripTone } from './pinyin'
import { semanticsOf } from './semantics'
import type { Gender, NameCandidate } from '../types'

export interface PairedEnglishName {
  name: EnglishName
  score: number
  reasons: string[]
  cautions: string[]
  /**
   * 是不是真的配上了（读音贴近或含义呼应），而不是兜底给的一个通用选项。
   * 没配上就不该摆在中文名旁边 —— 那等于暗示了一个并不存在的关联。
   */
  matched: boolean
}

/**
 * 读音是否贴得上。
 *
 * 不能用「其中一个是另一个的前缀」来判断：那样「箫 xiao」会被算成贴近
 * Sydney 的「xi」，可这两个音一点都不像。只认完全相同，外加把 n/ng 尾
 * 视为同一档（很多方言本来就不分，lin 和 ling 配 Lena 都成立）。
 */
function sameSound(a: string, b: string): boolean {
  if (a === b) return true
  const norm = (x: string) => x.replace(/ng$/, 'n')
  return norm(a) === norm(b)
}

/**
 * 只有抽象意象重合才算「含义呼应」。
 * 「南山」和 Wren（鹪鹩）都沾一点「自然」，但说它们含义呼应是牵强的。
 */
const ABSTRACT_SEM = new Set([
  'light', 'wise', 'strong', 'grace', 'peace', 'joy', 'pure', 'noble',
  'true', 'hope', 'honor', 'life', 'new', 'youth', 'gift', 'whole',
  'love', 'beauty', 'music', 'star', 'dawn',
])

const FLAG_TEXT: Record<string, string> = {
  spell: '拼写偏长，低年级同学容易写错',
  mis: '英语母语者也常读错，需要经常纠正',
  nick: '很容易被简称成昵称，要接受这一点',
  trend: '目前非常流行，班上可能不止一个',
}

function genderOk(en: EnglishName, gender: Gender): boolean {
  if (gender === 'neutral') return en.gender === 'n'
  if (gender === 'boy') return en.gender === 'm' || en.gender === 'n'
  return en.gender === 'f' || en.gender === 'n'
}

/**
 * 为一个中文名挑英文名。
 * @param given 中文名（不含姓）
 * @param pinyins 中文名各字的带调拼音
 */
export function pairEnglishNames(
  given: string,
  pinyins: string[],
  gender: Gender,
  style: EnStyle | 'any',
  limit = 6,
): PairedEnglishName[] {
  const syllables = pinyins.map(stripTone)
  const sem = new Set(semanticsOf(given))

  const scored = ENGLISH_NAMES.filter((en) => genderOk(en, gender)).map((en) => {
    let score = 50
    const reasons: string[] = []
    const cautions: string[] = []

    const bridgeHit = en.bridge.find((b) => syllables.some((s) => sameSound(s, b)))
    if (bridgeHit) {
      score += 32
      reasons.push(`读音贴近「${bridgeHit}」，中英文叫起来是同一个人`)
    }

    const semHit = en.sem.filter((t) => sem.has(t) && ABSTRACT_SEM.has(t))
    if (semHit.length) {
      score += Math.min(24, semHit.length * 14)
      reasons.push(`含义和中文名呼应：${en.meaning}`)
    }

    // 弱关联也记一笔，用来在没有强配对时挑一个不至于毫无道理的
    const looseHit = en.sem.some((t) => sem.has(t))
    if (looseHit && !semHit.length) score += 6

    if (style !== 'any' && en.styles.includes(style)) {
      score += 12
      reasons.push('风格符合你选的偏好')
    }

    for (const f of en.flags) {
      const penalty = f === 'spell' ? 9 : f === 'mis' ? 8 : f === 'trend' ? 6 : 3
      score -= penalty
      cautions.push(FLAG_TEXT[f])
    }

    const matched = !!bridgeHit || semHit.length > 0
    // 没配上就如实说是各自独立的选择，不硬编一个关联出来
    if (!reasons.length) reasons.push(`${en.origin}名，含义是${en.meaning}；和中文名各自成立`)

    return { name: en, score, reasons, cautions, matched }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}

/**
 * 反过来配：给定一个英文名，从已经生成好的中文候选里挑最搭的几个。
 * 用的是同一套理由（读音相近、含义呼应），只是方向反过来。
 */
export function pairChineseForEnglish(
  en: EnglishName,
  candidates: NameCandidate[],
  limit = 3,
): { candidate: NameCandidate; reasons: string[] }[] {
  const scored = candidates.map((c) => {
    let score = 0
    const reasons: string[] = []
    const syllables = c.chars.map((ch) => stripTone(ch.pinyin))

    const bridgeHit = en.bridge.find((b) => syllables.some((s) => sameSound(s, b)))
    if (bridgeHit) {
      score += 32
      reasons.push('读音贴得上')
    }

    const sem = new Set(semanticsOf(c.given))
    const semHit = en.sem.filter((t) => sem.has(t) && ABSTRACT_SEM.has(t))
    if (semHit.length) {
      score += Math.min(24, semHit.length * 14)
      reasons.push(`含义都指向${en.meaning}`)
    }

    // 同样的分数下，本来就好的中文名优先
    score += c.score / 10
    if (!reasons.length) reasons.push('气质相称')
    return { candidate: c, score, reasons }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(({ candidate, reasons }) => ({ candidate, reasons }))
}

/** 单独浏览英文名时用的筛选。 */
export function filterEnglishNames(
  gender: Gender,
  style: EnStyle | 'any',
  query: string,
): EnglishName[] {
  const q = query.trim().toLowerCase()
  return ENGLISH_NAMES.filter((en) => {
    if (!genderOk(en, gender)) return false
    if (style !== 'any' && !en.styles.includes(style)) return false
    if (q && !en.name.toLowerCase().includes(q) && !en.meaning.includes(q) && !en.zhPron.includes(q)) return false
    return true
  })
}

/** 明显不适合当缩写的字母组合。 */
const BAD_INITIALS = new Set([
  'ASS', 'FAT', 'PIG', 'DIE', 'BAD', 'SAD', 'MAD', 'WAR', 'GAS', 'HAG', 'ILL',
  'RAT', 'BUM', 'POO', 'WEE', 'ZIT', 'SOB', 'DUD', 'GAG', 'NAG', 'FAD', 'PEE',
  'PUS', 'BUG', 'HOG', 'KKK', 'STD', 'DUI', 'WTF', 'BJ', 'BS', 'OD', 'TB', 'VD',
])

export interface FullNameCheck {
  initials: string
  notes: { level: 'warn' | 'info'; text: string }[]
}

/**
 * 英文全名检查：首字母缩写、头韵、音节节奏。
 * @param first 英文名
 * @param middle 中文名转写作为中间名（可空）
 * @param last 英文姓氏拼写
 */
export function checkFullEnglishName(first: string, middle: string, last: string): FullNameCheck {
  const notes: FullNameCheck['notes'] = []
  const parts = [first, middle, last].filter(Boolean)
  const initials = parts.map((p) => p.charAt(0).toUpperCase()).join('')

  if (BAD_INITIALS.has(initials)) {
    notes.push({ level: 'warn', text: `首字母缩写是 ${initials}，在英语里是个不友好的词，孩子会被拿来开玩笑` })
  }

  if (last && first && first.charAt(0).toUpperCase() === last.charAt(0).toUpperCase()) {
    notes.push({ level: 'info', text: `${first} ${last} 是头韵，念起来有节奏感，但会稍微卡通一点` })
  }

  const syl = (s: string) => Math.max(1, (s.toLowerCase().match(/[aeiouy]+/g) ?? []).length)
  if (last && syl(first) === 1 && syl(last) === 1) {
    notes.push({ level: 'info', text: `${first} ${last} 都是单音节，念起来偏短促，可以考虑双音节的名字` })
  }

  if (last && first && first.slice(-2).toLowerCase() === last.slice(0, 2).toLowerCase()) {
    notes.push({ level: 'info', text: `${first} 的结尾和 ${last} 的开头重复，连读会黏在一起` })
  }

  return { initials, notes }
}

/** 中文名的拼音转写，作为英文护照/中间名的写法。 */
export function toRomanized(candidate: NameCandidate): string {
  return candidate.chars
    .map((c) => stripTone(c.pinyin))
    .join('')
    .replace(/^./, (m) => m.toUpperCase())
}
