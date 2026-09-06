import { useMemo, useState } from 'react'
import { Sheet } from './Sheet'
import { ChipGroup, Switch } from './ui'
import { BaziPanel } from './BaziPanel'
import { CITIES, searchCities } from '../data/cities'
import { CHAR_MAP } from '../data/characters'
import type { BaziResult } from '../engine/bazi'
import type { Element } from '../data/characters'
import type { Prefs } from '../types'

interface Props {
  open: boolean
  prefs: Prefs
  bazi: BaziResult | null
  baziError: string | null
  onChange: (patch: Partial<Prefs>) => void
  onClose: () => void
}

const STYLE_OPTS = [
  { value: 'any' as const, label: '不挑' },
  { value: 'shu' as const, label: '书卷文雅' },
  { value: 'nat' as const, label: '自然大气' },
  { value: 'jian' as const, label: '简约温柔' },
  { value: 'qing' as const, label: '清朗现代' },
]

const EN_STYLE_OPTS = [
  { value: 'any' as const, label: '不挑' },
  { value: 'classic' as const, label: '经典' },
  { value: 'nature' as const, label: '自然' },
  { value: 'short' as const, label: '简洁' },
  { value: 'modern' as const, label: '现代' },
]

const ELEMENT_OPTS = [
  { value: 'none' as const, label: '不参考' },
  { value: 'auto' as const, label: '按八字自动' },
  { value: '金' as const, label: '补金' },
  { value: '木' as const, label: '补木' },
  { value: '水' as const, label: '补水' },
  { value: '火' as const, label: '补火' },
  { value: '土' as const, label: '补土' },
]

