/**
 * 英语可读性评估。
 *
 * 海外长大的孩子每天要被老师、同学、教练念名字。汉语拼音里有一批声母韵母
 * 在英语里根本不存在，英语母语者会稳定地读错。这个模块把「会被读成什么」
 * 具体写出来，而不是给一个玄乎的分数。
 */
import { splitSyllable, stripTone } from './pinyin'

export type ReadIssueLevel = 'hard' | 'medium'

export interface ReadIssue {
  syllable: string
  level: ReadIssueLevel
  /** 英语母语者最常见的读法 */
  heardAs: string
  note: string
}

/** 声母：英语里没有对应音，母语者会替换成最近的音。 */
const INITIAL_TRAPS: Record<string, { level: ReadIssueLevel; heardAs: string; note: string }> = {
  x: { level: 'hard', heardAs: '「克斯」或「兹」', note: 'x 在英语里读 /ks/ 或 /z/，几乎没人会读成 ㄒ' },
  q: { level: 'hard', heardAs: '「垮」音（kw）', note: 'q 在英语里几乎总是跟 u 连读成 /kw/' },
  c: { level: 'hard', heardAs: '「克」或「斯」', note: 'c 在英语里读 /k/ 或 /s/，读不出 ㄘ' },
  zh: { level: 'medium', heardAs: '「兹」', note: 'zh 会被简化成 /z/，卷舌丢失' },
  z: { level: 'medium', heardAs: '「兹」', note: 'z 读 /z/，不是 ㄗ' },
  r: { level: 'medium', heardAs: '英语的 r', note: '英语 r 与普通话的 r 舌位不同，听感偏软' },
  ch: { level: 'medium', heardAs: '「差」', note: '大致读得出来，卷舌会丢' },
  sh: { level: 'medium', heardAs: '「西」', note: '大致读得出来，卷舌会丢' },
}

/** 韵母：英语拼读规则会把它们读成完全不同的音。 */
const FINAL_TRAPS: Record<string, { level: ReadIssueLevel; heardAs: string; note: string }> = {
  ü: { level: 'hard', heardAs: '「乌」', note: 'ü 这个圆唇前元音英语里没有，只能读成 /u/' },
  üe: { level: 'hard', heardAs: '「乌埃」', note: '英语里没有对应音，多半读不出来' },
  üan: { level: 'hard', heardAs: '「乌安」', note: '英语里没有对应音' },
  ün: { level: 'hard', heardAs: '「乌恩」', note: '英语里没有对应音' },
  e: { level: 'medium', heardAs: '英语短音 /e/', note: '拼音的 e 是 /ɤ/，英语母语者会读成「诶」' },
  ian: { level: 'medium', heardAs: '「艾恩」', note: '英语拼读会把 ian 读成 /aɪ.ən/' },
  ie: { level: 'medium', heardAs: '「艾」', note: '英语里 ie 常读成 /aɪ/，如 pie、tie' },
  ui: { level: 'medium', heardAs: '「乌伊」', note: '会被拆成两个音节' },
  iu: { level: 'medium', heardAs: '「艾优」', note: '会被拆开读' },
  uo: { level: 'medium', heardAs: '「乌欧」', note: '会被拆成两个音节' },
  ou: { level: 'medium', heardAs: '「欧」或「乌」', note: 'ou 在英语里有 /aʊ/、/uː/、/ʌ/ 多种读法，很不稳定' },
  uai: { level: 'medium', heardAs: '「歪」', note: '多音节滑音，容易读乱' },
  ao: { level: 'medium', heardAs: '「诶欧」', note: '英语里 ao 少见，容易被拆开读' },
}

/** 卷舌韵：zhi chi shi ri zi ci si 的 i 是特殊的舌尖元音。 */
const BUZZED = new Set(['zhi', 'chi', 'shi', 'ri', 'zi', 'ci', 'si'])

/** 整个音节撞上英语单词或俚语。 */
const SYLLABLE_CLASH: Record<string, string> = {
  dong: '在英语俚语里指男性生殖器',
  wang: '在英语俚语里指男性生殖器',
  pu: '听起来像 poo（大便）',
  fu: '听起来像英语脏话 F-word 的开头',
  shi: '读快了接近英语脏话 shit',
  rong: '听起来像 wrong（错的）',
  gang: '听起来像 gang（帮派）',
  fang: '听起来像 fang（毒牙）',
  hui: '听起来像 hooey（胡扯）',
  bang: '听起来像 bang（枪响、撞击）',
  zhu: '常被读成 Jew，带族群指涉',
  cao: '拼写在中文里对应粗口，海外华人圈会有联想',
  gou: '被读成 goo（黏糊糊的东西）',
  ku: '被读成 coo 或联想 Ku Klux Klan 缩写',
  die: '拼写就是英语的 die（死）',
  gay: '拼写就是英语的 gay',
  yin: '听起来像 yin（阴），常被拿来配 yang 开玩笑',
  bin: '听起来像 bin（垃圾桶）',
  cui: '容易被读成 cui/kwee，也接近粗口拼写',
  nu: '听起来像 new 或 nude 的开头',
  sha: '接近 shah，也容易联想到 shut up 的开头',
  peng: '容易被读成 penguin 的开头，孩子间会拿来起外号',
}

export interface ReadabilityResult {
  /** 0-100，越高越好念 */
  score: number
  issues: ReadIssue[]
  clashes: { syllable: string; note: string }[]
}

/**
 * 评估一组拼音音节（通常是名字的两个字，不含姓）在英语环境里的可读性。
 */
export function assessReadability(pinyins: string[]): ReadabilityResult {
  const issues: ReadIssue[] = []
  const clashes: { syllable: string; note: string }[] = []
  let penalty = 0

  for (const py of pinyins) {
    const plain = stripTone(py)
    const { initial, final } = splitSyllable(py)

    const it = INITIAL_TRAPS[initial]
    if (it) {
      issues.push({ syllable: plain, level: it.level, heardAs: it.heardAs, note: it.note })
      penalty += it.level === 'hard' ? 22 : 9
    }

    if (BUZZED.has(plain)) {
      issues.push({
        syllable: plain,
        level: 'hard',
        heardAs: '「艾」结尾的长音',
        note: `${plain} 里的 i 是舌尖元音，英语母语者会按拼读规则念成 /aɪ/`,
      })
      penalty += 18
    } else {
      const ft = FINAL_TRAPS[final]
      if (ft) {
        issues.push({ syllable: plain, level: ft.level, heardAs: ft.heardAs, note: ft.note })
        penalty += ft.level === 'hard' ? 22 : 8
      }
    }

    const clash = SYLLABLE_CLASH[plain]
    if (clash) {
      clashes.push({ syllable: plain, note: clash })
      penalty += 26
    }
  }

  return { score: Math.max(0, Math.min(100, 100 - penalty)), issues, clashes }
}

/** 给用户看的一句话结论。 */
export function readabilityLabel(score: number): { text: string; tone: 'good' | 'ok' | 'warn' } {
  if (score >= 80) return { text: '英语环境里好念', tone: 'good' }
  if (score >= 55) return { text: '英语里会被念偏，但能接受', tone: 'ok' }
  return { text: '英语母语者大概率会念错', tone: 'warn' }
}
