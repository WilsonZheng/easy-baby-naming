import { describe, expect, it } from 'vitest'
import { solarTermDate } from './solarTerms'
import { computeBazi } from './bazi'

/** 把 UTC 时刻格式化成 UTC+8 的本地时间串，方便和公开的节气表对照 */
function inCST(d: Date): string {
  const t = new Date(d.getTime() + 8 * 3600_000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`
}

describe('节气计算', () => {
  // 对照《中国天文年历》公布值，允许 20 分钟误差（低精度太阳位置公式的量级）
  const cases: [string, number, number, string][] = [
    ['2024 立春', 2024, 315, '2024-02-04 16:27'],
    ['2000 立春', 2000, 315, '2000-02-04 20:40'],
    ['2024 春分', 2024, 0, '2024-03-20 11:06'],
    ['2024 夏至', 2024, 90, '2024-06-21 04:51'],
    ['2024 冬至', 2024, 270, '2024-12-21 17:21'],
    ['1990 立秋', 1990, 135, '1990-08-08 02:46'],
    ['2025 立春', 2025, 315, '2025-02-03 22:10'],
    ['2023 立秋', 2023, 135, '2023-08-08 02:22'],
  ]
  for (const [label, year, long, expected] of cases) {
    it(label, () => {
      const got = inCST(solarTermDate(year, long))
      const diff = Math.abs(new Date(got + 'Z').getTime() - new Date(expected + 'Z').getTime()) / 60000
      expect(diff, `${label} 算出 ${got}，年历为 ${expected}`).toBeLessThan(20)
    })
  }
})

describe('干支排盘', () => {
  it('2000-01-01 是戊午日', () => {
    // 北京时间中午，避开换日边界
    const b = computeBazi(new Date('2000-01-01T04:00:00Z'), 116.4, true)
    expect(b.day.label).toBe('戊午')
  })

  it('1949-10-01 是甲子日', () => {
    const b = computeBazi(new Date('1949-10-01T04:00:00Z'), 116.4, true)
    expect(b.day.label).toBe('甲子')
  })

  it('2024 年（立春后）为甲辰年', () => {
    const b = computeBazi(new Date('2024-06-01T04:00:00Z'), 116.4, true)
    expect(b.year.label).toBe('甲辰')
  })

  it('立春之前仍算上一年', () => {
    const before = computeBazi(new Date('2024-01-20T04:00:00Z'), 116.4, true)
    expect(before.year.label).toBe('癸卯')
  })

  it('月柱用节气分界：2024-06-01 在芒种之前，属巳月', () => {
    const b = computeBazi(new Date('2024-06-01T04:00:00Z'), 116.4, true)
    expect(b.month.branch).toBe('巳')
  })

  it('五虎遁：甲年寅月为丙寅', () => {
    // 2024 甲辰年，立春后到惊蛰前为寅月
    const b = computeBazi(new Date('2024-02-20T04:00:00Z'), 116.4, true)
    expect(b.month.label).toBe('丙寅')
  })

  it('五鼠遁：日干为甲时，子时的时干为甲', () => {
    const b = computeBazi(new Date('1949-10-01T04:00:00Z'), 116.4, true)
    expect(b.day.stem).toBe('甲')
    // 同一天的子时（真太阳时 00:xx）
    const z = computeBazi(new Date('1949-09-30T16:10:00Z'), 116.4, true)
    expect(z.hour?.branch).toBe('子')
    expect(z.hour?.stem).toBe('甲')
  })

  it('五行合计接近八字的总权重，且不出现负数', () => {
    const b = computeBazi(new Date('2024-06-01T04:00:00Z'), 116.4, true)
    const total = Object.values(b.elements).reduce((a, c) => a + c, 0)
    expect(total).toBeGreaterThan(5)
    expect(Math.min(...Object.values(b.elements))).toBeGreaterThanOrEqual(0)
  })

  it('没有出生时间时不排时柱', () => {
    const b = computeBazi(new Date('2024-06-01T04:00:00Z'), 116.4, false)
    expect(b.hour).toBeNull()
  })

  it('真太阳时校正：奥克兰的真太阳时比当地钟表晚约 21 分钟', () => {
    // 奥克兰东经 174.76，UTC+12 的中央经线是 180，两者差 5.24 度 ≈ 21 分钟
    const b = computeBazi(new Date('2024-06-01T00:00:00Z'), 174.76, true, 12 * 60)
    expect(b.trueSolarOffsetMinutes).toBeLessThan(-15)
    expect(b.trueSolarOffsetMinutes).toBeGreaterThan(-28)
  })

  it('真太阳时校正：北京用东八区时间，实际比钟表晚约 15 分钟', () => {
    // 北京东经 116.41，UTC+8 的中央经线是 120
    const b = computeBazi(new Date('2024-06-01T04:00:00Z'), 116.41, true, 8 * 60)
    expect(b.trueSolarOffsetMinutes).toBeLessThan(-10)
    expect(b.trueSolarOffsetMinutes).toBeGreaterThan(-22)
  })

  it('真太阳时会真的改变时柱：钟表 23:10 出生在奥克兰，真太阳时还没到子时', () => {
    // 奥克兰 2024-06-15 23:10 NZST = 11:10 UTC；真太阳时约 22:49，仍是亥时
    const clock2310 = computeBazi(new Date('2024-06-15T11:10:00Z'), 174.76, true, 12 * 60)
    expect(clock2310.hour?.branch).toBe('亥')
    // 同一天钟表 23:40，真太阳时约 23:19，已进子时并换日
    const clock2340 = computeBazi(new Date('2024-06-15T11:40:00Z'), 174.76, true, 12 * 60)
    expect(clock2340.hour?.branch).toBe('子')
    expect(clock2340.day.label).not.toBe(clock2310.day.label)
  })
})
