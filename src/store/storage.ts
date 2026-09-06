import { DEFAULT_MODEL } from '../ai/openrouter'

/**
 * 全部数据只存在这台设备的 localStorage 里，不上传任何服务器。
 * localStorage 不可用时（隐私模式、被浏览器限制）自动退化成仅本次会话有效，
 * 并且要让用户看到这件事，而不是静默丢数据。
 */
const KEY = 'namebridge.v1'

export interface Favorite {
  id: string
  full: string
  given: string
  surname: string
  pinyin: string
  englishName: string | null
  note: string
  score: number
  addedAt: number
}

export interface HistoryEntry {
  id: string
  at: number
  surname: string
  summary: string
  prefsJson: string
  seed: number
}

export interface PersistedState {
  version: 1
  favorites: Favorite[]
  history: HistoryEntry[]
  compare: string[]
  lastPrefsJson: string | null
  theme: 'light' | 'dark' | 'system'
  seenGuide: boolean
  /**
   * OpenRouter 的 API Key。只存在这台设备的浏览器里，请求直接发往 openrouter.ai。
   * 备份导出时会剔掉，免得 key 跟着文件到处跑。
   */
  aiKey: string
  aiModel: string
}

export const EMPTY_STATE: PersistedState = {
  version: 1,
  favorites: [],
  history: [],
  compare: [],
  lastPrefsJson: null,
  theme: 'system',
  seenGuide: false,
  aiKey: '',
  aiModel: DEFAULT_MODEL,
}

let storageWorks = true

export function isStorageAvailable(): boolean {
  return storageWorks
}

function probe(): Storage | null {
  try {
    const s = window.localStorage
    const probeKey = '__nb_probe__'
    s.setItem(probeKey, '1')
    s.removeItem(probeKey)
    return s
  } catch {
    storageWorks = false
    return null
  }
}

export function loadState(): PersistedState {
  const s = probe()
  if (!s) return { ...EMPTY_STATE }
  try {
    const raw = s.getItem(KEY)
    if (!raw) return { ...EMPTY_STATE }
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    // 防御性去重：早期版本写进去的数据可能有重复 id
    const dedupe = <T extends { id: string }>(xs: unknown): T[] => {
      if (!Array.isArray(xs)) return []
      const seen = new Set<string>()
      return (xs as T[]).filter((x) => {
        if (!x || typeof x.id !== 'string' || seen.has(x.id)) return false
        seen.add(x.id)
        return true
      })
    }
    return {
      ...EMPTY_STATE,
      ...parsed,
      favorites: dedupe<Favorite>(parsed.favorites),
      history: dedupe<HistoryEntry>(parsed.history),
      compare: Array.isArray(parsed.compare) ? [...new Set(parsed.compare)] : [],
    }
  } catch {
    return { ...EMPTY_STATE }
  }
}

export function saveState(state: PersistedState): void {
  const s = probe()
  if (!s) return
  try {
    s.setItem(KEY, JSON.stringify(state))
  } catch {
    storageWorks = false
  }
}

/** 导出的备份文件结构，带版本号，导入时会校验。 */
export interface BackupFile {
  app: 'namebridge'
  version: 1
  exportedAt: string
  favorites: Favorite[]
  history: HistoryEntry[]
}

/** 备份里刻意不含 API Key —— 备份文件会被到处传，key 不该跟着走。 */
export function buildBackup(state: PersistedState): BackupFile {
  return {
    app: 'namebridge',
    version: 1,
    exportedAt: new Date().toISOString(),
    favorites: state.favorites,
    history: state.history,
  }
}

export type ImportResult =
  | { ok: true; favorites: Favorite[]; history: HistoryEntry[] }
  | { ok: false; error: string }

export function parseBackup(text: string): ImportResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: '这个文件不是合法的 JSON，可能在传输中损坏了' }
  }
  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: '文件内容不是一个对象' }
  }
  const d = data as Partial<BackupFile>
  if (d.app !== 'namebridge') {
    return { ok: false, error: '这不是名渡导出的备份文件' }
  }
  if (d.version !== 1) {
    return { ok: false, error: `备份版本是 ${String(d.version)}，当前版本只认得 1` }
  }
  if (!Array.isArray(d.favorites) || !Array.isArray(d.history)) {
    return { ok: false, error: '备份里缺少收藏或历史记录字段' }
  }
  const favorites = d.favorites.filter(
    (f): f is Favorite => !!f && typeof f.id === 'string' && typeof f.full === 'string',
  )
  const history = d.history.filter(
    (h): h is HistoryEntry => !!h && typeof h.id === 'string' && typeof h.at === 'number',
  )
  return { ok: true, favorites, history }
}

/** 合并去重，不静默覆盖已有数据。 */
export function mergeFavorites(current: Favorite[], incoming: Favorite[]): Favorite[] {
  const map = new Map(current.map((f) => [f.id, f]))
  for (const f of incoming) if (!map.has(f.id)) map.set(f.id, f)
  return [...map.values()].sort((a, b) => b.addedAt - a.addedAt)
}
