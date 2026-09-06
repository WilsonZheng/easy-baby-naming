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
}

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

    const bridgeHit = en.bridge.find((b) => syllables.some((s) => s === b || s.startsWith(b) || b.startsWith(s)))
    if (bridgeHit) {
      score += 32
      reasons.push(`读音贴近「${bridgeHit}」这个音，中英文叫起来是同一个人`)
    }

    const semHit = en.sem.filter((t) => sem.has(t))
    if (semHit.length) {
      score += Math.min(24, semHit.length * 14)
      reasons.push(`含义和中文名呼应：${en.meaning}`)
    }

    if (style !== 'any' && en.styles.includes(style)) {
      score += 12
      reasons.push('风格符合你选的偏好')
    }

    for (const f of en.flags) {
      const penalty = f === 'spell' ? 9 : f === 'mis' ? 8 : f === 'trend' ? 6 : 3
      score -= penalty
      cautions.push(FLAG_TEXT[f])
    }

    if (!reasons.length) reasons.push(`${en.origin}名，含义是${en.meaning}`)

    return { name: en, score, reasons, cautions }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
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
