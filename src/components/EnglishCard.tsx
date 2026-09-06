import type { EnglishName } from '../data/englishNames'
import type { NameCandidate } from '../types'

interface Props {
  name: EnglishName
  /** 和这个英文名最搭的几个中文名 */
  matches: { candidate: NameCandidate; reasons: string[] }[]
  favorited: boolean
  onToggleFavorite: () => void
  onOpen: () => void
}

const FLAG_TEXT: Record<string, string> = {
  spell: '拼写容易写错',
  mis: '母语者也常读错',
  nick: '容易被叫成昵称',
  trend: '当下非常流行',
}

const GENDER_TEXT: Record<string, string> = { f: '偏女', m: '偏男', n: '中性' }

export function EnglishCard({ name, matches, favorited, onToggleFavorite, onOpen }: Props) {
  return (
    <div className="name-card" role="button" tabIndex={0} onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen() }}
      aria-label={`${name.name}，点开看详细解释`}>
      <div className="top">
        <div>
          <div className="glyphs en-title">{name.name}</div>
          <div className="py">/{name.pron}/　{name.zhPron}</div>
        </div>
        <div className="top-right">
          <button
            className="fav-btn"
            aria-pressed={favorited}
            aria-label={favorited ? `取消收藏 ${name.name}` : `收藏 ${name.name}`}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
          >
            {favorited ? '♥' : '♡'}
          </button>
        </div>
      </div>

      <p className="why">{name.meaning}　·　{name.origin}名</p>

      {matches.length > 0 && (
        <div className="zh-matches">
          <div className="zh-matches-cap">配这些中文名</div>
          {matches.map((m) => (
            <div className="zh-match" key={m.candidate.id}>
              <span className="zh-name">{m.candidate.full}</span>
              <span className="zh-py">{m.candidate.pinyin}</span>
              <span className="zh-why">{m.reasons[0]}</span>
            </div>
          ))}
        </div>
      )}

      <div className="tags">
        <span className="pill mute">{GENDER_TEXT[name.gender]}</span>
        {name.flags.length === 0 && <span className="pill jade">拼写和发音都稳</span>}
        {name.flags.map((f) => (
          <span className="pill amber" key={f}>{FLAG_TEXT[f]}</span>
        ))}
      </div>
    </div>
  )
}
