/**
 * 四柱（八字）与五行分布。
 *
 * 这里只做确定性的历法换算：干支纪年月日时、地支藏干、五行统计。
 * 不做旺衰断语、不做吉凶判断、不做命运预测 —— 那些不是可验证的东西。
 * 产品里只把它当作「传统参考」，用来给用户一个可选的软排序依据。
 */
import type { Element } from '../data/characters'
import { MONTH_TERMS, ALL_TERMS, equationOfTime, solarTermDate } from './solarTerms'

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

export const STEM_ELEMENT: Record<string, Element> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
}

export const BRANCH_ELEMENT: Record<string, Element> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
}

/** 地支藏干：本气 / 中气 / 余气，权重依次递减。 */
const HIDDEN_STEMS: Record<string, { stem: string; weight: number }[]> = {
  子: [{ stem: '癸', weight: 1 }],
  丑: [{ stem: '己', weight: 1 }, { stem: '癸', weight: 0.5 }, { stem: '辛', weight: 0.3 }],
  寅: [{ stem: '甲', weight: 1 }, { stem: '丙', weight: 0.5 }, { stem: '戊', weight: 0.3 }],
  卯: [{ stem: '乙', weight: 1 }],
  辰: [{ stem: '戊', weight: 1 }, { stem: '乙', weight: 0.5 }, { stem: '癸', weight: 0.3 }],
  巳: [{ stem: '丙', weight: 1 }, { stem: '庚', weight: 0.5 }, { stem: '戊', weight: 0.3 }],
  午: [{ stem: '丁', weight: 1 }, { stem: '己', weight: 0.5 }],
  未: [{ stem: '己', weight: 1 }, { stem: '丁', weight: 0.5 }, { stem: '乙', weight: 0.3 }],
  申: [{ stem: '庚', weight: 1 }, { stem: '壬', weight: 0.5 }, { stem: '戊', weight: 0.3 }],
  酉: [{ stem: '辛', weight: 1 }],
  戌: [{ stem: '戊', weight: 1 }, { stem: '辛', weight: 0.5 }, { stem: '丁', weight: 0.3 }],
  亥: [{ stem: '壬', weight: 1 }, { stem: '甲', weight: 0.5 }],
}

export interface Pillar {
  stem: string
  branch: string
  label: string
}

export interface BaziResult {
  year: Pillar
  month: Pillar
  day: Pillar
  hour: Pillar | null
  /** 五行加权得分，合计约 8 */
  elements: Record<Element, number>
  /** 完全没有出现的五行 */
  missing: Element[]
  /** 占比最低的一到两个五行（不含完全缺失的） */
  weakest: Element[]
  strongest: Element
  /** 出生所在的节气区间 */
  termWindow: { current: string; next: string; nextAt: Date }
  /**
   * 真太阳时减去当地钟表时间，单位分钟。
   * 负数表示真太阳时比钟表慢 —— 奥克兰在东经 174.76，而 UTC+12 的中央经线是 180，
   * 所以奥克兰的真太阳时比钟表晚约 21 分钟。
   */
  trueSolarOffsetMinutes: number
  trueSolarTime: string | null
  /** 距离最近的交节时刻不足 30 分钟时为 true，需要提醒用户核对 */
  nearTermBoundary: boolean
}

const REFERENCE_JIAZI_UTC = Date.UTC(1949, 9, 1) // 1949-10-01 为甲子日

function pillar(stemIdx: number, branchIdx: number): Pillar {
  const stem = STEMS[((stemIdx % 10) + 10) % 10]
  const branch = BRANCHES[((branchIdx % 12) + 12) % 12]
  return { stem, branch, label: stem + branch }
}

/**
 * @param instant  出生的真实时刻（UTC）
 * @param longitude 出生地经度，东经为正。用于真太阳时校正。
 * @param hasTime  用户是否提供了具体时间；没有则不排时柱
 * @param tzOffsetMinutes 出生地当时的时区偏移（分钟，东为正，已含夏令时）
 */
