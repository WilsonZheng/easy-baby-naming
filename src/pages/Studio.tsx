import { useEffect, useMemo, useState } from 'react'
import { NameCard } from '../components/NameCard'
import { EnglishCard } from '../components/EnglishCard'
import { NameDetail } from '../components/NameDetail'
import { EnglishDetail } from '../components/EnglishDetail'
import { FiltersSheet } from '../components/FiltersSheet'
import { HanInput } from '../components/HanInput'
import { AiAskSheet } from '../components/AiAskSheet'
import { ExistingName } from '../components/ExistingName'
import { Empty } from '../components/ui'
import { generate } from '../engine/nameEngine'
import { filterEnglishNames, pairChineseForEnglish, pairEnglishNames } from '../engine/englishEngine'
import { useBazi } from '../engine/useBazi'
import { SURNAME_MAP } from '../data/surnames'
import type { EnglishName } from '../data/englishNames'
import type { NameCandidate, Prefs } from '../types'
import type { Favorite } from '../store/storage'
import type { AiState } from '../ai/useAi'

interface Props {
  prefs: Prefs
  onPrefsChange: (patch: Partial<Prefs>) => void
  favorites: Favorite[]
  onToggleFavorite: (fav: Favorite) => void
  onGenerated: (summary: string, seed: number) => void
  ai: AiState
  onOpenAiSettings: () => void
}

const STYLE_SHORTCUTS = [
  { value: 'any', label: '不挑', full: '不挑风格' },
  { value: 'shu', label: '书卷', full: '书卷文雅' },
  { value: 'nat', label: '自然', full: '自然大气' },
  { value: 'jian', label: '简约', full: '简约温柔' },
  { value: 'qing', label: '清朗', full: '清朗现代' },
] as const

const EN_SHORTCUTS = [
  { value: 'any', label: '不挑', full: '不挑风格' },
  { value: 'classic', label: '经典', full: '经典' },
  { value: 'nature', label: '自然', full: '自然' },
  { value: 'short', label: '简洁', full: '简洁' },
  { value: 'modern', label: '现代', full: '现代' },
] as const

const BATCH = 12
/** 英文名模式下，用来给英文名做配对的中文候选池 */
const ZH_POOL_FOR_PAIRING = 120

