import { useState } from 'react'
import { Sheet } from './Sheet'
import { validateIntent, type AppliedChange } from '../ai/applyIntent'
import type { AiState } from '../ai/useAi'
import type { Prefs } from '../types'

interface Props {
  open: boolean
  ai: AiState
  onApply: (patch: Partial<Prefs>) => void
  onClose: () => void
  onOpenSettings: () => void
}

const EXAMPLES = [
  '我们姓陈，想要个女孩名，有山水的意境，别太常见',
  '男孩，姓林，希望有点书卷气，将来在美国上学老外好念',
  '姓王，中性一点的名字，笔画少一些方便孩子写',
  '想先定英文名，经典一点的，然后配个中文名',
]

export function AiAskSheet({ open, ai, onApply, onClose, onOpenSettings }: Props) {
  const [text, setText] = useState('')
  const [result, setResult] = useState<{ changes: AppliedChange[]; ignored: string[]; explain: string; patch: Partial<Prefs> } | null>(null)

  const submit = async () => {
    if (!text.trim()) return
    setResult(null)
    const raw = await ai.askIntent(text)
    if (!raw) return
    const { patch, changes, ignored } = validateIntent(raw)
    setResult({ patch, changes, ignored, explain: String(raw.explain ?? '') })
  }

  const close = () => { setResult(null); onClose() }

  return (
    <Sheet
      open={open}
      title="说说你想要什么样的名字"
      onClose={close}
      footer={
        result
          ? (
            <>
              <button className="btn block" onClick={() => setResult(null)}>重新说</button>
              <button
                className="btn primary block"
                disabled={result.changes.length === 0}
                onClick={() => { onApply(result.patch); close() }}
              >
                套用这些条件
              </button>
            </>
          )
          : (
            <>
              <button className="btn block" onClick={close}>取消</button>
              <button className="btn primary block" disabled={!text.trim() || ai.loading} onClick={submit}>
                {ai.loading ? '正在理解…' : '让 AI 帮我设条件'}
              </button>
            </>
          )
      }
    >
      {!ai.ready ? (
        <>
          <div className="note info">
            这个功能需要一个 OpenRouter 的 API Key（免费模型不用充值）。
            设好之后，你用一句话描述想要什么样的名字，AI 会把它翻译成本站的筛选条件。
          </div>
          <button className="btn primary block" style={{ marginTop: 14 }} onClick={onOpenSettings}>
            去设置
          </button>
        </>
      ) : (
        <>
          <div className="field">
            <label htmlFor="ai-ask">用一句话说就行</label>
            <textarea
              id="ai-ask"
              className="input textarea"
              value={text}
              placeholder="比如：我们姓陈，想给女儿取个有山水意境的名字，别太常见，将来在新西兰上学好念一点"
              onChange={(e) => setText(e.target.value)}
            />
            <div className="hint">
              AI 只负责把这句话翻译成筛选条件，名字本身仍然由本地引擎生成 ——
              所以每个名字的字义、出处、谐音判断都还是可核对的。
            </div>
          </div>

          {!result && !ai.loading && (
            <>
              <div className="section-title"><h2>可以这样说</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {EXAMPLES.map((e) => (
                  <button key={e} className="btn sm" style={{ justifyContent: 'flex-start', textAlign: 'left', height: 'auto', padding: '9px 11px', lineHeight: 1.5 }}
                    onClick={() => setText(e)}>
                    {e}
                  </button>
                ))}
              </div>
            </>
          )}

          {ai.error && (
            <div className="note danger" style={{ marginTop: 12 }}>
              {ai.error.message}{ai.error.hint ? `。${ai.error.hint}` : ''}
            </div>
          )}

          {result && (
            <div style={{ marginTop: 16 }}>
              {result.explain && <div className="note info">{result.explain}</div>}

              <h3 style={{ margin: '16px 0 10px', fontSize: 14 }}>会改成这些条件</h3>
              {result.changes.length === 0 ? (
                <div className="note warn">
                  没能从这句话里提取出可用的条件。换个说法试试，
                  比如明确说出姓氏、男孩还是女孩、想要什么气质。
                </div>
              ) : (
                <div className="kv-list">
                  {result.changes.map((c) => (
                    <div className="kv" key={c.field}>
                      <span className="k">{c.label}</span>
                      <span className="v" style={{ fontWeight: 600 }}>{c.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {result.ignored.length > 0 && (
                <div className="note warn" style={{ marginTop: 12 }}>
                  AI 还给了这些，但值不合法，已经丢掉：{result.ignored.join('、')}。
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Sheet>
  )
}
