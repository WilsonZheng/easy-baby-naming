import { useCallback, useEffect, useMemo, useState } from 'react'
import './styles/components.css'
import { Studio } from './pages/Studio'
import { Favorites } from './pages/Favorites'
import { History } from './pages/History'
import { Guide } from './pages/Guide'
import { SharedView } from './pages/SharedView'
import { useAppState } from './store/useAppState'
import { useAi } from './ai/useAi'
import { AiSettingsSheet } from './components/AiSettingsSheet'
import { decodeShare, type SharePayload } from './store/share'
import { DEFAULT_PREFS, type Prefs } from './types'

type Tab = 'studio' | 'favorites' | 'history' | 'guide'

const TABS: { id: Tab; label: string; glyph: string }[] = [
  { id: 'studio', label: '取名', glyph: '名' },
  { id: 'favorites', label: '心选', glyph: '心' },
  { id: 'history', label: '历史', glyph: '录' },
  { id: 'guide', label: '指南', glyph: '书' },
]

function readShareFromHash(): SharePayload | null {
  const m = window.location.hash.match(/^#\/share\/(.+)$/)
  return m ? decodeShare(m[1]) : null
}

export default function App() {
  const {
    state, toggleFavorite, removeFavorite, updateFavorite,
    toggleCompare, clearCompare, pushHistory, clearHistory, clearAll,
    setTheme, setLastPrefs, importData, setAi,
  } = useAppState()

  const [tab, setTab] = useState<Tab>('studio')
  const [openAiSettings, setOpenAiSettings] = useState(false)
  const ai = useAi(state.aiKey, state.aiModel)
  const [shared, setShared] = useState<SharePayload | null>(() => readShareFromHash())
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try {
      const raw = state.lastPrefsJson
      return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS
    } catch {
      return DEFAULT_PREFS
    }
  })

  useEffect(() => {
    const onHash = () => setShared(readShareFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // 主题跟随系统，也允许手动覆盖
  useEffect(() => {
    const root = document.documentElement
    if (state.theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', state.theme)
  }, [state.theme])

  const updatePrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefs((cur) => ({ ...cur, ...patch }))
  }, [])

  // 持久化放在 effect 里。setState 的 updater 必须是纯函数，
  // 在里面写 store 会在渲染过程中触发另一个组件更新。
  useEffect(() => {
    setLastPrefs(JSON.stringify(prefs))
  }, [prefs, setLastPrefs])

  const onGenerated = useCallback((summary: string, seed: number) => {
    pushHistory({
      // 用随机 id，不要拿摘要拼 —— 同样的条件会撞出重复 key
      id:
        globalThis.crypto?.randomUUID?.() ??
        `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
      at: Date.now(),
      surname: prefs.surname,
      summary,
      prefsJson: JSON.stringify(prefs),
      seed,
    })
  }, [prefs, pushHistory])

  const restore = useCallback((prefsJson: string) => {
    try {
      setPrefs({ ...DEFAULT_PREFS, ...(JSON.parse(prefsJson) as Partial<Prefs>) })
      setTab('studio')
      window.scrollTo({ top: 0 })
    } catch {
      // 记录损坏就忽略，不影响其它数据
    }
  }, [])

  const exitShare = useCallback(() => {
    window.location.hash = ''
    setShared(null)
  }, [])

  const themeLabel = useMemo(
    () => (state.theme === 'dark' ? '深色' : state.theme === 'light' ? '浅色' : '跟随系统'),
    [state.theme],
  )

  if (shared) {
    return (
      <div className="app">
        <main className="app-main" style={{ paddingBottom: 24 }}>
          <SharedView payload={shared} onExit={exitShare} />
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <main className="app-main">
        {tab === 'studio' && (
          <Studio
            prefs={prefs}
            onPrefsChange={updatePrefs}
            favorites={state.favorites}
            onToggleFavorite={toggleFavorite}
            onGenerated={onGenerated}
            ai={ai}
            onOpenAiSettings={() => setOpenAiSettings(true)}
          />
        )}

        {tab === 'favorites' && (
          <Favorites
            favorites={state.favorites}
            compare={state.compare}
            onRemove={removeFavorite}
            onUpdate={updateFavorite}
            onToggleCompare={toggleCompare}
            onClearCompare={clearCompare}
            ai={ai}
            onOpenAiSettings={() => setOpenAiSettings(true)}
          />
        )}

        {tab === 'history' && (
          <History
            state={state}
            onRestore={restore}
            onClearHistory={clearHistory}
            onClearAll={clearAll}
            onImport={importData}
          />
        )}

        {tab === 'guide' && (
          <>
            <Guide />
            <div className="col" style={{ paddingBottom: 32 }}>
              <div className="switch-row" style={{ borderTop: '1px solid var(--line)' }}>
                <div>
                  <div className="label">AI 功能</div>
                  <div className="desc">
                    {state.aiKey ? `已连上 OpenRouter · ${state.aiModel.split('/').pop()}` : '未开启，本站完全离线运行'}
                  </div>
                </div>
                <button className="chip sm" onClick={() => setOpenAiSettings(true)}>
                  {state.aiKey ? '修改' : '开启'}
                </button>
              </div>
              <div className="switch-row">
                <div>
                  <div className="label">外观</div>
                  <div className="desc">现在是{themeLabel}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['system', 'light', 'dark'] as const).map((t) => (
                    <button
                      key={t}
                      className="chip sm"
                      aria-pressed={state.theme === t}
                      onClick={() => setTheme(t)}
                    >
                      {t === 'system' ? '自动' : t === 'light' ? '浅色' : '深色'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <nav className="tabbar" aria-label="主导航">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); window.scrollTo({ top: 0 }) }}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            <span className="glyph" aria-hidden="true">{t.glyph}</span>
            <span>{t.label}</span>
            {t.id === 'favorites' && state.favorites.length > 0 && (
              <span className="badge-dot">{state.favorites.length}</span>
            )}
          </button>
        ))}
      </nav>

      <AiSettingsSheet
        open={openAiSettings}
        apiKey={state.aiKey}
        model={state.aiModel}
        onSave={setAi}
        onClose={() => setOpenAiSettings(false)}
      />
    </div>
  )
}
