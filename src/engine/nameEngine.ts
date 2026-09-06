/**
 * 中文名生成引擎。
 *
 * 流程是：过滤字池 -> 组合 -> 硬规则剔除 -> 打分 -> 多样化抽样。
 * 「硬规则」永远不会因为候选太少而放宽 —— 谐音事故、避讳字、爆款组合
 * 属于宁可没有也不能推荐的那一类。软条件（风格、五行、笔画）才可以让步。
 */
import { CHARACTERS, CHAR_MAP, type CharEntry, type Element } from '../data/characters'
import { SURNAME_MAP } from '../data/surnames'
import { findSource, findSourceSameClause } from '../data/sources'
import { checkAlliteration, checkTones, stripTone } from './pinyin'
import { assessReadability } from './readability'
import { checkHomophone } from './homophone'
import { sameRadical } from './radicals'
import { semanticsOf } from './semantics'
import { CURATED_NAMES } from '../data/curatedNames'
import type { NameCandidate, Prefs, ScoreBreakdown } from '../types'

/** 已经烂大街到不该再推荐的组合。 */
export const BANNED_COMBOS = new Set([
  '梓轩', '子轩', '梓涵', '子涵', '梓萱', '紫萱', '雨桐', '沐汐', '一诺', '若曦',
  '梓睿', '浩宇', '子墨', '梓晨', '欣怡', '诗涵', '雨欣', '语嫣', '梓馨', '沐辰',
  'astro', '轩宇', '皓轩', '宇轩', '子豪', '沐宸', '梓宁', '思涵', '晨曦', '雨萱',
])

/**
 * 「万能后字」：跟在几乎任何字后面都读得通（清和、松风、志远、书言）。
 * 「万能前字」：放在几乎任何字前面都读得通（清x、明x、若x、知x）。
 * 有它们参与的组合就算通过「两个字要有关联」这一关。
 */
export const SUFFIX_CHARS = new Set([
  '之', '然', '宁', '安', '和', '远', '心',
])
export const PREFIX_CHARS = new Set([
  '清', '明', '知', '若', '如', '亦', '嘉', '慕', '雅', '静', '素', '初', '文',
])

/**
 * 这些字只在人工精选的组合里成立，自由组合会造出别扭甚至凶意的名字。
 * 「落」在「磊落」里是光明，单拎出来配「暮」就成了「落暮」。
 */
const ONLY_CURATED = new Set([
  '落', '暮', '芜', '蕤', '曲', '尔', '珠', '衿', '汉', '照',
  '微', '木', '才', '石', '正', '行', '扬', '越', '岸', '深',
  '珑', '娜', '美', '照', '珊', '婵',
])

/**
 * 两个字合起来讲不讲得通。
 * 光看单字都是好字，凑一起可能毫无关系（「京卷」「柏域」）。
 * 通过条件：意象同类、同出一句典籍、或者有一个是万能前后字。
 */
function hasKinship(a: CharEntry, b: CharEntry): boolean {
  if (SUFFIX_CHARS.has(b.char) || PREFIX_CHARS.has(a.char)) return true
  const semA = semanticsOf(a.char)
  const semB = semanticsOf(b.char)
  if (semA.some((t) => semB.includes(t))) return true
  return !!findSourceSameClause(a.char, b.char)
}

/** 带帝王、霸气、过度张扬色彩的字，单用可以，堆在一起就过了。 */
const GRANDIOSE = new Set(['宸', '御', '晟', '霸', '魁', '尊', '帝', '皇', '爵', '枭'])

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function genderFit(entry: CharEntry, gender: Prefs['gender']): number {
  if (gender === 'boy') return entry.gender >= 0 ? 1 : entry.gender === -1 ? 0.35 : 0
  if (gender === 'girl') return entry.gender <= 0 ? 1 : entry.gender === 1 ? 0.35 : 0
  return Math.abs(entry.gender) <= 1 ? 1 : 0.2
}

