import { CHAR_MAP } from '../data/characters'
import { ENGLISH_NAME_MAP } from '../data/englishNames'
import { assessReadability } from '../engine/readability'
import type { SharePayload } from '../store/share'

interface Props {
  payload: SharePayload
  onExit: () => void
}

/** 家里人点开分享链接看到的只读页面。 */
export function SharedView({ payload, onExit }: Props) {
  return (
    <div className="col">
      <div className="page-head">
        <h1>候选名单</h1>
        <div className="sub">
          有人把 {payload.n.length} 个名字分享给你看 · 这个页面是只读的
        </div>
      </div>

      <div className="note info" style={{ marginBottom: 16 }}>
        整份名单就编码在链接里，没有经过任何服务器。你看到的和对方看到的完全一样。
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {payload.n.map((item, i) => {
          const chars = item.g.split('')
          const pys = chars.map((c) => CHAR_MAP.get(c)?.pinyin).filter(Boolean) as string[]
          const read = pys.length ? assessReadability(pys) : null
          const en = item.e ? ENGLISH_NAME_MAP.get(item.e) : undefined
          return (
            <div className="fav-item" key={`${item.g}-${i}`}>
              <div className="head">
                <div className="glyphs">
                  <span className="sur">{payload.s}</span>{item.g}
                </div>
              </div>
              {pys.length > 0 && (
                <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--ink-3)' }}>
                  {pys.join(' ')}
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7 }}>
                {chars.map((c) => {
                  const e = CHAR_MAP.get(c)
                  return e ? `${c}：${e.meaning}` : null
                }).filter(Boolean).join('　')}
              </div>
              <div className="tags" style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {en && <span className="pill jade">英文名 {en.name}</span>}
                {read && <span className="pill mute">英语好念 {read.score} 分</span>}
              </div>
              {item.m && (
                <div className="note" style={{ marginTop: 10 }}>{item.m}</div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ margin: '22px 0 32px' }}>
        <button className="btn primary block" onClick={onExit}>
          我也来给宝宝取个名
        </button>
      </div>
    </div>
  )
}