export function FiltersSheet({ open, prefs, bazi, baziError, onChange, onClose }: Props) {
  const [cityQuery, setCityQuery] = useState('')
  const cityHits = useMemo(() => searchCities(cityQuery), [cityQuery])

  const birth = prefs.birth ?? { date: '', time: '', city: '' }
  const setBirth = (patch: Partial<typeof birth>) => {
    const next = { ...birth, ...patch }
    onChange({ birth: next.date ? next : null })
  }

  const mustChar = prefs.mustInclude.trim().charAt(0)
  const mustValid = !mustChar || CHAR_MAP.has(mustChar)
  const conflict = mustChar && prefs.avoidChars.includes(mustChar)

  const today = new Date().toISOString().slice(0, 10)
  const futureDate = birth.date && birth.date > today

  return (
    <Sheet
      open={open}
      title="更多条件"
      onClose={onClose}
      footer={<button className="btn primary block" onClick={onClose}>用这些条件看名字</button>}
    >
      <div className="field">
        <label>名字气质</label>
        <ChipGroup value={prefs.style} options={STYLE_OPTS} onChange={(v) => onChange({ style: v })} />
      </div>

      <div className="field">
        <label>名字用几个字</label>
        <ChipGroup
          value={String(prefs.length) as '1' | '2'}
          options={[{ value: '2', label: '双字名' }, { value: '1', label: '单字名' }]}
          onChange={(v) => onChange({ length: Number(v) as 1 | 2 })}
        />
      </div>

      <div style={{ margin: '18px 0 6px' }}>
        <Switch
          label="避开当下的爆款字"
          desc="梓、涵、萱、沐、诺这类高频字会被排除，降低班里重名的概率"
          checked={prefs.avoidPopular}
          onChange={(v) => onChange({ avoidPopular: v })}
        />
        <Switch
          label="优先英语里好念的拼音"
          desc="把 x、q、ü、zh 这些英语母语者会读错的音降权"
          checked={prefs.englishFriendly}
          onChange={(v) => onChange({ englishFriendly: v })}
        />
        <Switch
          label="优先笔画少、好学写"
          desc="海外的孩子中文书写练习时间有限，笔画少一点更容易坚持"
          checked={prefs.easyToWrite}
          onChange={(v) => onChange({ easyToWrite: v })}
        />
      </div>

      <h3 style={{ margin: '22px 0 10px', fontSize: 14 }}>家里的讲究</h3>

      <div className="field">
        <label htmlFor="f-must">必须含这个字（辈分字等）</label>
        <input
          id="f-must"
          className="input"
          value={prefs.mustInclude}
          maxLength={1}
          placeholder="留空表示没有"
          aria-invalid={!mustValid || !!conflict}
          onChange={(e) => onChange({ mustInclude: e.target.value })}
        />
        {!mustValid && <div className="err">「{mustChar}」不在本站的取名用字库里，换一个字试试</div>}
        {conflict && <div className="err">「{mustChar}」同时出现在必含字和避讳字里，请先解决冲突</div>}
      </div>

      <div className="field">
        <label htmlFor="f-avoid">家族避讳的字</label>
        <input
          id="f-avoid"
          className="input"
          value={prefs.avoidChars}
          placeholder="比如长辈名字里的字，可以连着写"
          onChange={(e) => onChange({ avoidChars: e.target.value })}
        />
        <div className="hint">这里写的字一个都不会出现，不会因为候选变少而放宽。</div>
      </div>

      <div className="field">
        <label htmlFor="f-sib">已有孩子的名字</label>
        <input
          id="f-sib"
          className="input"
          value={prefs.siblingName}
          placeholder="填了之后新名字会尽量和哥哥姐姐呼应"
          onChange={(e) => onChange({ siblingName: e.target.value })}
        />
      </div>

      <h3 style={{ margin: '22px 0 10px', fontSize: 14 }}>英文名</h3>

      <div className="field">
        <label>英文名风格</label>
        <ChipGroup value={prefs.enStyle} options={EN_STYLE_OPTS} onChange={(v) => onChange({ enStyle: v })} />
      </div>

      <div className="field">
        <label htmlFor="f-ensur">英文姓氏拼写</label>
        <input
          id="f-ensur"
          className="input"
          value={prefs.englishSurname}
          placeholder="Zhang / Chang / Cheung…"
          onChange={(e) => onChange({ englishSurname: e.target.value })}
        />
        <div className="hint">填了之后会检查首字母缩写和全名念起来的节奏。</div>
      </div>

      <h3 style={{ margin: '22px 0 4px', fontSize: 14 }}>出生信息（可跳过）</h3>
      <p className="field hint" style={{ marginBottom: 12 }}>
        只有想参考五行时才需要填。不填也能正常取名。
      </p>

      <div className="field">
        <label htmlFor="f-date">出生日期</label>
        <input
          id="f-date"
          className="input"
          type="date"
          value={birth.date}
          max={today}
          aria-invalid={!!futureDate}
          onChange={(e) => setBirth({ date: e.target.value })}
        />
        {futureDate && <div className="err">日期在未来，八字要等宝宝出生后才能排</div>}
      </div>

      <div className="field">
        <label htmlFor="f-time">出生时间</label>
        <input
          id="f-time"
          className="input"
          type="time"
          value={birth.time}
          onChange={(e) => setBirth({ time: e.target.value })}
        />
        <div className="hint">不知道具体时辰就留空，只是不排时柱，其余照常。</div>
      </div>

      <div className="field">
        <label htmlFor="f-city">出生城市</label>
        <input
          id="f-city"
          className="input"
          value={birth.city || cityQuery}
          placeholder="奥克兰 / Auckland / 上海…"
          onChange={(e) => { setCityQuery(e.target.value); setBirth({ city: '' }) }}
        />
        {!birth.city && cityHits.length > 0 && (
          <div className="chips" style={{ marginTop: 8 }}>
            {cityHits.map((c) => (
              <button
                key={c.zh}
                className="chip sm"
                onClick={() => { setBirth({ city: c.zh }); setCityQuery('') }}
              >
                {c.zh} · {c.en}
              </button>
            ))}
          </div>
        )}
        <div className="hint">
          城市决定时区和经度。真太阳时校正会真的影响时柱 —— 收录了 {CITIES.length} 个海外华人常住的城市。
        </div>
      </div>

      <div className="field">
        <label>五行参考方式</label>
        <ChipGroup
          value={prefs.element}
          options={ELEMENT_OPTS as { value: Element | 'auto' | 'none'; label: string }[]}
          onChange={(v) => onChange({ element: v })}
          small
        />
      </div>

      {baziError && <div className="note warn">{baziError}</div>}

      {bazi && birth.city && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 14 }}>排出来的四柱</h3>
          <BaziPanel bazi={bazi} cityName={birth.city} />
        </div>
      )}
    </Sheet>
  )
}
