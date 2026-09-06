import { useMemo } from 'react'
import { CITY_MAP, tzOffsetMs, zonedTimeToUtc } from '../data/cities'
import { computeBazi, GENERATES, type BaziResult } from './bazi'
import type { Element } from '../data/characters'
import type { Prefs } from '../types'

export interface BaziState {
  bazi: BaziResult | null
  error: string | null
  /** 最终用于排序的五行，null 表示不参考 */
  targetElement: Element | null
}

export function useBazi(prefs: Prefs): BaziState {
  return useMemo(() => {
    if (prefs.element !== 'none' && prefs.element !== 'auto') {
      // 用户手动指定了五行，不需要八字
      return { bazi: null, error: null, targetElement: prefs.element }
    }
    if (prefs.element === 'none') return { bazi: null, error: null, targetElement: null }

    const b = prefs.birth
    if (!b?.date) return { bazi: null, error: '选了「按八字自动」，还需要填出生日期', targetElement: null }
    if (!b.city) return { bazi: null, error: '选了「按八字自动」，还需要选出生城市，才能确定时区和经度', targetElement: null }

    const city = CITY_MAP.get(b.city)
    if (!city) return { bazi: null, error: `没有收录「${b.city}」这个城市`, targetElement: null }

    const [y, m, d] = b.date.split('-').map(Number)
    if (!y || !m || !d) return { bazi: null, error: '出生日期格式不对', targetElement: null }

    const hasTime = !!b.time
    const [hh, mm] = hasTime ? b.time.split(':').map(Number) : [12, 0]

    let instant: Date
    try {
      instant = zonedTimeToUtc(y, m, d, hh, mm, city.tz)
    } catch {
      return { bazi: null, error: '时区换算失败，请换一个城市试试', targetElement: null }
    }
    if (Number.isNaN(instant.getTime())) {
      return { bazi: null, error: '时区换算失败，请换一个城市试试', targetElement: null }
    }
    if (instant.getTime() > Date.now()) {
      return { bazi: null, error: '出生时刻在未来，等宝宝出生后再排八字', targetElement: null }
    }

    const tzOffsetMinutes = tzOffsetMs(instant, city.tz) / 60000
    const bazi = computeBazi(instant, city.lon, hasTime, tzOffsetMinutes)
    // 传统上「补」最弱的那一个；完全缺失的优先
    const target = bazi.missing[0] ?? bazi.weakest[0] ?? GENERATES[bazi.strongest]
    return { bazi, error: null, targetElement: target }
  }, [prefs.element, prefs.birth])
}