/** 生成时可用的字池 */
function buildPool(prefs: Prefs): CharEntry[] {
  const avoid = new Set(prefs.avoidChars.split('').filter((c) => /[一-龥]/.test(c)))
  const surnameChars = new Set(prefs.surname.split(''))
  return CHARACTERS.filter((c) => {
    if (avoid.has(c.char)) return false
    if (surnameChars.has(c.char)) return false
    if (genderFit(c, prefs.gender) === 0) return false
    if (prefs.avoidPopular && c.overuse >= 3) return false
    return true
  })
}

export interface GenerateOptions {
  prefs: Prefs
  /** 想补的五行，来自八字或用户手选 */
  targetElement: Element | null
  seed: number
  count: number
}

interface Scored {
  candidate: NameCandidate
  raw: number
}

export function generateNames(opts: GenerateOptions): NameCandidate[] {
  const { prefs, targetElement, seed, count } = opts
  const rand = mulberry32(seed)
  const pool = buildPool(prefs)
  const surnameEntry = SURNAME_MAP.get(prefs.surname)
  const surnameSyllables = surnameEntry
    ? surnameEntry.pinyin.split(' ').map(stripTone)
    : []
  const surnameTones = surnameEntry ? [surnameEntry.tone] : []

  const mustChar = prefs.mustInclude.trim().charAt(0)
  const mustEntry = mustChar ? CHAR_MAP.get(mustChar) : undefined

  const siblingChars = new Set(
    prefs.siblingName.split('').filter((c) => CHAR_MAP.has(c)),
  )
  const siblingStyles = new Set(
    [...siblingChars].flatMap((c) => CHAR_MAP.get(c)!.styles),
  )
  const siblingElements = new Set([...siblingChars].map((c) => CHAR_MAP.get(c)!.element))

  const results: Scored[] = []
  const seenGiven = new Set<string>()

  const push = (entries: CharEntry[], curated = false) => {
    const given = entries.map((e) => e.char).join('')
    if (seenGiven.has(given)) return
    seenGiven.add(given)

    // 自由组合必须讲得通；精选名是人工挑过的，直接放行
    if (!curated) {
      if (entries.some((e) => ONLY_CURATED.has(e.char))) return
      if (entries.length === 2 && !hasKinship(entries[0], entries[1])) return
    }

    // ---- 硬规则 ----
    if (BANNED_COMBOS.has(given)) return
    if (entries.length === 2 && entries[0].char === entries[1].char) return
    if (entries.filter((e) => GRANDIOSE.has(e.char)).length >= 1 && entries.length === 2) {
      // 帝王字最多出现一次，且不能和另一个张扬字同现
      if (entries.every((e) => GRANDIOSE.has(e.char))) return
    }
    if (prefs.avoidPopular && entries.every((e) => e.overuse >= 2)) return

    const pinyins = entries.map((e) => e.pinyin)
    const tones = entries.map((e) => e.tone)
    const allTones = [...surnameTones, ...tones]
    const toneIssues = checkTones(allTones)
    if (toneIssues.some((i) => i.kind === 'triple-third')) return
    if (checkAlliteration(pinyins)) return

    const syllables = [...surnameSyllables, ...pinyins.map(stripTone)]
    const homophones = checkHomophone(syllables)
    if (homophones.some((h) => h.level === 'block')) return

    // ---- 打分 ----
    const breakdown: ScoreBreakdown[] = []
    let score = 60

    if (curated) {
      score += 24
      breakdown.push({ label: '精选', value: 24, detail: '这是人工挑过的组合，读起来是一个完整的词' })
    }

    const gFit = Math.min(...entries.map((e) => genderFit(e, prefs.gender)))
    score += (gFit - 1) * 18
    if (gFit < 1) breakdown.push({ label: '性别气质', value: -Math.round((1 - gFit) * 18), detail: '有一个字的性别倾向和你选的不完全一致' })

    // 风格一致
    if (prefs.style !== 'any') {
      const hits = entries.filter((e) => e.styles.includes(prefs.style as never)).length
      const delta = hits === entries.length ? 10 : hits > 0 ? 4 : -8
      score += delta
      breakdown.push({
        label: '风格',
        value: delta,
        detail: hits === entries.length ? '两个字都贴合你选的风格' : hits > 0 ? '一个字贴合风格' : '风格不太贴',
      })
    } else if (entries.length === 2) {
      const shared = entries[0].styles.filter((s) => entries[1].styles.includes(s))
      if (shared.length) {
        score += 6
        breakdown.push({ label: '气质统一', value: 6, detail: '两个字的气质在同一路上' })
      }
    }

    // 流行度：越少见越加分
    const overuse = entries.reduce((a, e) => a + e.overuse, 0)
    const overDelta = -overuse * 5
    score += overDelta
    if (overuse > 0) {
      breakdown.push({ label: '撞名风险', value: overDelta, detail: `含 ${overuse} 级高频用字，班上重名概率上升` })
    } else {
      score += 6
      breakdown.push({ label: '撞名风险', value: 6, detail: '两个字都不是当下的高频用字' })
    }

    // 声调
    if (toneIssues.length) {
      score -= toneIssues.length * 6
      breakdown.push({ label: '连读', value: -toneIssues.length * 6, detail: toneIssues[0].note })
    } else {
      score += 5
      breakdown.push({ label: '连读', value: 5, detail: '姓名连读顺口，声调有起伏' })
    }

    // 谐音提醒
    if (homophones.length) {
      score -= homophones.length * 7
      breakdown.push({ label: '谐音', value: -homophones.length * 7, detail: homophones[0].note })
    }

    // 英语可读性
    const readability = assessReadability(pinyins)
    if (prefs.englishFriendly) {
      const delta = Math.round((readability.score - 70) / 4)
      score += delta
      breakdown.push({
        label: '英语好念度',
        value: delta,
        detail: readability.issues.length
          ? `${readability.issues[0].syllable} 会被念成${readability.issues[0].heardAs}`
          : '拼音在英语环境里不容易被念错',
      })
    }

    // 笔画
    const totalStrokes = entries.reduce((a, e) => a + e.strokes, 0)
    if (prefs.easyToWrite) {
      const delta = totalStrokes <= 16 ? 8 : totalStrokes <= 24 ? 0 : -10
      score += delta
      breakdown.push({ label: '学写难度', value: delta, detail: `名字共 ${totalStrokes} 画` })
    }

    // 五行
    if (targetElement) {
      // 用户明确要求补某个五行时，这一项要压得过「精选」加权，
      // 否则列表会被精选名占满，五行偏好形同虚设
      const hits = entries.filter((e) => e.element === targetElement).length
      const delta = hits >= 2 ? 22 : hits === 1 ? 16 : -12
      score += delta
      breakdown.push({
        label: '五行',
        value: delta,
        detail: hits >= 1 ? `含 ${hits} 个${targetElement}属性的字` : `不含${targetElement}属性的字`,
      })
    }

    // 偏旁重复
    const radical = entries.length === 2 ? sameRadical(entries[0].char, entries[1].char) : null
    if (radical) {
      score -= 7
      breakdown.push({ label: '字形', value: -7, detail: `两个字都是「${radical}」旁，写出来偏重复` })
    }

    // 出处
    const source = entries.length === 2 ? findSource(entries[0].char, entries[1].char) : undefined
    if (source) {
      score += 10
      breakdown.push({ label: '典籍出处', value: 10, detail: `出自${source.ref}` })
    }

    // 必含字
    if (mustEntry && !entries.some((e) => e.char === mustEntry.char)) return

    // 兄弟姐妹呼应
    if (siblingChars.size) {
      const styleHit = entries.some((e) => e.styles.some((s) => siblingStyles.has(s)))
      const elementHit = entries.some((e) => siblingElements.has(e.element))
      if (styleHit || elementHit) {
        score += styleHit && elementHit ? 10 : 5
        breakdown.push({
          label: '和哥哥姐姐呼应',
          value: styleHit && elementHit ? 10 : 5,
          detail: styleHit ? '气质和已有的名字在同一路上' : '五行属性与已有的名字相呼应',
        })
      }
      if (entries.some((e) => siblingChars.has(e.char))) return // 不重复用同一个字
    }

    // 标签看的是「有没有一个特别扎眼的高频字」，不是两个普通字相加。
    // 「予宁」两个字各算轻微高频，加起来不该被判成爆款。
    const peakOveruse = Math.max(...entries.map((e) => e.overuse))
    const popularity: NameCandidate['popularity'] =
      peakOveruse >= 3 ? 'very-common' : peakOveruse === 2 ? 'common' : peakOveruse === 1 ? 'moderate' : 'rare'

    const why = buildWhy(entries, source, readability, overuse, targetElement)

    const candidate: NameCandidate = {
      id: prefs.surname + given,
      surname: prefs.surname,
      given,
      full: prefs.surname + given,
      chars: entries.map((e) => ({
        char: e.char,
        pinyin: e.pinyin,
        tone: e.tone,
        element: e.element,
        strokes: e.strokes,
        meaning: e.meaning,
      })),
      pinyin: [surnameEntry?.pinyin ?? '', ...pinyins].filter(Boolean).join(' '),
      totalStrokes,
      elements: entries.map((e) => e.element),
      score: Math.max(0, Math.min(100, Math.round(score))),
      breakdown,
      why,
      source: source ? { line: source.line, ref: source.ref } : null,
      toneNotes: toneIssues.map((i) => i.note),
      readability,
      homophones,
      popularity,
      sameRadical: radical,
    }
    results.push({ candidate, raw: score })
  }

  if (prefs.length === 1) {
    for (const e of pool) push([e])
  } else if (mustEntry) {
    // 必含字：只需要枚举另一个字的两种位置
    for (const e of pool) {
      if (e.char === mustEntry.char) continue
      push([mustEntry, e])
      push([e, mustEntry])
    }
  } else {
    // 先放人工精选的组合，它们决定了列表顶部的质量
    const poolChars = new Set(pool.map((c) => c.char))
    const wantGender = prefs.gender === 'boy' ? 'm' : prefs.gender === 'girl' ? 'f' : 'n'
    for (const cn of CURATED_NAMES) {
      if (cn.gender !== wantGender && cn.gender !== 'n' && wantGender !== 'n') continue
      if (wantGender === 'n' && cn.gender !== 'n') continue
      const entries = cn.given.split('').map((c) => CHAR_MAP.get(c))
      if (entries.some((e) => !e)) continue
      if (!entries.every((e) => poolChars.has(e!.char))) continue
      push(entries as CharEntry[], true)
    }

    // 再用自由组合补足，保证「换一批」每次都不一样
    const shuffled = pool.slice()
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const cap = Math.min(shuffled.length, 150)
    for (let i = 0; i < cap; i++) {
      for (let j = 0; j < cap; j++) {
        if (i === j) continue
        push([shuffled[i], shuffled[j]])
        if (results.length > 4000) break
      }
      if (results.length > 4000) break
    }
  }

  results.sort((a, b) => b.raw - a.raw)

  // 「换一批」要真的换一批：在质量相当的前段里按 seed 重新洗牌，
  // 而不是每次都返回分数最高的那几个。
  const shortlist = results.slice(0, Math.max(count * 8, 96))
  for (let i = shortlist.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[shortlist[i], shortlist[j]] = [shortlist[j], shortlist[i]]
  }

  // 多样化：同一个首字最多出现两次，避免整屏都是「清x」
  const firstCharCount = new Map<string, number>()
  const picked: NameCandidate[] = []
  for (const r of shortlist) {
    const first = r.candidate.given[0]
    const n = firstCharCount.get(first) ?? 0
    if (n >= 2) continue
    firstCharCount.set(first, n + 1)
    picked.push(r.candidate)
    if (picked.length >= count) break
  }
  return picked
}

function buildWhy(
  entries: CharEntry[],
  source: { ref: string } | undefined,
  readability: { score: number },
  overuse: number,
  targetElement: Element | null,
): string {
  const parts: string[] = []
  parts.push(entries.map((e) => `${e.char}是${e.meaning}`).join('，'))
  if (source) parts.push(`两个字同出于${source.ref}`)
  if (overuse === 0) parts.push('都不是当下的高频用字，班里撞名的概率低')
  if (readability.score >= 80) parts.push('拼音在英语环境里也好念')
  if (targetElement) {
    const hits = entries.filter((e) => e.element === targetElement)
    if (hits.length) parts.push(`${hits.map((h) => h.char).join('、')}属${targetElement}`)
  }
  return parts.join('；') + '。'
}
