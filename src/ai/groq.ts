/**
 * Groq 客户端。
 *
 * 换掉 OpenRouter 的原因很简单：免费档跑得太慢。Groq 用自研的 LPU 推理，
 * 同样是免费额度，首字延迟通常在几百毫秒。
 *
 * 依然是自带 Key、直连、无后端：请求从浏览器直接发到 api.groq.com。
 */
const BASE = 'https://api.groq.com/openai/v1'

export interface GroqModel {
  id: string
  label: string
  /** 为什么推荐它 */
  note: string
}

/**
 * 免费档里适合本站的对话模型。
 *
 * 这个 App 从头到尾在处理中文，所以中文能力是第一位的：
 * Qwen 是通义千问，中文训练量最大，排最前。
 * gpt-oss 的中文也够用，胜在推理更稳，适合「点评名单」这种要权衡的活。
 * compound 系列是带工具的 agent，取名用不上那些工具，但每分钟 token 额度
 * 高得多（70K vs 8K），名单很长时可以换过去。
 *
 * 免费档还有 whisper（语音转文字）、orpheus（文字转语音）、
 * prompt-guard 和 safeguard（安全分类），都不是拿来聊天的，不列。
 */
export const RECOMMENDED_MODELS: GroqModel[] = [
  { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B', note: '中文最好，默认用它' },
  { id: 'qwen/qwen3.6-27b', label: 'Qwen 3.6 27B', note: '中文同样好，上一代' },
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', note: '模型更大，权衡类任务更稳' },
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', note: '更快，够用' },
  { id: 'groq/compound', label: 'Compound', note: '每分钟 token 额度高，名单很长时用' },
  { id: 'groq/compound-mini', label: 'Compound Mini', note: 'Compound 的轻量版' },
]

export const DEFAULT_MODEL = RECOMMENDED_MODELS[0].id

/** 这些 id 一看就不是对话模型 */
const NOT_CHAT = /whisper|orpheus|tts|prompt-guard|safeguard|guard-|embed|rerank|moderation/i

export interface GroqApiModel { id: string; label: string }

/**
 * 拉取这个 Key 能用的模型。
 * 和 OpenRouter 不同，Groq 的模型列表要带鉴权，所以只能在用户填了 Key 之后拉。
 */
export async function listModels(apiKey: string, signal?: AbortSignal): Promise<GroqApiModel[]> {
  const res = await fetch(`${BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal,
  })
  if (res.status === 401) throw new GroqError('这个 API Key 不被接受', '去 console.groq.com/keys 确认一下')
  if (!res.ok) throw new GroqError(`拉取模型列表失败（HTTP ${res.status}）`)
  const json = (await res.json()) as { data?: { id: string; active?: boolean }[] }
  return (json.data ?? [])
    .filter((m) => m.active !== false && !NOT_CHAT.test(m.id))
    .map((m) => ({ id: m.id, label: m.id }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

export class GroqError extends Error {
  hint?: string
  constructor(message: string, hint?: string) {
    super(message)
    this.hint = hint
  }
}

export interface ChatOptions {
  apiKey: string
  model: string
  system: string
  user: string
  json?: boolean
  signal?: AbortSignal
}

export async function chat(opts: ChatOptions): Promise<string> {
  const { apiKey, model, system, user, json, signal } = opts

  let res: Response
  try {
    res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: json ? 0.2 : 0.7,
        max_completion_tokens: json ? 700 : 900,
        // Qwen3 这类会先输出思考过程，让 Groq 把它单独拆出去，别混进正文
        reasoning_format: 'hidden',
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
    })
  } catch {
    throw new GroqError('连不上 Groq', '检查一下网络，或者稍后再试')
  }

  if (res.status === 401) {
    throw new GroqError('这个 API Key 不被接受', '去 console.groq.com/keys 确认 key 还有效')
  }
  if (res.status === 429) {
    throw new GroqError('触发了限流', '免费档每分钟 30 次请求、每天 1000 次，等一会儿再试')
  }
  if (res.status === 413) {
    throw new GroqError('内容太长了', '收藏的名字少选几个再试')
  }
  if (!res.ok) {
    let detail = ''
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      detail = body.error?.message ?? ''
    } catch { /* 响应体不是 JSON 就算了 */ }
    throw new GroqError(`请求失败（HTTP ${res.status}）`, detail || undefined)
  }

  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
    error?: { message?: string }
  }
  if (body.error?.message) throw new GroqError(body.error.message)

  const text = body.choices?.[0]?.message?.content
  if (!text) throw new GroqError('模型没有返回内容', '换一个模型试试')
  // reasoning_format 不被支持时，思考过程会留在正文里，兜底剥掉
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

/**
 * 从模型输出里取出 JSON。
 * 即使要求了 JSON 模式，有些模型还是会包一层 ```json 或者前后带解释文字。
 */
export function extractJson<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T
    }
    throw new GroqError('模型返回的不是合法 JSON', '换一个模型通常就好了')
  }
}
