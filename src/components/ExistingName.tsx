import { useMemo, useState } from 'react'
import { HanInput } from './HanInput'
import { Empty } from './ui'
import { analyzeName, detectInputKind } from '../engine/analyze'
import { readabilityLabel } from '../engine/readability'
import {
  checkFullEnglishName, filterEnglishNames, pairChineseForEnglish, pairEnglishNames,
} from '../engine/englishEngine'
import { generate } from '../engine/nameEngine'
import { ENGLISH_NAME_MAP, type EnglishName } from '../data/englishNames'
import { stripTone } from '../engine/pinyin'
import type { Prefs } from '../types'
import type { Favorite } from '../store/storage'

interface Props {
  prefs: Prefs
  onPrefsChange: (patch: Partial<Prefs>) => void
  favorites: Favorite[]
  onToggleFavorite: (fav: Favorite) => void
}

const FLAG_TEXT: Record<string, string> = {
  spell: '拼写容易写错',
  mis: '母语者也常读错',
  nick: '容易被叫成昵称',
  trend: '当下非常流行',
}

export function ExistingName({ prefs, onPrefsChange, favorites, onToggleFavorite }: Props) {
  const [text, setText] = useState('')
  const kind = detectInputKind(text)

  const zh = useMemo(() => (kind === 'zh' ? analyzeName(text) : null), [text, kind])

  const enPairs = useMemo(() => {
    if (!zh) return []
    const pys = zh.givenChars.map((c) => c.pinyin).filter(Boolean) as string[]
    if (!pys.length) return []
    return pairEnglishNames(zh.given, pys, prefs.gender, prefs.enStyle, 6)
  }, [zh, prefs.gender, prefs.enStyle])

  // 英文名这一路：先在库里找，找不到给相近的
  const enMatch: EnglishName | undefined = useMemo(() => {
    if (kind !== 'en') return undefined
    const q = text.trim().toLowerCase()
    return [...ENGLISH_NAME_MAP.values()].find((n) => n.name.toLowerCase() === q)
  }, [text, kind])

  const enNear = useMemo(() => {
    if (kind !== 'en' || enMatch) return []
    const q = text.trim().toLowerCase()
    if (q.length < 2) return []
    return filterEnglishNames('neutral', 'any', '')
      .concat(filterEnglishNames('boy', 'any', ''), filterEnglishNames('girl', 'any', ''))
      .filter((n, i, arr) => arr.findIndex((x) => x.name === n.name) === i)
      .filter((n) => n.name.toLowerCase().startsWith(q.slice(0, 2)))
      .slice(0, 6)
  }, [text, kind, enMatch])

  const zhForEnglish = useMemo(() => {
    if (!enMatch || !/^[一-龥]{1,2}$/.test(prefs.surname)) return []
    const pool = generate({ prefs, targetElement: null, seed: 7, count: 120 }).names
    return pairChineseForEnglish(enMatch, pool, 6)
  }, [enMatch, prefs])

  const fullCheck = enMatch && prefs.englishSurname.trim()
    ? checkFullEnglishName(enMatch.name, '', prefs.englishSurname.trim())
    : null

  const read = zh?.readability ? readabilityLabel(zh.readability.score) : null

  return (
    <div className="col">
      <div className="page-head" style={{ paddingBottom: 4 }}>
        <h1>已经有名字了</h1>
        <div className="sub">看看它在英语环境里怎么念，再配上另一半</div>
      </div>

      <div className="field" style={{ marginTop: 10 }}>
        <label htmlFor="have-name">输入中文名或英文名</label>
        <HanInput
          id="have-name"
          value={text}
          onChange={setText}
          placeholder="郑清越 或 Grace"
          aria-label="已经定好的名字"
          allowLatin
        />
        <div className="hint">
          输中文名（含姓）会给出逐字解读、英语里的读法，和配得上的英文名；
          输英文名会给出发音、注意事项，和配得上的中文名。
        </div>
      </div>

      {kind === 'unknown' && text.trim().length > 0 && (
        <div className="note warn">
          没看懂这是中文名还是英文名。中文名请直接写汉字（比如「郑清越」），
          英文名请写拉丁字母（比如「Grace」）。
        </div>
      )}

      {!text.trim() && (
        <Empty glyph="名" title="把已经定下的名字填进来">
          这个工具最有用的地方，是告诉你这个名字在英语环境里会被念成什么 ——
          哪怕名字已经定了，提前知道也好过等孩子上学才发现。
        </Empty>
      )}

      {/* ---------- 中文名这一路 ---------- */}
      {zh && (
        <>
          <div className="analysis-hero">
            <div className="glyphs"><span className="sur">{zh.surname}</span>{zh.given}</div>
            <div className="py">{zh.pinyin}</div>
            <div className="pills">
              {read && (
                <span className={`pill ${read.tone === 'good' ? 'jade' : read.tone === 'ok' ? 'mute' : 'amber'}`}>
                  {read.text}
                </span>
              )}
              {zh.totalStrokes !== null && <span className="pill mute">名字 {zh.totalStrokes} 画</span>}
            </div>
          </div>

          {zh.unknownCount > 0 && (
            <div className="note warn">
              有 {zh.unknownCount} 个字不在本站字库里，这几个字的读音和字义没法给出，
              英语读法和谐音检查也只看认得的部分。
            </div>
          )}

          <h3 className="analysis-h">逐字来看</h3>
          <div className="char-rows">
            {zh.givenChars.map((c, i) => (
              <div className="char-row" key={`${c.char}-${i}`}>
                <div className="big">{c.char}<small>{c.pinyin ?? '读音未知'}</small></div>
                <div className="meta">
                  <div className="meaning">{c.meaning ?? '这个字不在本站字库里'}</div>
                  <div className="facts">
                    {c.strokes !== null && <span className="pill mute">{c.strokes} 画</span>}
                    {c.element && <span className="pill mute">五行属{c.element}</span>}
                    {c.tone !== null && <span className="pill mute">{c.tone} 声</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {zh.source && (
            <>
              <h3 className="analysis-h">典籍出处</h3>
              <div className="source-line" style={{ fontSize: 14 }}>
                {zh.source.line}
                <span className="ref">{zh.source.ref}</span>
              </div>
            </>
          )}

          <h3 className="analysis-h">在英语环境里会被怎么念</h3>
          {!zh.readability ? (
            <div className="note">认得的字不够，没法判断读法。</div>
          ) : zh.readability.issues.length === 0 && zh.readability.clashes.length === 0 ? (
            <div className="note info">
              这个名字的拼音在英语里没有明显陷阱，老师和同学第一次看到大概率能念对。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {zh.readability.issues.map((i, idx) => (
                <div className={i.level === 'hard' ? 'note warn' : 'note'} key={idx}>
                  <strong>{i.syllable}</strong> 常被念成{i.heardAs}。{i.note}
                </div>
              ))}
              {zh.readability.clashes.map((c, idx) => (
                <div className="note danger" key={`c${idx}`}>
                  <strong>{c.syllable}</strong>：{c.note}。
                </div>
              ))}
            </div>
          )}

          {zh.homophones.length > 0 && (
            <>
              <h3 className="analysis-h">中文谐音</h3>
              {zh.homophones.map((h, i) => (
                <div className={h.level === 'block' ? 'note danger' : 'note warn'} key={i} style={{ marginBottom: 6 }}>
                  「{zh.full}」连读接近<strong>{h.reads}</strong>。
                </div>
              ))}
            </>
          )}

          {zh.toneNotes.length > 0 && (
            <>
              <h3 className="analysis-h">连读</h3>
              {zh.toneNotes.map((t, i) => <div className="note" key={i} style={{ marginBottom: 6 }}>{t}</div>)}
            </>
          )}

          <h3 className="analysis-h">配得上的英文名</h3>
          <p className="field hint" style={{ marginBottom: 10 }}>
            护照上的拼音写法是 <strong>
              {zh.givenChars.map((c) => (c.pinyin ? stripTone(c.pinyin) : '')).join('').replace(/^./, (m) => m.toUpperCase())}
            </strong>。可以在「更多条件」里改性别和英文名风格。
          </p>
          {enPairs.length === 0 ? (
            <div className="note">认得的字不够，没法做配对。</div>
          ) : (
            <div className="en-list">
              {enPairs.map((p) => {
                const id = `en:${p.name.name}`
                const fav = favorites.some((f) => f.id === id)
                return (
                  <div className="en-card" key={p.name.name}>
                    <div className="name-row">
                      <span className="en-name">{p.name.name}</span>
                      <span className="pron">/{p.name.pron}/</span>
                      <span className="zh">{p.name.zhPron}</span>
                      <button
                        className="fav-btn"
                        style={{ marginLeft: 'auto' }}
                        aria-pressed={fav}
                        aria-label={fav ? `取消收藏 ${p.name.name}` : `收藏 ${p.name.name}`}
                        onClick={() => onToggleFavorite({
                          id, full: p.name.name, given: p.name.name, surname: '',
                          pinyin: p.name.pron, englishName: p.name.name, note: `配 ${zh.full}`,
                          score: 0, addedAt: Date.now(),
                        })}
                      >{fav ? '♥' : '♡'}</button>
                    </div>
                    <div className="reasons">{p.reasons.join('；')}</div>
                    {p.cautions.length > 0 && <div className="cautions">留意：{p.cautions.join('；')}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ---------- 英文名这一路 ---------- */}
      {kind === 'en' && enMatch && (
        <>
          <div className="analysis-hero">
            <div className="glyphs en">{enMatch.name}</div>
            <div className="py">/{enMatch.pron}/　{enMatch.zhPron}</div>
            <div className="pills">
              <span className="pill mute">{enMatch.origin}名</span>
              {enMatch.flags.length === 0 && <span className="pill jade">拼写和发音都稳</span>}
              {enMatch.flags.map((f) => <span className="pill amber" key={f}>{FLAG_TEXT[f]}</span>)}
            </div>
          </div>

          <div className="kv-list" style={{ marginTop: 16 }}>
            <div className="kv"><span className="k">含义</span><span className="v">{enMatch.meaning}</span></div>
            <div className="kv"><span className="k">读法</span><span className="v">重音在大写那一节：{enMatch.pron}</span></div>
          </div>

          {fullCheck && (
            <>
              <h3 className="analysis-h">配上你的英文姓氏</h3>
              <div className="note info">
                <strong>{enMatch.name} {prefs.englishSurname.trim()}</strong>　首字母 <strong>{fullCheck.initials}</strong>
              </div>
              {fullCheck.notes.map((n, i) => (
                <div className={n.level === 'warn' ? 'note danger' : 'note'} key={i} style={{ marginTop: 8 }}>
                  {n.text}
                </div>
              ))}
            </>
          )}

          <h3 className="analysis-h">配得上的中文名</h3>
          {!/^[一-龥]{1,2}$/.test(prefs.surname) ? (
            <div className="field">
              <label htmlFor="have-surname">先填上姓氏</label>
              <HanInput
                id="have-surname"
                value={prefs.surname}
                maxChars={2}
                placeholder="姓氏"
                aria-label="宝宝的姓氏"
                onChange={(surname) => onPrefsChange({ surname })}
              />
            </div>
          ) : (
            <div className="name-list">
              {zhForEnglish.map((m) => (
                <div className="fav-item" key={m.candidate.id}>
                  <div className="head">
                    <div className="glyphs">
                      <span className="sur">{m.candidate.surname}</span>{m.candidate.given}
                    </div>
                    <div className="acts">
                      <button
                        className="icon-btn"
                        aria-pressed={favorites.some((f) => f.id === m.candidate.id)}
                        aria-label={`收藏 ${m.candidate.full}`}
                        onClick={() => onToggleFavorite({
                          id: m.candidate.id, full: m.candidate.full, given: m.candidate.given,
                          surname: m.candidate.surname, pinyin: m.candidate.pinyin,
                          englishName: enMatch.name, note: '', score: m.candidate.score, addedAt: Date.now(),
                        })}
                      >♡</button>
                    </div>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--ink-3)' }}>
                    {m.candidate.pinyin}　·　{m.reasons.join('，')}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7 }}>
                    {m.candidate.chars.map((c) => `${c.char}：${c.meaning}`).join('　')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {kind === 'en' && !enMatch && text.trim().length >= 2 && (
        <>
          <div className="note warn">
            「{text.trim()}」不在本站的英文名库里。库里只收长期通用、拼写稳定、
            没有明显负面联想的名字，所以收得比较克制。
          </div>
          {enNear.length > 0 && (
            <>
              <h3 className="analysis-h">库里有这些相近的</h3>
              <div className="chips">
                {enNear.map((n) => (
                  <button key={n.name} className="chip" onClick={() => setText(n.name)}>
                    {n.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div style={{ height: 40 }} />
    </div>
  )
}
