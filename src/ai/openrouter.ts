/**
 * OpenRouter 客户端。
 *
 * 这是个纯静态站点，没有后端，所以 key 只能由用户自己提供、存在本机。
 * 请求从浏览器直接发到 openrouter.ai，不经过任何中间服务器 ——
 * 但这也意味着用户输入的内容会离开本机，界面里必须说清楚。
 */
const BASE = 'https://openrouter.ai/api/v1'

export interface FreeModel {
  id: string
  name: string
  contextLength: number
}

/**
 * OpenRouter 的免费模型换得很勤 —— 写这段时上一版硬编码的四个默认模型
 * 已经全部不再免费了。所以列表一律实时去拉，这份兜底只在拉不到时顶一下。
 *
 * openrouter/free 是官方的免费模型路由，会自动挑当前可用的免费模型，
 * 最抗变化，所以作为默认值。
 */
export const DEFAULT_MODEL = 'openrouter/free'

export const FALLBACK_MODELS: FreeModel[] = [
  { id: DEFAULT_MODEL, name: '自动挑一个免费模型（推荐）', contextLength: 0 },
]

/** 中文能力强的排前面 —— 这个 App 主要在处理中文 */
const CHINESE_STRONG = ['deepseek', 'qwen', 'glm', 'z-ai', 'yi-', 'minimax', 'moonshot', 'inclusionai', 'baidu', 'stepfun']

/** 这些不是用来聊天的：音乐、图像、内容安全分类、纯代码补全 */
function isChatModel(m: {
  id: string
  architecture?: { input_modalities?: string[]; output_modalities?: string[] }
}): boolean {
  const out = m.architecture?.output_modalities ?? ['text']
  const inp = m.architecture?.input_modalities ?? ['text']
  if (!out.includes('text') || !inp.includes('text')) return false
  // 输出里带音频/图像的是生成类模型，不是对话模型
  if (out.some((o) => o !== 'text')) return false
  if (/content-safety|guard|moderation|embed|rerank/i.test(m.id)) return false
  return true
}

export async function listFreeModels(signal?: AbortSignal): Promise<FreeModel[]> {
  const res = await fetch(`${BASE}/models`, { signal })
  if (!res.ok) throw new Error(`拉取模型列表失败（HTTP ${res.status}）`)
  const json = (await res.json()) as {
    data: {
      id: string
      name: string
      context_length?: number
      pricing?: { prompt?: string; completion?: string }
      architecture?: { input_modalities?: string[]; output_modalities?: string[] }
    }[]
  }
  const free = json.data
    .filter((m) => Number(m.pricing?.prompt ?? '1') === 0 && Number(m.pricing?.completion ?? '1') === 0)
    .filter(isChatModel)
    .map((m) => ({ id: m.id, name: m.name, contextLength: m.context_length ?? 0 }))

  free.sort((a, b) => {
    // 官方路由永远排第一，其次是中文强的
    const rank = (id: string) =>
      id === DEFAULT_MODEL ? -1 : CHINESE_STRONG.some((k) => id.includes(k)) ? 0 : 1
    return rank(a.id) - rank(b.id) || a.name.localeCompare(b.name)
  })
  return free
}

export interface ChatOptions {
  apiKey: string
  model: string
  system: string
  user: string
  /** 要求模型只输出 JSON */
  json?: boolean
  signal?: AbortSignal
}

export class OpenRouterError extends Error {
  hint?: string
  constructor(message: string, hint?: string) {
    super(message)
    this.hint = hint
  }
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
        // OpenRouter 用这两个头做用量归属，不含任何个人信息
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Namebridge',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: json ? 0.2 : 0.7,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
    })
  } catch {
    throw new OpenRouterError('连不上 OpenRouter', '检查一下网络，或者稍后再试')
  }

  if (res.status === 401) {
    throw new OpenRouterError('这个 API Key 不被接受', '去 openrouter.ai/keys 确认 key 还有效')
  }
  if (res.status === 402) {
    throw new OpenRouterError('额度不够了', '免费模型也有每日额度，等一会儿或换一个模型')
  }
  if (res.status === 429) {
    throw new OpenRouterError('请求太频繁', '免费模型限流比较严，等几十秒再试')
  }
  if (!res.ok) {
    let detail = ''
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      detail = body.error?.message ?? ''
    } catch { /* 响应体不是 JSON 就算了 */ }
    throw new OpenRouterError(`请求失败（HTTP ${res.status}）`, detail || undefined)
  }

  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
    error?: { message?: string }
  }
  if (body.error?.message) throw new OpenRouterError(body.error.message)

  const text = body.choices?.[0]?.message?.content
  if (!text) throw new OpenRouterError('模型没有返回内容', '换一个模型试试')
  return text
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
    throw new OpenRouterError('模型返回的不是合法 JSON', '换一个模型通常就好了')
  }
}
