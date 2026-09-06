import { citiesByRegion } from '../data/cities'
import type { BirthInfo } from '../types'

/**
 * 出生信息输入。
 *
 * 全部用原生 select，不用 <input type="date"> 和 <input type="time">。
 * 那两个控件在手机上每点一个分段就弹一次原生选择器，来回弹很烦；
 * 而且各家浏览器行为不一致。拆成年月日时分五个下拉，每个都是一次点击、
 * 一个普通列表，行为完全可预期。
 */
interface Props {
  value: BirthInfo
  onChange: (patch: Partial<BirthInfo>) => void
  /** 出生日期晚于今天 */
  futureDate: boolean
}

const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 80 }, (_, i) => THIS_YEAR - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

/** 每个时辰跨两小时，标出来让用户对得上老一辈的说法 */
const SHICHEN = ['子', '丑', '丑', '寅', '寅', '卯', '卯', '辰', '辰', '巳', '巳', '午',
                 '午', '未', '未', '申', '申', '酉', '酉', '戌', '戌', '亥', '亥', '子']

function daysIn(year: number, month: number): number {
  if (!year || !month) return 31
  return new Date(year, month, 0).getDate()
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function BirthFields({ value, onChange, futureDate }: Props) {
  const [y, m, d] = value.date ? value.date.split('-').map(Number) : [0, 0, 0]
  const [hh, mm] = value.time ? value.time.split(':').map(Number) : [-1, -1]
  const groups = citiesByRegion()

  const setDate = (patch: { y?: number; m?: number; d?: number }) => {
    const ny = patch.y ?? y
    const nm = patch.m ?? m
    let nd = patch.d ?? d
    // 从 1 月 31 日切到 2 月时，把日期收回该月最后一天，而不是留一个不存在的日子
    const max = daysIn(ny, nm)
    if (nd > max) nd = max
    onChange({ date: ny && nm && nd ? `${ny}-${pad(nm)}-${pad(nd)}` : '' })
  }

  return (
    <>
      <div className="field">
        <label id="birth-date-label">出生日期</label>
        <div className="select-row" role="group" aria-labelledby="birth-date-label">
          <select className="select" value={y || ''} aria-label="年"
            onChange={(e) => setDate({ y: Number(e.target.value) })}>
            <option value="">年</option>
            {YEARS.map((n) => <option key={n} value={n}>{n} 年</option>)}
          </select>
          <select className="select" value={m || ''} aria-label="月"
            onChange={(e) => setDate({ m: Number(e.target.value) })}>
            <option value="">月</option>
            {MONTHS.map((n) => <option key={n} value={n}>{n} 月</option>)}
          </select>
          <select className="select" value={d || ''} aria-label="日"
            onChange={(e) => setDate({ d: Number(e.target.value) })}>
            <option value="">日</option>
            {Array.from({ length: daysIn(y, m) }, (_, i) => i + 1)
              .map((n) => <option key={n} value={n}>{n} 日</option>)}
          </select>
        </div>
        {futureDate && <div className="err">日期在未来，八字要等宝宝出生后才能排</div>}
      </div>

      <div className="field">
        <label id="birth-time-label">出生时间</label>
        <div className="select-row" role="group" aria-labelledby="birth-time-label">
          <select className="select" value={hh >= 0 ? hh : ''} aria-label="小时"
            onChange={(e) => {
              const v = e.target.value
              onChange({ time: v === '' ? '' : `${pad(Number(v))}:${pad(mm >= 0 ? mm : 0)}` })
            }}>
            <option value="">不知道</option>
            {HOURS.map((n) => (
              <option key={n} value={n}>{pad(n)} 点（{SHICHEN[n]}时）</option>
            ))}
          </select>
          <select className="select" value={mm >= 0 ? mm : ''} aria-label="分钟"
            disabled={hh < 0}
            onChange={(e) => onChange({ time: `${pad(hh)}:${pad(Number(e.target.value))}` })}>
            {MINUTES.map((n) => <option key={n} value={n}>{pad(n)} 分</option>)}
          </select>
        </div>
        <div className="hint">
          不知道具体时辰就选「不知道」，只是不排时柱，其余照常。
          分钟精确到 5 分钟就够 —— 真太阳时校正的量级比这个大。
        </div>
      </div>

      <div className="field">
        <label htmlFor="f-city">出生城市</label>
        <select
          id="f-city"
          className="select"
          value={value.city}
          onChange={(e) => onChange({ city: e.target.value })}
        >
          <option value="">请选择</option>
          {groups.map((g) => (
            <optgroup key={g.region} label={g.region}>
              {g.cities.map((c) => (
                <option key={c.zh} value={c.zh}>{c.zh} · {c.en}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="hint">
          城市决定时区和经度。真太阳时校正会真的影响时柱 ——
          比如奥克兰的真太阳时比当地钟表晚约 21 分钟。
        </div>
      </div>
    </>
  )
}
