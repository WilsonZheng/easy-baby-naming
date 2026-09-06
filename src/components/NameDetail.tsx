import { useMemo, useState } from 'react'
import type { NameCandidate, Prefs } from '../types'
import { Sheet } from './Sheet'
import { readabilityLabel } from '../engine/readability'
import { checkFullEnglishName, pairEnglishNames, toRomanized } from '../engine/englishEngine'
import type { AiState } from '../ai/useAi'

interface Props {
  candidate: NameCandidate | null
  prefs: Prefs
  favorited: boolean
  savedEnglishName: string | null
  ai: AiState
  onOpenAiSettings: () => void
  onClose: () => void
  onToggleFavorite: (englishName: string | null) => void
}

export function NameDetail({
  candidate: n, prefs, favorited, savedEnglishName, ai, onOpenAiSettings, onClose, onToggleFavorite,
}: Props) {
  const [picked, setPicked] = useState<string | null>(savedEnglishName)
  const [aiText, setAiText] = useState<string | null>(null)

  const pairs = useMemo(
    () => (n ? pairEnglishNames(n.given, n.chars.map((c) => c.pinyin), prefs.gender, prefs.enStyle, 6) : []),
    [n, prefs.gender, prefs.enStyle],
  )

  if (!n) return null

  const read = readabilityLabel(n.readability.score)
  const romanized = toRomanized(n)
  const enSurname = prefs.englishSurname.trim()
  const fullCheck = picked && enSurname ? checkFullEnglishName(picked, romanized, enSurname) : null

  return (
    <Sheet
      open
      title="这个名字的全部依据"
      onClose={onClose}
      footer={
        <>
          <button className="btn block" onClick={onClose}>返回列表</button>
          <button
            className={favorited ? 'btn block' : 'btn primary block'}
            onClick={() => onToggleFavorite(picked)}
          >
            {favorited ? '♥ 已收藏，点此取消' : '♡ 收进心选'}
          </button>
        </>
      }
    >
      <div className="detail-hero">
        <div className="glyphs"><span className="sur">{n.surname}</span>{n.given}</div>
        <div className="py">{n.pinyin}</div>
        <div className="pills">
          <span className={`pill ${read.tone === 'good' ? 'jade' : read.tone === 'ok' ? 'mute' : 'amber'}`}>
            {read.text}
          </span>
          <span className="pill mute">共 {n.totalStrokes} 画</span>
          <span className="pill mute">五行 {[...new Set(n.elements)].join('·')}</span>
        </div>
      </div>

      <h3 style={{ margin: '18px 0 10px', fontSize: 14 }}>逐字来看</h3>
      <div className="char-rows">
        {n.chars.map((c) => (
          <div className="char-row" key={c.char}>
            <div className="big">{c.char}<small>{c.pinyin}</small></div>
            <div className="meta">
              <div className="meaning">{c.meaning}</div>
              <div className="facts">
                <span className="pill mute">{c.strokes} 画</span>
                <span className="pill mute">五行属{c.element}</span>
                <span className="pill mute">{c.tone} 声</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {n.source && (
        <>
          <h3 style={{ margin: '20px 0 8px', fontSize: 14 }}>典籍出处</h3>
          <div className="source-line" style={{ fontSize: 14 }}>
            {n.source.line}
            <span className="ref">{n.source.ref}</span>
          </div>
          <p className="field hint" style={{ marginTop: 6 }}>
            两个字都出现在这一句里，不是拼凑上去的。
          </p>
        </>
      )}

      <h3 style={{ margin: '20px 0 10px', fontSize: 14 }}>换个说法讲讲这个名字</h3>
      {aiText ? (
        <div className="note info" style={{ lineHeight: 1.8 }}>
          {aiText}
          <div style={{ marginTop: 8, fontSize: 11.5, opacity: .8 }}>
            这段由 AI 基于上面那些已经算好的资料写的，出处和字义仍以上面为准。
          </div>
        </div>
      ) : (
        <>
          <button
            className="btn block"
            disabled={ai.loading}
            onClick={async () => {
              if (!ai.ready) { onOpenAiSettings(); return }
              const t = await ai.explainName(n)
              if (t) setAiText(t)
            }}
          >
            {ai.loading ? '正在写…' : ai.ready ? '让 AI 解读一下' : '让 AI 解读一下（需要先设置）'}
          </button>
          {ai.error && (
            <div className="note danger" style={{ marginTop: 8 }}>
              {ai.error.message}{ai.error.hint ? `。${ai.error.hint}` : ''}
            </div>
          )}
        </>
      )}

      <h3 style={{ margin: '20px 0 10px', fontSize: 14 }}>在英语环境里会被怎么念</h3>
      {n.readability.issues.length === 0 && n.readability.clashes.length === 0 ? (
        <div className="note info">
          这个名字的拼音在英语里没有明显陷阱，老师和同学第一次看到大概率能念对。
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {n.readability.issues.map((i, idx) => (
            <div className={i.level === 'hard' ? 'note warn' : 'note'} key={idx}>
              <strong>{i.syllable}</strong> 常被念成{i.heardAs}。{i.note}
            </div>
          ))}
          {n.readability.clashes.map((c, idx) => (
            <div className="note danger" key={`c${idx}`}>
              <strong>{c.syllable}</strong>：{c.note}。孩子在学校可能被拿来起外号。
            </div>
          ))}
        </div>
      )}

      {n.homophones.length > 0 && (
        <>
          <h3 style={{ margin: '20px 0 10px', fontSize: 14 }}>中文谐音</h3>
          {n.homophones.map((h, i) => (
            <div className="note warn" key={i} style={{ marginBottom: 6 }}>
              「{n.full}」连读接近<strong>{h.reads}</strong>，你需要自己判断能不能接受。
            </div>
          ))}
        </>
      )}

      {n.toneNotes.length > 0 && (
        <>
          <h3 style={{ margin: '20px 0 10px', fontSize: 14 }}>连读</h3>
          {n.toneNotes.map((t, i) => <div className="note" key={i} style={{ marginBottom: 6 }}>{t}</div>)}
        </>
      )}

      {n.sameRadical && (
        <div className="note" style={{ marginTop: 12 }}>
          两个字都是「{n.sameRadical}」旁，写在一起视觉上略重复。喜欢整齐感的话这是优点，
          想要错落就换一个。
        </div>
      )}

      <h3 style={{ margin: '20px 0 10px', fontSize: 14 }}>评分是怎么来的</h3>
      <div className="score-bars">
        {n.breakdown.map((b, i) => (
          <div className="score-bar" key={i}>
            <div className="line">
              <span className="label">{b.label}</span>
              <span className={`val ${b.value > 0 ? 'up' : b.value < 0 ? 'down' : ''}`}>
                {b.value > 0 ? `+${b.value}` : b.value}
              </span>
            </div>
            <div className="detail">{b.detail}</div>
          </div>
        ))}
      </div>
      <p className="field hint" style={{ marginTop: 8 }}>
        分数只是把上面这些可核对的条目加起来，用来排序，不代表名字的好坏定论。
      </p>

      <h3 style={{ margin: '22px 0 4px', fontSize: 14 }}>配一个英文名</h3>
      <p className="field hint" style={{ marginBottom: 10 }}>
        护照上的拼音写法是 <strong>{romanized}</strong>。下面按「读音相近、含义呼应、气质一致」排序。
      </p>
      <div className="en-list">
        {pairs.map((p) => (
          <button
            key={p.name.name}
            className="en-card"
            aria-pressed={picked === p.name.name}
            onClick={() => setPicked(picked === p.name.name ? null : p.name.name)}
          >
            <div className="name-row">
              <span className="en-name">{p.name.name}</span>
              <span className="pron">/{p.name.pron}/</span>
              <span className="zh">{p.name.zhPron}</span>
            </div>
            <div className="reasons">{p.reasons.join('；')}</div>
            {p.cautions.length > 0 && <div className="cautions">留意：{p.cautions.join('；')}</div>}
          </button>
        ))}
      </div>

      {picked && (
        <div style={{ marginTop: 14 }}>
          <div className="note info">
            完整英文写法：<strong>{picked} {romanized} {enSurname || '（填了英文姓氏会更准）'}</strong>
          </div>
          {fullCheck && (
            <>
              <div className="kv" style={{ marginTop: 10 }}>
                <span className="k">首字母</span>
                <span className="v" style={{ fontWeight: 600, letterSpacing: 1 }}>{fullCheck.initials}</span>
              </div>
              {fullCheck.notes.length === 0 ? (
                <div className="note info" style={{ marginTop: 8 }}>
                  首字母缩写没有问题，全名念起来节奏也正常。
                </div>
              ) : (
                fullCheck.notes.map((note, i) => (
                  <div className={note.level === 'warn' ? 'note danger' : 'note'} key={i} style={{ marginTop: 8 }}>
                    {note.text}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      )}
    </Sheet>
  )
}
