/** 拼音工具：去调、取音节、声调连读判断。 */

const TONE_MAP: Record<string, string> = {
  ā: 'a', á: 'a', ǎ: 'a', à: 'a',
  ē: 'e', é: 'e', ě: 'e', è: 'e',
  ī: 'i', í: 'i', ǐ: 'i', ì: 'i',
  ō: 'o', ó: 'o', ǒ: 'o', ò: 'o',
  ū: 'u', ú: 'u', ǔ: 'u', ù: 'u',
  ǖ: 'ü', ǘ: 'ü', ǚ: 'ü', ǜ: 'ü',
}

/** 'lǚ' -> 'lü'，'zhāng' -> 'zhang' */
export function stripTone(pinyin: string): string {
  return pinyin.split('').map((ch) => TONE_MAP[ch] ?? ch).join('')
}

/** 'lǚ' -> 'lv'，用于做纯 ASCII 比较 */
export function asciiSyllable(pinyin: string): string {
  return stripTone(pinyin).replace(/ü/g, 'v')
}

const INITIALS = [
  'zh', 'ch', 'sh',
  'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h',
  'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w',
]

/** 拆成声母与韵母；零声母返回空字符串。 */
export function splitSyllable(pinyin: string): { initial: string; final: string } {
  const s = stripTone(pinyin)
  for (const i of INITIALS) {
    if (s.startsWith(i)) return { initial: i, final: s.slice(i.length) }
  }
  return { initial: '', final: s }
}

/**
 * 连读顺不顺。真正会拗口的只有两种：
 *  1. 三声连三声（李雨晚 lǐ yǔ wǎn）—— 要变调，念着费劲
 *  2. 三个字同一个声调 —— 平板没有起伏
 * 其余组合都算正常，不该假装成硬规则。
 */
export interface ToneIssue {
  kind: 'triple-third' | 'double-third' | 'flat'
  note: string
}

export function checkTones(tones: number[]): ToneIssue[] {
  const issues: ToneIssue[] = []
  for (let i = 0; i + 1 < tones.length; i++) {
    if (tones[i] === 3 && tones[i + 1] === 3) {
      if (i + 2 < tones.length && tones[i + 2] === 3) {
        issues.push({ kind: 'triple-third', note: '三个字都是三声，连读要连续变调，念起来很费劲' })
        return issues
      }
      issues.push({ kind: 'double-third', note: '相邻两个三声，前一个字口语里会变成二声' })
    }
  }
  if (tones.length >= 3 && new Set(tones).size === 1) {
    issues.push({ kind: 'flat', note: `三个字都是${tones[0]}声，读起来缺少起伏` })
  }
  return issues
}

/** 相邻两字声母韵母都相同（如「陈晨」），读起来会黏。 */
export function checkAlliteration(pinyins: string[]): boolean {
  for (let i = 0; i + 1 < pinyins.length; i++) {
    const a = splitSyllable(pinyins[i])
    const b = splitSyllable(pinyins[i + 1])
    if (a.initial === b.initial && a.final === b.final) return true
  }
  return false
}
