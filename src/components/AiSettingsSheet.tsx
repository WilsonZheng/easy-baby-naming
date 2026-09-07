import { useEffect, useState } from 'react'
import { Sheet } from './Sheet'
import { DEFAULT_MODEL, listModels, RECOMMENDED_MODELS, type GroqApiModel } from '../ai/groq'

interface Props {
  open: boolean
  apiKey: string
  model: string
  onSave: (patch: { aiKey?: string; aiModel?: string }) => void
  onClose: () => void
}

export function AiSettingsSheet({ open, apiKey, model, onSave, onClose }: Props) {
  const [key, setKey] = useState(apiKey)
  const [picked, setPicked] = useState(model || DEFAULT_MODEL)
  const [extra, setExtra] = useState<GroqApiModel[]>([])
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [reveal, setReveal] = useState(false)

  useEffect(() => {
    setKey(apiKey)
    setPicked(model || DEFAULT_MODEL)
    setCheckResult(null)
  }, [apiKey, model, open])

  /** 用模型列表接口验一下 Key 通不通，顺便发现推荐列表之外的新模型 */
  const verify = async () => {
    const k = key.trim()
    if (!k) return
    setChecking(true)
    setCheckResult(null)
    try {
      const list = await listModels(k)
      const known = new Set(RECOMMENDED_MODELS.map((m) => m.id))
      setExtra(list.filter((m) => !known.has(m.id)))
      setCheckResult({ ok: true, text: `Key 可用，这个账号能访问 ${list.length} 个对话模型。` })
    } catch (e) {
      const err = e as Error & { hint?: string }
      setCheckResult({ ok: false, text: `${err.message}${err.hint ? `。${err.hint}` : ''}` })
    } finally {
      setChecking(false)
    }
  }

  return (
    <Sheet
      open={open}
      title="AI 功能设置"
      onClose={onClose}
      footer={
        <>
          <button className="btn block" onClick={onClose}>取消</button>
          <button
            className="btn primary block"
            onClick={() => { onSave({ aiKey: key.trim(), aiModel: picked }); onClose() }}
          >
            保存
          </button>
        </>
      }
    >
      <div className="note warn">
        <strong>先说清楚这件事会改变什么。</strong>
        本站其余功能全部在你的设备上运行、不联网。
        一旦开启 AI，<strong>下面这些内容会发送到 Groq</strong>：
        你在「说一句话」里写的原文、你让 AI 解读的那个名字、以及你让 AI 点评的收藏名单
        （含你写的备注）。
        <br /><br />
        出生日期、时间、城市和排出来的八字<strong>不会</strong>随这些功能发出去 ——
        除非你自己把它们写进了「说一句话」的描述里。
      </div>

      <div className="field" style={{ marginTop: 18 }}>
        <label htmlFor="ai-key">Groq API Key</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="ai-key"
            className="input"
            type={reveal ? 'text' : 'password'}
            value={key}
            placeholder="gsk_…"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => { setKey(e.target.value); setCheckResult(null) }}
          />
          <button className="btn" style={{ flex: 'none' }} onClick={() => setReveal((v) => !v)}>
            {reveal ? '隐藏' : '显示'}
          </button>
        </div>
        <div className="hint">
          去 <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer noopener">console.groq.com/keys</a> 免费创建，不需要绑卡。
        </div>
        <button
          className="btn block"
          style={{ marginTop: 10 }}
          disabled={!key.trim() || checking}
          onClick={verify}
        >
          {checking ? '正在验证…' : '验证这个 Key'}
        </button>
        {checkResult && (
          <div className={checkResult.ok ? 'note info' : 'note danger'} style={{ marginTop: 10 }}>
            {checkResult.text}
          </div>
        )}
      </div>

      <div className="note">
        Key 只保存在这台设备的浏览器里，请求从你的浏览器直接发给 Groq，
        不经过任何中间服务器，也不会写进导出的备份文件。
        但共用这台设备的人可以从浏览器里读到它 —— 不用了就去 Groq 后台删掉。
      </div>

      <div className="field" style={{ marginTop: 20 }}>
        <label htmlFor="ai-model">用哪个模型</label>
        <select id="ai-model" className="select" value={picked} onChange={(e) => setPicked(e.target.value)}>
          <optgroup label="推荐">
            {RECOMMENDED_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label} — {m.note}</option>
            ))}
          </optgroup>
          {extra.length > 0 && (
            <optgroup label="这个账号还能用的其它模型">
              {extra.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </optgroup>
          )}
        </select>
        <div className="hint">
          这个 App 从头到尾在处理中文，所以按中文能力排序：Qwen 是通义千问，中文训练量最大。
          验证 Key 之后，这里还会列出你账号能用的其它模型。
        </div>
      </div>

      <div className="note" style={{ marginTop: 10 }}>
        免费额度大致是每分钟 30 次请求、每天 1000 次，每分钟 8000 token。
        取名用不到这个量级，除非你反复点「让 AI 读一遍名单」。
      </div>

      {apiKey && (
        <button
          className="btn danger block"
          style={{ marginTop: 20 }}
          onClick={() => { setKey(''); onSave({ aiKey: '' }); onClose() }}
        >
          删除这台设备上保存的 Key
        </button>
      )}
    </Sheet>
  )
}