export function computeBazi(
  instant: Date, longitude: number, hasTime: boolean, tzOffsetMinutes = longitude * 4,
): BaziResult {
  // 真太阳时 = 世界时 + 经度时差 + 均时差
  const eot = equationOfTime(instant)
  const utcMinutes =
    instant.getUTCHours() * 60 + instant.getUTCMinutes() + instant.getUTCSeconds() / 60
  const trueSolarMinutes = utcMinutes + longitude * 4 + eot
  // 归一到 0-1440，同时记录跨没跨日
  let tsm = trueSolarMinutes
  let dayShift = 0
  while (tsm < 0) { tsm += 1440; dayShift -= 1 }
  while (tsm >= 1440) { tsm -= 1440; dayShift += 1 }

  // 真太阳时相对当地钟表时间差多少分钟。
  // 经度时差是相对 UTC 的，必须再减掉时区偏移，才是用户能感知的那个差值。
  const trueSolarOffsetMinutes = Math.round(longitude * 4 + eot - tzOffsetMinutes)

  const gYear = instant.getUTCFullYear()

  // ---- 年柱：以立春为界 ----
  const lichunThis = solarTermDate(gYear, 315)
  const lichunPrev = solarTermDate(gYear - 1, 315)
  const solarYear = instant.getTime() >= lichunThis.getTime() ? gYear : gYear - 1
  void lichunPrev
  // 1984 年为甲子年
  const yearOffset = solarYear - 1984
  const year = pillar(yearOffset, yearOffset)

  // ---- 月柱：以十二节为界 ----
  let monthIdx = -1
  let termStart: Date | null = null
  let termEnd: Date | null = null
  const candidates: { i: number; at: Date }[] = []
  for (let i = 0; i < MONTH_TERMS.length; i++) {
    for (const y of [gYear - 1, gYear, gYear + 1]) {
      candidates.push({ i, at: solarTermDate(y, MONTH_TERMS[i].long) })
    }
  }
  candidates.sort((a, b) => a.at.getTime() - b.at.getTime())
  for (let k = 0; k < candidates.length; k++) {
    if (candidates[k].at.getTime() <= instant.getTime()) {
      monthIdx = candidates[k].i
      termStart = candidates[k].at
      termEnd = candidates[k + 1]?.at ?? null
    } else break
  }
  // 月干用五虎遁：甲己之年丙作首
  const branchOrderFromYin = monthIdx // MONTH_TERMS 已按寅月起排
  const yearStemIdx = ((yearOffset % 10) + 10) % 10
  const monthStemIdx = ((yearStemIdx % 5) * 2 + 2 + branchOrderFromYin) % 10
  const monthBranchIdx = BRANCHES.indexOf(MONTH_TERMS[monthIdx].branch as (typeof BRANCHES)[number])
  const month = pillar(monthStemIdx, monthBranchIdx)

  // ---- 日柱：以真太阳时 23:00 为界换日 ----
  const solarDayShift = dayShift + (hasTime && tsm >= 23 * 60 ? 1 : 0)
  const utcMidnight = Date.UTC(
    instant.getUTCFullYear(),
    instant.getUTCMonth(),
    instant.getUTCDate(),
  )
  const dayCount = Math.round((utcMidnight - REFERENCE_JIAZI_UTC) / 86400000) + solarDayShift
  const day = pillar(dayCount, dayCount)

  // ---- 时柱：真太阳时定时辰，五鼠遁定时干 ----
  let hour: Pillar | null = null
  let trueSolarTime: string | null = null
  if (hasTime) {
    const hh = Math.floor(tsm / 60)
    const mm = Math.floor(tsm % 60)
    trueSolarTime = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
    // 23:00-01:00 为子时
    const hourBranchIdx = Math.floor(((tsm + 60) % 1440) / 120)
    const dayStemIdx = ((dayCount % 10) + 10) % 10
    const hourStemIdx = ((dayStemIdx % 5) * 2 + hourBranchIdx) % 10
    hour = pillar(hourStemIdx, hourBranchIdx)
  }

  // ---- 五行统计 ----
  const elements: Record<Element, number> = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 }
  const pillars = [year, month, day, ...(hour ? [hour] : [])]
  for (const p of pillars) {
    elements[STEM_ELEMENT[p.stem]] += 1
    for (const h of HIDDEN_STEMS[p.branch]) {
      elements[STEM_ELEMENT[h.stem]] += h.weight
    }
  }
  const rounded = Object.fromEntries(
    Object.entries(elements).map(([k, v]) => [k, Math.round(v * 10) / 10]),
  ) as Record<Element, number>

  const entries = Object.entries(rounded) as [Element, number][]
  const missing = entries.filter(([, v]) => v === 0).map(([k]) => k)
  const present = entries.filter(([, v]) => v > 0).sort((a, b) => a[1] - b[1])
  const weakest = present.slice(0, present.length > 2 ? 1 : 0).map(([k]) => k)
  const strongest = entries.slice().sort((a, b) => b[1] - a[1])[0][0]

  // ---- 节气区间与临界提醒 ----
  const termIdx = ALL_TERMS.indexOf(MONTH_TERMS[monthIdx].name)
  const currentTermName = MONTH_TERMS[monthIdx].name
  const nextTermName = ALL_TERMS[(termIdx + 1) % 24]
  const gapToStart = termStart ? Math.abs(instant.getTime() - termStart.getTime()) / 60000 : Infinity
  const gapToEnd = termEnd ? Math.abs(termEnd.getTime() - instant.getTime()) / 60000 : Infinity
  const nearTermBoundary = Math.min(gapToStart, gapToEnd) < 30

  return {
    year,
    month,
    day,
    hour,
    elements: rounded,
    missing,
    weakest,
    strongest,
    termWindow: {
      current: currentTermName,
      next: nextTermName,
      nextAt: termEnd ?? new Date(NaN),
    },
    trueSolarOffsetMinutes,
    trueSolarTime,
    nearTermBoundary,
  }
}

/** 传统上「补」某个五行常用的相生关系：生我者也算补。 */
export const GENERATES: Record<Element, Element> = {
  木: '火', 火: '土', 土: '金', 金: '水', 水: '木',
}
