import type { NameCandidate } from '../types'
import { readabilityLabel } from '../engine/readability'

interface Props {
  candidate: NameCandidate
  favorited: boolean
  onToggleFavorite: () => void
  onOpen: () => void
}

export function NameCard({ candidate: n, favorited, onToggleFavorite, onOpen }: Props) {
  const read = readabilityLabel(n.readability.score)
  const warn = n.homophones.find((h) => h.level === 'warn')

  return (
    <div className="name-card" onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen() }}
      aria-label={`${n.full}，点开看详细解释`}>
      <div className="top">
        <div>
          <div className="glyphs">
            <span className="sur">{n.surname}</span>{n.given}
          </div>
          <div className="py">{n.pinyin}</div>
        </div>
        <div className="top-right">
          <button
            className="fav-btn"
            aria-pressed={favorited}
            aria-label={favorited ? `取消收藏 ${n.full}` : `收藏 ${n.full}`}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
          >
            {favorited ? '♥' : '♡'}
          </button>
        </div>
      </div>

      <p className="why">{n.why}</p>

      {n.source && (
        <div className="source-line">
          {n.source.line}
          <span className="ref">{n.source.ref}</span>
        </div>
      )}

      <div className="tags">
        <span className={`pill ${read.tone === 'good' ? 'jade' : read.tone === 'ok' ? 'mute' : 'amber'}`}>
          {read.text}
        </span>
        <span className="pill mute">{n.totalStrokes} 画</span>
        <span className="pill mute">{[...new Set(n.elements)].join('·')}</span>
        {n.popularity === 'rare' && <span className="pill jade">少见用字</span>}
        {(n.popularity === 'common' || n.popularity === 'very-common') && (
          <span className="pill amber">高频用字</span>
        )}
        {warn && <span className="pill amber">谐音「{warn.reads}」</span>}
        {n.toneNotes.length > 0 && <span className="pill mute">连读需注意</span>}
      </div>
    </div>
  )
}
