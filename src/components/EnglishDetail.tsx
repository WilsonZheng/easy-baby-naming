import { Sheet } from './Sheet'
import { checkFullEnglishName } from '../engine/englishEngine'
import type { EnglishName } from '../data/englishNames'
import type { NameCandidate } from '../types'

interface Props {
  name: EnglishName | null
  matches: { candidate: NameCandidate; reasons: string[] }[]
  englishSurname: string
  favorited: boolean
  onClose: () => void
  onToggleFavorite: () => void
}

const FLAG_DETAIL: Record<string, string> = {
  spell: '拼写偏长或有多种写法，低年级同学容易写错，孩子要经常拼给别人听。',
  mis: '英语母语者也常读错，需要反复纠正。',
  nick: '很容易被简称成昵称，取之前要先接受这一点。',
  trend: '目前非常流行，同一个班里可能不止一个。',
}

const GENDER_TEXT: Record<string, string> = {
  f: '在英语国家主要用于女孩',
  m: '在英语国家主要用于男孩',
  n: '男女都在用，是中性名',
}

const STYLE_TEXT: Record<string, string> = {
  classic: '经典', nature: '自然', short: '简洁', modern: '现代',
}

export function EnglishDetail({
  name, matches, englishSurname, favorited, onClose, onToggleFavorite,
}: Props) {
  if (!name) return null

  const last = englishSurname.trim()
  const check = last ? checkFullEnglishName(name.name, '', last) : null

  return (
    <Sheet
      open
      title="这个英文名的全部依据"
      onClose={onClose}
      footer={
        <>
          <button className="btn block" onClick={onClose}>返回列表</button>
          <button className={favorited ? 'btn block' : 'btn primary block'} onClick={onToggleFavorite}>
            {favorited ? '♥ 已收藏，点此取消' : '♡ 收进心选'}
          </button>
        </>
      }
    >
      <div className="detail-hero">
        <div className="glyphs" style={{ fontFamily: 'var(--sans)', fontSize: 38, letterSpacing: 0 }}>
          {name.name}
        </div>
        <div className="py">/{name.pron}/　{name.zhPron}</div>
        <div className="pills">
          <span className="pill mute">{name.origin}名</span>
          {name.styles.map((s) => <span className="pill mute" key={s}>{STYLE_TEXT[s]}</span>)}
          {name.flags.length === 0 && <span className="pill jade">拼写和发音都稳</span>}
        </div>
      </div>

      <div className="kv-list" style={{ marginTop: 16 }}>
        <div className="kv"><span className="k">含义</span><span className="v">{name.meaning}</span></div>
        <div className="kv"><span className="k">读法</span><span className="v">重音在大写那一节：{name.pron}</span></div>
        <div className="kv"><span className="k">性别</span><span className="v">{GENDER_TEXT[name.gender]}</span></div>
      </div>

      <h3 style={{ margin: '20px 0 10px', fontSize: 14 }}>需要留意的地方</h3>
      {name.flags.length === 0 ? (
        <div className="note info">
          拼写只有一种通行写法，发音规则，没有明显的负面联想或双关。
          老师第一次看到就能念对。
        </div>
      ) : (
        name.flags.map((f) => (
          <div className="note warn" key={f} style={{ marginBottom: 6 }}>{FLAG_DETAIL[f]}</div>
        ))
      )}

      {last && check && (
        <>
          <h3 style={{ margin: '20px 0 10px', fontSize: 14 }}>配上你的英文姓氏</h3>
          <div className="note info">
            完整写法：<strong>{name.name} {last}</strong>　首字母 <strong>{check.initials}</strong>
          </div>
          {check.notes.length === 0 ? (
            <div className="note info" style={{ marginTop: 8 }}>
              首字母缩写没有问题，全名念起来节奏也正常。
            </div>
          ) : (
            check.notes.map((n, i) => (
              <div className={n.level === 'warn' ? 'note danger' : 'note'} key={i} style={{ marginTop: 8 }}>
                {n.text}
              </div>
            ))
          )}
        </>
      )}

      <h3 style={{ margin: '22px 0 4px', fontSize: 14 }}>配这些中文名</h3>
      <p className="field hint" style={{ marginBottom: 10 }}>
        按「读音贴得上、含义呼应」从当前条件下的候选里挑出来的。
      </p>
      {matches.length === 0 ? (
        <div className="note">填上姓氏之后，这里会给出配得上的中文名。</div>
      ) : (
        <div className="char-rows">
          {matches.map((m) => (
            <div className="char-row" key={m.candidate.id}>
              <div className="big" style={{ width: 66, fontSize: 24 }}>
                {m.candidate.full}
                <small>{m.candidate.pinyin}</small>
              </div>
              <div className="meta">
                <div className="meaning">{m.reasons.join('，')}</div>
                <div className="facts">
                  {m.candidate.chars.map((c) => (
                    <span className="pill mute" key={c.char}>{c.char}：{c.meaning}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  )
}