export function Studio({
  prefs, onPrefsChange, favorites, onToggleFavorite, onGenerated, ai, onOpenAiSettings,
}: Props) {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9))
  const [openFilters, setOpenFilters] = useState(false)
  const [openAsk, setOpenAsk] = useState(false)
  const [detail, setDetail] = useState<NameCandidate | null>(null)
  const [enDetail, setEnDetail] = useState<EnglishName | null>(null)
  /** 这一轮条件下已经看过的中文名，「换一批」时不再出现 */
  const [seenZh, setSeenZh] = useState<ReadonlySet<string>>(() => new Set())
  const [seenEn, setSeenEn] = useState<ReadonlySet<string>>(() => new Set())

  const { bazi, error: baziError, targetElement } = useBazi(prefs)

  const surnameOk = /^[一-龥]{1,2}$/.test(prefs.surname)
  const surnameKnown = SURNAME_MAP.has(prefs.surname)

  // 条件一变就把「看过什么」清空，重新从最合适的开始给
  const conditionKey = useMemo(
    () => JSON.stringify([
      prefs.mode, prefs.surname, prefs.gender, prefs.style, prefs.length, prefs.enStyle,
      prefs.mustInclude, prefs.avoidChars, prefs.siblingName,
      prefs.avoidPopular, prefs.easyToWrite, prefs.englishFriendly, targetElement,
    ]),
    [prefs, targetElement],
  )
  useEffect(() => {
    setSeenZh(new Set())
    setSeenEn(new Set())
  }, [conditionKey])

  const zh = useMemo(() => {
    if (!surnameOk || prefs.mode !== 'zh') return { names: [] as NameCandidate[], poolSize: 0, exhausted: false }
    return generate({ prefs, targetElement, seed, count: BATCH, exclude: seenZh })
  }, [prefs, targetElement, seed, surnameOk, seenZh])

  // 英文名模式：先备一池中文候选，用来给每个英文名找搭配
  const zhPool = useMemo(() => {
    if (prefs.mode !== 'en' || !surnameOk) return []
    return generate({ prefs, targetElement, seed, count: ZH_POOL_FOR_PAIRING }).names
  }, [prefs, targetElement, seed, surnameOk])

  const en = useMemo(() => {
    if (prefs.mode !== 'en') return { names: [] as EnglishName[], exhausted: false }
    const all = filterEnglishNames(prefs.gender, prefs.enStyle, '')
    const fresh = all.filter((n) => !seenEn.has(n.name))
    // 有提示标记的往后排：拼写难、常被读错、太流行的先不推
    const ranked = fresh.slice().sort((a, b) => a.flags.length - b.flags.length)
    // 同一批里不要总是同样的顺序
    const start = seed % Math.max(1, ranked.length)
    const rotated = [...ranked.slice(start), ...ranked.slice(0, start)]
    return { names: rotated.slice(0, BATCH), exhausted: fresh.length < BATCH }
  }, [prefs.mode, prefs.gender, prefs.enStyle, seed, seenEn])

  // 每个中文名旁边直接带出最搭的一个英文名。
  // 两条约束：一是必须真的配上（读音或含义），兜底的通用推荐不显示；
  // 二是同一屏里不重复，否则一整页都是同一个英文名。
  const englishPicks = useMemo(() => {
    type Pick = ReturnType<typeof pairEnglishNames>[number]
    const map = new Map<string, Pick>()
    if (prefs.mode !== 'zh') return map
    const used = new Set<string>()
    for (const n of zh.names) {
      const options = pairEnglishNames(n.given, n.chars.map((c) => c.pinyin), prefs.gender, prefs.enStyle, 20)
      // 优先给真的配上的；实在没有就给一个没被用过的，但理由如实说明是各自独立的
      const pick =
        options.find((o) => o.matched && !used.has(o.name.name)) ??
        options.find((o) => !used.has(o.name.name))
      if (pick) {
        used.add(pick.name.name)
        map.set(n.id, pick)
      }
    }
    return map
  }, [zh.names, prefs.mode, prefs.gender, prefs.enStyle])

  // 同一屏里尽量不要让同一个中文名反复出现在不同英文名下面
  const zhMatches = useMemo(() => {
    type Matches = ReturnType<typeof pairChineseForEnglish>
    const map = new Map<string, Matches>()
    if (prefs.mode !== 'en') return map
    const used = new Set<string>()
    for (const n of en.names) {
      const all = pairChineseForEnglish(n, zhPool, 12)
      const picked: Matches = []
      for (const m of all) {
        if (used.has(m.candidate.given)) continue
        picked.push(m)
        used.add(m.candidate.given)
        if (picked.length >= 3) break
      }
      // 实在挑不出没用过的，就退回原始排序，宁可重复也不要空着
      map.set(n.name, picked.length ? picked : all.slice(0, 3))
    }
    return map
  }, [en.names, zhPool, prefs.mode])

  const summary = useMemo(() => {
    const bits = [
      prefs.mode === 'en' ? '英文名优先' : '',
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
    if (zh.names.length > 0 || en.names.length > 0) onGenerated(summary, seed)
    // onGenerated 每次渲染都会新建，放进依赖会变成死循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary])

  const favIds = new Set(favorites.map((f) => f.id))

  const makeFavorite = (n: NameCandidate, englishName: string | null): Favorite => ({
    id: n.id, full: n.full, given: n.given, surname: n.surname, pinyin: n.pinyin,
    englishName, note: '', score: n.score, addedAt: Date.now(),
  })

  const makeEnFavorite = (n: EnglishName): Favorite => ({
    id: `en:${n.name}`, full: n.name, given: n.name, surname: '', pinyin: n.pron,
    englishName: n.name, note: '', score: 0, addedAt: Date.now(),
  })

  /** 记住这一批，再抽下一批；全看完了就从头开始 */
  const nextBatch = () => {
    if (prefs.mode === 'zh') {
      const next = new Set(seenZh)
      for (const n of zh.names) next.add(n.given)
      setSeenZh(zh.names.length < BATCH ? new Set() : next)
    } else {
      const next = new Set(seenEn)
      for (const n of en.names) next.add(n.name)
      setSeenEn(en.names.length < BATCH ? new Set() : next)
    }
    setSeed(Math.floor(Math.random() * 1e9))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const isEn = prefs.mode === 'en'
  const isHave = prefs.mode === 'have'
  const wrapped = isEn
    ? en.names.length < BATCH && seenEn.size > 0
    : zh.names.length < BATCH && seenZh.size > 0
  const seenCount = isEn ? seenEn.size : seenZh.size
  const hasResults = isEn ? en.names.length > 0 : zh.names.length > 0

  return (
    <>
      <div className="quickbar">
        <div className="col">
          <div className="top-row">
            <div className="mode-seg" role="group" aria-label="你现在要做什么">
              <button aria-pressed={prefs.mode === 'zh'} onClick={() => onPrefsChange({ mode: 'zh' })}>
                取中文名
              </button>
              <button aria-pressed={prefs.mode === 'en'} onClick={() => onPrefsChange({ mode: 'en' })}>
                取英文名
              </button>
              <button aria-pressed={isHave} onClick={() => onPrefsChange({ mode: 'have' })}>
                已有名字
              </button>
            </div>
            <button className="chip sm ai-btn" onClick={() => setOpenAsk(true)}>
              ✨ 一句话
            </button>
            <button className="chip sm more-btn" onClick={() => setOpenFilters(true)}>
              条件{activeExtraCount(prefs) > 0 ? ` ${activeExtraCount(prefs)}` : ''}
            </button>
          </div>

          <div className="row">
            <HanInput
              className="input surname-input"
              value={prefs.surname}
              maxChars={2}
              placeholder="姓氏"
              aria-label="宝宝的姓氏"
              aria-invalid={!!prefs.surname && !surnameOk}
              onChange={(surname) => onPrefsChange({ surname })}
            />
            <div className="seg" role="group" aria-label="性别倾向">
              {([
                { v: 'boy', l: '男孩' },
                { v: 'girl', l: '女孩' },
                { v: 'neutral', l: '中性' },
              ] as const).map((o) => (
                <button key={o.v} aria-pressed={prefs.gender === o.v}
                  onClick={() => onPrefsChange({ gender: o.v })}>{o.l}</button>
              ))}
            </div>
          </div>

          {/* 风格铺满一整行，五个选项永远全部可见 —— 主要选择控件不该需要横向滑动 */}
          {!isHave && (
          <div className="filters" role="group" aria-label={isEn ? '英文名风格' : '名字气质'}>
            {isEn
              ? EN_SHORTCUTS.map((s) => (
                  <button key={s.value} className="chip sm" aria-label={s.full}
                    aria-pressed={prefs.enStyle === s.value}
                    onClick={() => onPrefsChange({ enStyle: s.value })}>{s.label}</button>
                ))
              : STYLE_SHORTCUTS.map((s) => (
                  <button key={s.value} className="chip sm" aria-label={s.full}
                    aria-pressed={prefs.style === s.value}
                    onClick={() => onPrefsChange({ style: s.value })}>{s.label}</button>
                ))}
          </div>
          )}
        </div>
      </div>

      {isHave && (
        <ExistingName
          prefs={prefs}
          onPrefsChange={onPrefsChange}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
        />
      )}

      <div className="col" hidden={isHave}>
        {!prefs.surname && (
          <Empty glyph="名" title="先填一个姓">
            {isEn
              ? '英文名不需要姓也能看，但填上姓氏才能给每个英文名配出对应的中文名。'
              : '填上姓氏就能立刻看到名字，其余条件都可以之后再调。所有计算都在你的手机上完成，不上传任何数据。'}
          </Empty>
        )}

        {!!prefs.surname && !surnameOk && (
          <div className="note danger" style={{ marginTop: 16 }}>
            姓氏需要是 1 到 2 个汉字。复姓（欧阳、司马）可以填两个字。
          </div>
        )}

        {surnameOk && !surnameKnown && !isEn && (
          <div className="note" style={{ marginTop: 14 }}>
            「{prefs.surname}」不在本站的姓氏拼音表里，所以谐音和连读检查会只看名字本身，
            不包含姓。名字照常生成。
          </div>
        )}

        {baziError && !isEn && <div className="note warn" style={{ marginTop: 14 }}>{baziError}</div>}

        {targetElement && !isEn && (
          <div className="note info" style={{ marginTop: 14 }}>
            正在优先推荐含<strong>{targetElement}</strong>的字
            {bazi ? `（八字里${bazi.missing.includes(targetElement) ? '完全没有' : '最弱的'}是${targetElement}）` : ''}。
          </div>
        )}

        {wrapped && (
          <div className="note info" style={{ marginTop: 14 }}>
            符合这些条件的名字你都看过一遍了（共 {seenCount + (isEn ? en.names.length : zh.names.length)} 个）。
            下面是重新开始的一批，换个条件会有全新的结果。
          </div>
        )}

        {surnameOk && !isEn && zh.names.length === 0 && !wrapped && (
          <Empty glyph="空" title="这些条件下没有能推荐的名字">
            通常是必含字、避讳字和五行叠加得太紧了。硬性的安全规则（谐音事故、避讳字、爆款组合）
            不会为了凑数而放宽，所以请先放宽一个软条件再试。
          </Empty>
        )}

        <div className="name-list">
          {!isEn && zh.names.map((n) => (
            <NameCard
              key={n.id}
              candidate={n}
              favorited={favIds.has(n.id)}
              englishPick={englishPicks.get(n.id)}
              onToggleFavorite={() => onToggleFavorite(makeFavorite(n, englishPicks.get(n.id)?.name.name ?? null))}
              onOpen={() => setDetail(n)}
            />
          ))}
          {isEn && en.names.map((n) => (
            <EnglishCard
              key={n.name}
              name={n}
              matches={zhMatches.get(n.name) ?? []}
              favorited={favIds.has(`en:${n.name}`)}
              onToggleFavorite={() => onToggleFavorite(makeEnFavorite(n))}
              onOpen={() => setEnDetail(n)}
            />
          ))}
        </div>

        {hasResults && (
          <>
            <button className="btn block" style={{ marginTop: 14 }} onClick={nextBatch}>
              ↻ 再换一批
            </button>
            <p className="field hint" style={{ marginTop: 10, textAlign: 'center' }}>
              每批 {BATCH} 个{seenCount > 0 ? `，已经看过 ${seenCount} 个，不会重复出现` : '，看过的不会再出现'}。
            </p>
            <div style={{ height: 72 }} />
          </>
        )}
      </div>

      {hasResults && !isHave && (
        <div className="fab-row">
          <button className="fab" onClick={nextBatch}>↻ 换一批</button>
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

      <AiAskSheet
        open={openAsk}
        ai={ai}
        onApply={onPrefsChange}
        onClose={() => setOpenAsk(false)}
        onOpenSettings={() => { setOpenAsk(false); onOpenAiSettings() }}
      />

      <NameDetail
        candidate={detail}
        prefs={prefs}
        favorited={detail ? favIds.has(detail.id) : false}
        savedEnglishName={detail ? favorites.find((f) => f.id === detail.id)?.englishName ?? null : null}
        ai={ai}
        onOpenAiSettings={onOpenAiSettings}
        onClose={() => setDetail(null)}
        onToggleFavorite={(en2) => detail && onToggleFavorite(makeFavorite(detail, en2))}
      />

      <EnglishDetail
        name={enDetail}
        matches={enDetail ? zhMatches.get(enDetail.name) ?? [] : []}
        englishSurname={prefs.englishSurname}
        favorited={enDetail ? favIds.has(`en:${enDetail.name}`) : false}
        onClose={() => setEnDetail(null)}
        onToggleFavorite={() => enDetail && onToggleFavorite(makeEnFavorite(enDetail))}
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
  if (!p.avoidPopular) n++
  if (p.easyToWrite) n++
  if (!p.englishFriendly) n++
  return n
}
