import { useCallback, useSyncExternalStore } from 'react'
import {
  EMPTY_STATE, loadState, saveState,
  type Favorite, type HistoryEntry, type PersistedState,
} from './storage'

let state: PersistedState = EMPTY_STATE
let loaded = false
const listeners = new Set<() => void>()

function ensureLoaded() {
  if (!loaded) {
    state = loadState()
    loaded = true
  }
}

function emit() {
  for (const l of listeners) l()
}

function set(updater: (s: PersistedState) => PersistedState) {
  ensureLoaded()
  state = updater(state)
  saveState(state)
  emit()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot(): PersistedState {
  ensureLoaded()
  return state
}

/** 仅供测试使用：store 是模块级单例，清空 localStorage 不会让它重新加载。 */
export function resetAppStateForTests() {
  state = EMPTY_STATE
  loaded = false
  emit()
}

export function useAppState() {
  const s = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_STATE)

  const addFavorite = useCallback((fav: Favorite) => {
    set((cur) =>
      cur.favorites.some((f) => f.id === fav.id)
        ? cur
        : { ...cur, favorites: [fav, ...cur.favorites] },
    )
  }, [])

  const removeFavorite = useCallback((id: string) => {
    set((cur) => ({
      ...cur,
      favorites: cur.favorites.filter((f) => f.id !== id),
      compare: cur.compare.filter((c) => c !== id),
    }))
  }, [])

  const toggleFavorite = useCallback((fav: Favorite) => {
    set((cur) =>
      cur.favorites.some((f) => f.id === fav.id)
        ? {
            ...cur,
            favorites: cur.favorites.filter((f) => f.id !== fav.id),
            compare: cur.compare.filter((c) => c !== fav.id),
          }
        : { ...cur, favorites: [fav, ...cur.favorites] },
    )
  }, [])

  const updateFavorite = useCallback((id: string, patch: Partial<Favorite>) => {
    set((cur) => ({
      ...cur,
      favorites: cur.favorites.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }))
  }, [])

  const toggleCompare = useCallback((id: string) => {
    set((cur) => {
      if (cur.compare.includes(id)) return { ...cur, compare: cur.compare.filter((c) => c !== id) }
      if (cur.compare.length >= 4) return cur
      return { ...cur, compare: [...cur.compare, id] }
    })
  }, [])

  const clearCompare = useCallback(() => set((cur) => ({ ...cur, compare: [] })), [])

  /**
   * 历史记录的是「试过哪些条件」，不是「刷新过几次」。
   * 条件没变时只把已有那条提到最前并更新时间，不再新增一行。
   */
  const pushHistory = useCallback((entry: HistoryEntry) => {
    set((cur) => {
      const existing = cur.history.find((h) => h.summary === entry.summary)
      const rest = cur.history.filter((h) => h.summary !== entry.summary)
      const merged = existing ? { ...existing, at: entry.at, seed: entry.seed, prefsJson: entry.prefsJson } : entry
      return { ...cur, history: [merged, ...rest].slice(0, 40) }
    })
  }, [])

  const clearHistory = useCallback(() => set((cur) => ({ ...cur, history: [] })), [])

  const clearAll = useCallback(() => set(() => ({ ...EMPTY_STATE })), [])

  const setTheme = useCallback((theme: PersistedState['theme']) => {
    set((cur) => ({ ...cur, theme }))
  }, [])

  const setLastPrefs = useCallback((json: string) => {
    set((cur) => ({ ...cur, lastPrefsJson: json }))
  }, [])

  const markGuideSeen = useCallback(() => set((cur) => ({ ...cur, seenGuide: true })), [])

  const setAi = useCallback((patch: { aiKey?: string; aiModel?: string }) => {
    set((cur) => ({ ...cur, ...patch }))
  }, [])

  const importData = useCallback((favorites: Favorite[], history: HistoryEntry[]) => {
    set((cur) => {
      const map = new Map(cur.favorites.map((f) => [f.id, f]))
      for (const f of favorites) if (!map.has(f.id)) map.set(f.id, f)
      const hMap = new Map(cur.history.map((h) => [h.id, h]))
      for (const h of history) if (!hMap.has(h.id)) hMap.set(h.id, h)
      return {
        ...cur,
        favorites: [...map.values()].sort((a, b) => b.addedAt - a.addedAt),
        history: [...hMap.values()].sort((a, b) => b.at - a.at).slice(0, 60),
      }
    })
  }, [])

  return {
    state: s,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    updateFavorite,
    toggleCompare,
    clearCompare,
    pushHistory,
    clearHistory,
    clearAll,
    setTheme,
    setLastPrefs,
    markGuideSeen,
    importData,
    setAi,
  }
}
