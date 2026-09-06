import { useEffect, useMemo, useState } from 'react'
import { NameCard } from '../components/NameCard'
import { NameDetail } from '../components/NameDetail'
import { FiltersSheet } from '../components/FiltersSheet'
import { Empty } from '../components/ui'
import { generateNames } from '../engine/nameEngine'
import { useBazi } from '../engine/useBazi'
import { SURNAME_MAP } from '../data/surnames'
import type { NameCandidate, Prefs } from '../types'
import type { Favorite } from '../store/storage'

interface Props {
  prefs: Prefs
  onPrefsChange: (patch: Partial<Prefs>) => void
  favorites: Favorite[]
  onToggleFavorite: (fav: Favorite) => void
  onGenerated: (summary: string, seed: number) => void
}

const STYLE_SHORTCUTS = [
  { value: 'any', label: '不挑风格' },
  { value: 'shu', label: '书卷' },
  { value: 'nat', label: '自然' },
  { value: 'jian', label: '简约' },
  { value: 'qing', label: '清朗' },
] as const

const BATCH = 12

export function Studio({ prefs, onPrefsChange, favorites, onToggleFavorite, onGenerated }: Props) {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9))
  const [openFilters, setOpenFilters] = useState(false)
  const [detail, setDetail] = useState<NameCandidate | null>(null)

  const { bazi, error: baziError, targetElement } = useBazi(prefs)

  const surnameOk = /^[一-龥]{1,2}$/.test(prefs.surname)
  const surnameKnown = SURNAME_MAP.has(prefs.surname)

  const results = useMemo(() => {
    if (!surnameOk) return []
    return generateNames({ prefs, targetElement, seed, count: BATCH })
  }, [prefs, targetElement, seed, surnameOk])

  // 条件变了才记一笔历史；「换一批」只是换种子，不算新条件
  const summary = useMemo(() => {
    const bits = [
      prefs.surname,
      prefs.gender === 'boy' ? '男孩' : prefs.gender === 'girl' ? '女孩' : '中性',
      prefs.length === 1 ? '单字名' : '',
      prefs.style === 'any' ? '不挑风格' : STYLE_SHORTCUTS.find((s) => s.value === prefs.style)?.label ?? '',
      targetElement ? `补${targetElement}` : '',
      prefs.mustInclude ? `必含「${prefs.mustInclude}」` : '',
      prefs.avoidChars ? `避「${prefs.avoidChars}」` : '',
      prefs.siblingName ? `呼应「${prefs.siblingName}」` : '',
      prefs.easyToWrite ? '少笔画' : '',
      prefs.avoidPopular ? '' : '含爆款字',
      prefs.englishFriendly ? '' : '不看英语读音',
    ].filter(Boolean)
    return bits.join(' · ')
  }, [prefs, targetElement])

  useEffect(() => {
    if (results.length > 0) onGenerated(summary, seed)
    // onGenerated 每次渲染都会新建，放进依赖会变成死循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary])

  const favIds = new Set(favorites.map((f) => f.id))

  const makeFavorite = (n: NameCandidate, englishName: string | null): Favorite => ({
    id: n.id,
    full: n.full,
    given: n.given,
    surname: n.surname,
    pinyin: n.pinyin,
    englishName,
    note: '',
    score: n.score,
    addedAt: Date.now(),
  })

  return (
    <>
      <div className="quickbar">
        <div className="col">
          <div className="row">
            <input
              className="input surname-input"
              value={prefs.surname}
              maxLength={2}
              placeholder="姓氏"
              aria-label="宝宝的姓氏"
              aria-invalid={!!prefs.surname && !surnameOk}
              onChange={(e) => onPrefsChange({ surname: e.target.value.replace(/[^一-龥]/g, '') })}
            />
            <div className="seg" role="group" aria-label="性别倾向">
              {([
                { v: 'boy', l: '男孩' },
                { v: 'girl', l: '女孩' },
                { v: 'neutral', l: '中性' },
              ] as const).map((o) => (
                <button
                  key={o.v}
                  aria-pressed={prefs.gender === o.v}
                  onClick={() => onPrefsChange({ gender: o.v })}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-row">
            <div className="filters">
              {STYLE_SHORTCUTS.map((s) => (
                <button
                  key={s.value}
                  className="chip sm"
                  aria-pressed={prefs.style === s.value}
                  onClick={() => onPrefsChange({ style: s.value })}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button className="chip sm more-btn" onClick={() => setOpenFilters(true)}>
              更多条件{activeExtraCount(prefs) > 0 ? ` ${activeExtraCount(prefs)}` : ''}
            </button>
          </div>
        </div>
      </div>

      <div className="col">
        {!prefs.surname && (
          <Empty glyph="名" title="先填一个姓">
            填上姓氏就能立刻看到名字，其余条件都可以之后再调。
            所有计算都在你的手机上完成，不上传任何数据。
          </Empty>
        )}

        {!!prefs.surname && !surnameOk && (
          <div className="note danger" style={{ marginTop: 16 }}>
            姓氏需要是 1 到 2 个汉字。复姓（欧阳、司马）可以填两个字。
          </div>
        )}

        {surnameOk && !surnameKnown && (
          <div className="note" style={{ marginTop: 14 }}>
            「{prefs.surname}」不在本站的姓氏拼音表里，所以谐音和连读检查会只看名字本身，
            不包含姓。名字照常生成。
          </div>
        )}

        {baziError && <div className="note warn" style={{ marginTop: 14 }}>{baziError}</div>}

        {targetElement && (
          <div className="note info" style={{ marginTop: 14 }}>
            正在优先推荐含<strong>{targetElement}</strong>的字
            {bazi ? `（八字里${bazi.missing.includes(targetElement) ? '完全没有' : '最弱的'}是${targetElement}）` : ''}。
          </div>
        )}

        {surnameOk && results.length === 0 && (
          <Empty glyph="空" title="这些条件下没有能推荐的名字">
            通常是必含字、避讳字和五行叠加得太紧了。硬性的安全规则（谐音事故、避讳字、爆款组合）
            不会为了凑数而放宽，所以请先放宽一个软条件再试。
          </Empty>
        )}

        <div className="name-list">
          {results.map((n) => (
            <NameCard
              key={n.id}
              candidate={n}
              favorited={favIds.has(n.id)}
              onToggleFavorite={() => onToggleFavorite(makeFavorite(n, null))}
              onOpen={() => setDetail(n)}
            />
          ))}
        </div>

        {results.length > 0 && (
          <>
            <button
              className="btn block"
              style={{ marginTop: 14 }}
              onClick={() => setSeed(Math.floor(Math.random() * 1e9))}
            >
              ↻ 再换一批
            </button>
            <p className="field hint" style={{ marginTop: 10, textAlign: 'center' }}>
              每批 {BATCH} 个，从符合条件的候选里随机取，不会重复给你同样的顺序。
            </p>
            <div style={{ height: 72 }} />
          </>
        )}
      </div>

      {results.length > 0 && (
        <div className="fab-row">
          <button className="fab" onClick={() => setSeed(Math.floor(Math.random() * 1e9))}>
            ↻ 换一批
          </button>
        </div>
      )}

      <FiltersSheet
        open={openFilters}
        prefs={prefs}
        bazi={bazi}
        baziError={baziError}
        onChange={onPrefsChange}
        onClose={() => setOpenFilters(false)}
      />

      <NameDetail
        candidate={detail}
        prefs={prefs}
        favorited={detail ? favIds.has(detail.id) : false}
        savedEnglishName={detail ? favorites.find((f) => f.id === detail.id)?.englishName ?? null : null}
        onClose={() => setDetail(null)}
        onToggleFavorite={(en) => detail && onToggleFavorite(makeFavorite(detail, en))}
      />
    </>
  )
}

function activeExtraCount(p: Prefs): number {
  let n = 0
  if (p.length !== 2) n++
  if (p.mustInclude) n++
  if (p.avoidChars) n++
  if (p.siblingName) n++
  if (p.englishSurname) n++
  if (p.element !== 'none') n++
  if (p.enStyle !== 'any') n++
  if (!p.avoidPopular) n++
  if (p.easyToWrite) n++
  if (!p.englishFriendly) n++
  return n
}
