import { useEffect, useState } from 'react'
import { Sheet } from './Sheet'
import { FALLBACK_MODELS, listFreeModels, type FreeModel } from '../ai/openrouter'

interface Props {
  open: boolean
  apiKey: string
  model: string
  onSave: (patch: { aiKey?: string; aiModel?: string }) => void
  onClose: () => void
}

export function AiSettingsSheet({ open, apiKey, model, onSave, onClose }: Props) {
  const [key, setKey] = useState(apiKey)
  const [picked, setPicked] = useState(model)
  const [models, setModels] = useState<FreeModel[]>(FALLBACK_MODELS)
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const [reveal, setReveal] = useState(false)

  useEffect(() => { setKey(apiKey); setPicked(model) }, [apiKey, model, open])

  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    setLoadingModels(true)
    setModelError(null)
    listFreeModels(ctrl.signal)
      .then((list) => {
        if (!list.length) return
        setModels(list)
        // 上次选的模型可能已经不免费了 —— 这在 OpenRouter 上很常见
        setPicked((cur) => (list.some((m) => m.id === cur) ? cur : list[0].id))
      })
      .catch((e: Error) => { if (e.name !== 'AbortError') setModelError('拉不到最新的免费模型列表，先用内置的这几个') })
      .finally(() => setLoadingModels(false))
    return () => ctrl.abort()
  }, [open])

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
        一旦开启 AI，<strong>下面这些内容会发送到 OpenRouter 和你选的模型提供商</strong>：
        你在「说一句话」里写的原文、你让 AI 解读的那个名字、以及你让 AI 点评的收藏名单
        （含你写的备注）。
        <br /><br />
        出生日期、时间、城市和排出来的八字<strong>不会</strong>随这些功能发出去 ——
        除非你自己把它们写进了「说一句话」的描述里。
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label htmlFor="ai-key">OpenRouter API Key</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="ai-key"
            className="input"
            type={reveal ? 'text' : 'password'}
            value={key}
            placeholder="sk-or-v1-…"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setKey(e.target.value)}
          />
          <button className="btn" style={{ flex: 'none' }} onClick={() => setReveal((v) => !v)}>
            {reveal ? '隐藏' : '显示'}
          </button>
        </div>
        <div className="hint">
          去 <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer noopener">openrouter.ai/keys</a> 免费注册一个。
          用免费模型不需要充值。
        </div>
      </div>

      <div className="note">
        Key 只保存在这台设备的浏览器里，请求从你的浏览器直接发给 OpenRouter，
        不经过任何中间服务器，也不会写进导出的备份文件。
        但共用这台设备的人可以从浏览器里读到它 —— 建议单独建一个 key，
        不用了就去 OpenRouter 后台删掉。
      </div>

      <div className="field" style={{ marginTop: 18 }}>
        <label htmlFor="ai-model">用哪个模型</label>
        <select
          id="ai-model"
          className="select"
          value={picked}
          onChange={(e) => setPicked(e.target.value)}
        >
          {!models.some((m) => m.id === picked) && (
            <option value={picked}>{picked}（已不在免费列表里）</option>
          )}
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <div className="hint">
          {loadingModels
            ? '正在拉取 OpenRouter 上现在免费的模型…'
            : `列表里是 ${models.length} 个当前免费的对话模型，中文能力强的排在前面。免费名单变动很勤，所以每次打开都重新拉取。`}
        </div>
        {modelError && <div className="err">{modelError}</div>}
      </div>

      <div className="note" style={{ marginTop: 8 }}>
        免费模型有每日额度和限流，遇到「请求太频繁」等一会儿再试，或者换一个模型。
      </div>

      {apiKey && (
        <button
          className="btn danger block"
          style={{ marginTop: 18 }}
          onClick={() => { setKey(''); onSave({ aiKey: '' }); onClose() }}
        >
          删除这台设备上保存的 Key
        </button>
      )}
    </Sheet>
  )
}
