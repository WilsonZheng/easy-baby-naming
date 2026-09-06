import { useState } from 'react'
import { Sheet } from '../components/Sheet'
import { Empty } from '../components/ui'
import { buildShareUrl } from '../store/share'
import { CHAR_MAP } from '../data/characters'
import { assessReadability } from '../engine/readability'
import { ENGLISH_NAME_MAP } from '../data/englishNames'
import type { Favorite } from '../store/storage'
import type { AiState } from '../ai/useAi'

interface Props {
  favorites: Favorite[]
  compare: string[]
  onRemove: (id: string) => void
  onUpdate: (id: string, patch: Partial<Favorite>) => void
  onToggleCompare: (id: string) => void
  onClearCompare: () => void
  ai: AiState
  onOpenAiSettings: () => void
}

export function Favorites({
  favorites, compare, onRemove, onUpdate, onToggleCompare, onClearCompare, ai, onOpenAiSettings,
}: Props) {
  const [showCompare, setShowCompare] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [review, setReview] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<Favorite | null>(null)

  const picked = favorites.filter((f) => compare.includes(f.id))

  const share = () => {
    const url = buildShareUrl({
      v: 1,
      s: favorites[0]?.surname ?? '',
      n: favorites.slice(0, 20).map((f) => ({
        g: f.given,
        ...(f.englishName ? { e: f.englishName } : {}),
        ...(f.note ? { m: f.note } : {}),
      })),
    })
    setShareUrl(url)
    setCopied(false)
  }

  const copy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  if (favorites.length === 0) {
    return (
      <div className="col">
        <div className="page-head">
          <h1>心选</h1>
          <div className="sub">收起来慢慢比，随时能改主意</div>
        </div>
        <Empty glyph="心" title="还没有收藏的名字">
          在「取名」里点名字右上角的爱心就会收到这里。收藏后可以加备注、并排比较，
          还能生成一条链接发给家里的长辈看。
        </Empty>
      </div>
    )
  }

  return (
    <div className="col">
      <div className="page-head">
        <h1>心选</h1>
        <div className="sub">{favorites.length} 个名字 · 全部只存在这台设备上</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          className="btn"
          style={{ flex: 1 }}
          disabled={picked.length < 2}
          onClick={() => setShowCompare(true)}
        >
          并排比较{picked.length > 0 ? `（${picked.length}）` : ''}
        </button>
        <button className="btn" style={{ flex: 1 }} onClick={share}>生成分享链接</button>
      </div>

      <button
        className="btn block"
        style={{ marginBottom: 14 }}
        disabled={ai.loading}
        onClick={async () => {
          if (!ai.ready) { onOpenAiSettings(); return }
          setShowReview(true)
          setReview(null)
          const t = await ai.reviewFavorites(favorites)
          if (t) setReview(t)
        }}
      >
        {ai.loading ? '正在读你的名单…' : '✨ 让 AI 读一遍并给建议'}
      </button>

      {picked.length === 1 && (
        <div className="note" style={{ marginBottom: 12 }}>
          再勾选一个名字就能开始比较，最多能同时比 4 个。
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {favorites.map((f) => (
          <div className="fav-item" key={f.id}>
            <div className="head">
              <div className="glyphs"><span className="sur">{f.surname}</span>{f.given}</div>
              <div className="acts">
                <button
                  className="icon-btn"
                  aria-pressed={compare.includes(f.id)}
                  aria-label={`把 ${f.full} 加入比较`}
                  title="加入比较"
                  onClick={() => onToggleCompare(f.id)}
                >⇄</button>
                <button
                  className="icon-btn"
                  aria-label={`移除 ${f.full}`}
                  title="移除"
                  onClick={() => setConfirmRemove(f)}
                >✕</button>
              </div>
            </div>
            <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--ink-3)' }}>
              {f.pinyin}
              {f.englishName && <> · 英文名 <strong style={{ color: 'var(--ink-2)' }}>{f.englishName}</strong></>}
            </div>
            <textarea
              className="input note-input"
              placeholder="记一句你的想法：谁提的、长辈怎么说、担心什么…"
              value={f.note}
              onChange={(e) => onUpdate(f.id, { note: e.target.value })}
              aria-label={`${f.full} 的备注`}
            />
          </div>
        ))}
      </div>

      <Sheet
        open={showCompare}
        title={`并排比较 ${picked.length} 个名字`}
        onClose={() => setShowCompare(false)}
        footer={
          <>
            <button className="btn block" onClick={() => { onClearCompare(); setShowCompare(false) }}>
              清空选择
            </button>
            <button className="btn primary block" onClick={() => setShowCompare(false)}>完成</button>
          </>
        }
      >
        <div className="compare-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th />
                {picked.map((f) => <th key={f.id}>{f.surname}{f.given}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">拼音</th>
                {picked.map((f) => <td key={f.id}>{f.pinyin}</td>)}
              </tr>
              <tr>
                <th scope="row">字义</th>
                {picked.map((f) => (
                  <td key={f.id}>
                    {f.given.split('').map((c) => CHAR_MAP.get(c)?.meaning ?? c).join(' / ')}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">五行</th>
                {picked.map((f) => (
                  <td key={f.id}>
                    {[...new Set(f.given.split('').map((c) => CHAR_MAP.get(c)?.element ?? '—'))].join('·')}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">笔画</th>
                {picked.map((f) => (
                  <td key={f.id}>
                    {f.given.split('').reduce((a, c) => a + (CHAR_MAP.get(c)?.strokes ?? 0), 0)} 画
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">英语好念</th>
                {picked.map((f) => {
                  const pys = f.given.split('').map((c) => CHAR_MAP.get(c)?.pinyin ?? '')
                  const r = assessReadability(pys.filter(Boolean))
                  return <td key={f.id}>{r.score} 分{r.issues[0] ? `（${r.issues[0].syllable} 易读错）` : ''}</td>
                })}
              </tr>
              <tr>
                <th scope="row">英文名</th>
                {picked.map((f) => (
                  <td key={f.id}>
                    {f.englishName
                      ? `${f.englishName}（${ENGLISH_NAME_MAP.get(f.englishName)?.meaning ?? ''}）`
                      : '未选'}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">你的备注</th>
                {picked.map((f) => <td key={f.id}>{f.note || '—'}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </Sheet>

      <Sheet
        open={!!shareUrl}
        title="把名单发给家里人"
        onClose={() => setShareUrl(null)}
        footer={
          <>
            <button className="btn block" onClick={() => setShareUrl(null)}>关闭</button>
            <button className="btn primary block" onClick={copy}>
              {copied ? '已复制' : '复制链接'}
            </button>
          </>
        }
      >
        <div className="note info">
          整份名单直接编码在链接里，<strong>不经过任何服务器</strong>。
          对方点开就能看到，不用注册也不用装东西。
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>链接</label>
          <textarea
            className="input textarea"
            readOnly
            value={shareUrl ?? ''}
            style={{ fontSize: 12, wordBreak: 'break-all' }}
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="hint">链接会比较长，因为名单本身就在里面。微信里可以直接发。</div>
        </div>
      </Sheet>

      <Sheet
        open={showReview}
        title="AI 读了你的名单"
        onClose={() => setShowReview(false)}
        footer={<button className="btn primary block" onClick={() => setShowReview(false)}>知道了</button>}
      >
        {ai.loading && <div className="note">正在读这 {favorites.length} 个名字…免费模型有时要等十几秒。</div>}
        {ai.error && (
          <div className="note danger">
            {ai.error.message}{ai.error.hint ? `。${ai.error.hint}` : ''}
          </div>
        )}
        {review && (
          <>
            <div style={{ fontSize: 14, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{review}</div>
            <div className="note" style={{ marginTop: 16 }}>
              这段是 AI 基于本站已经算好的字义、读音、谐音资料写的。
              它给的是一个视角，不是定论 —— 名字最后是你们自己的决定。
            </div>
          </>
        )}
      </Sheet>

      <Sheet
        open={!!confirmRemove}
        title="确认移除"
        onClose={() => setConfirmRemove(null)}
        footer={
          <>
            <button className="btn block" onClick={() => setConfirmRemove(null)}>取消</button>
            <button
              className="btn danger block"
              onClick={() => {
                if (confirmRemove) onRemove(confirmRemove.id)
                setConfirmRemove(null)
              }}
            >
              移除
            </button>
          </>
        }
      >
        <p style={{ fontSize: 14, lineHeight: 1.7 }}>
          要把「{confirmRemove?.surname}{confirmRemove?.given}」从心选里移除吗？
          {confirmRemove?.note && <><br />写的备注也会一起删掉。</>}
        </p>
      </Sheet>
    </div>
  )
}
