/**
 * 节气计算。
 *
 * 节气的定义是太阳视黄经每走满 15° 的那一刻，是天文量，不是查表来的民俗。
 * 这里用 Meeus《Astronomical Algorithms》的低精度太阳位置公式，
 * 视黄经误差约 0.01°，换算成时间约 15 分钟 —— 对定「月柱」完全够用，
 * 只有出生时刻正好压在交节前后十几分钟内才需要提醒用户去查权威万年历。
 */

const RAD = Math.PI / 180

function mod360(x: number): number {
  return ((x % 360) + 360) % 360
}

/** 取绝对值最小的等价角，用于牛顿迭代求根 */
function signedDelta(x: number): number {
  const m = mod360(x)
  return m > 180 ? m - 360 : m
}

/** UTC 时刻 -> 儒略日 */
export function dateToJD(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5
}

/** 儒略日 -> UTC 时刻 */
export function jdToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000)
}

/**
 * 力学时与世界时之差 ΔT（秒）。分段多项式，取自 Espenak & Meeus。
 * 我们只需要 1900-2100 这一段。
 */
export function deltaTSeconds(year: number): number {
  if (year >= 2005 && year < 2050) {
    const t = year - 2000
    return 62.92 + 0.32217 * t + 0.005589 * t * t
  }
  if (year >= 1986 && year < 2005) {
    const t = year - 2000
    return 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5
  }
  if (year >= 1961 && year < 1986) {
    const t = year - 1975
    return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718
  }
  if (year >= 1941 && year < 1961) {
    const t = year - 1950
    return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547
  }
  if (year >= 2050) {
    return -20 + 32 * ((year - 1820) / 100) ** 2 - 0.5628 * (2150 - year)
  }
  const u = (year - 1900) / 100
  return -2.79 + 149.4119 * u - 598.939 * u ** 2 + 6196.6 * u ** 3 - 19700 * u ** 4
}

/** 太阳视黄经（度）。入参为力学时儒略日。 */
export function apparentSolarLongitude(jdTT: number): number {
  const T = (jdTT - 2451545.0) / 36525
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T
  const Mr = M * RAD
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr)
  const trueLong = L0 + C
  const omega = (125.04 - 1934.136 * T) * RAD
  return mod360(trueLong - 0.00569 - 0.00478 * Math.sin(omega))
}

/**
 * 求某年内太阳视黄经达到 targetLong 的世界时刻。
 * @param year 用于选定搜索起点的公历年
 */
export function solarTermDate(year: number, targetLong: number): Date {
  const dt = deltaTSeconds(year) / 86400
  // 元旦时太阳黄经约 280°，据此给出天数初值
  const jan1 = dateToJD(new Date(Date.UTC(year, 0, 1)))
  let jd = jan1 + mod360(targetLong - 280) / 0.98565
  for (let i = 0; i < 10; i++) {
    const cur = apparentSolarLongitude(jd + dt)
    const diff = signedDelta(targetLong - cur)
    jd += diff / 0.98565
    if (Math.abs(diff) < 1e-7) break
  }
  return jdToDate(jd)
}

/** 十二「节」——定月柱用的是节，不是中气。 */
export const MONTH_TERMS = [
  { name: '立春', long: 315, branch: '寅' },
  { name: '惊蛰', long: 345, branch: '卯' },
  { name: '清明', long: 15, branch: '辰' },
  { name: '立夏', long: 45, branch: '巳' },
  { name: '芒种', long: 75, branch: '午' },
  { name: '小暑', long: 105, branch: '未' },
  { name: '立秋', long: 135, branch: '申' },
  { name: '白露', long: 165, branch: '酉' },
  { name: '寒露', long: 195, branch: '戌' },
  { name: '立冬', long: 225, branch: '亥' },
  { name: '大雪', long: 255, branch: '子' },
  { name: '小寒', long: 285, branch: '丑' },
] as const

/** 二十四节气全表，用于展示「出生在哪个节气区间」。 */
export const ALL_TERMS = [
  '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
  '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒',
] as const

/** 均时差（分钟）：真太阳时减平太阳时。误差约 30 秒。 */
export function equationOfTime(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1)
  const dayOfYear = Math.floor((date.getTime() - start) / 86400000) + 1
  const b = (2 * Math.PI * (dayOfYear - 81)) / 364
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)
}
