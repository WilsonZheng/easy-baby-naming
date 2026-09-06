import { useRef, useState } from 'react'
import { Sheet } from '../components/Sheet'
import { Empty } from '../components/ui'
import { buildBackup, isStorageAvailable, parseBackup, type Favorite, type HistoryEntry, type PersistedState } from '../store/storage'

interface Props {
  state: PersistedState
  onRestore: (prefsJson: string, seed: number) => void
  onClearHistory: () => void
  onClearAll: () => void
  onImport: (favorites: Favorite[], history: HistoryEntry[]) => void
}

function fmt(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function History({ state, onRestore, onClearHistory, onClearAll, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [importPreview, setImportPreview] = useState<
    { favorites: Favorite[]; history: HistoryEntry[] } | null
  >(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [confirmClearAll, setConfirmClearAll] = useState(false)

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(buildBackup(state), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `namebridge-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onFile = async (file: File) => {
    setImportError(null)
    const text = await file.text()
    const result = parseBackup(text)
    if (!result.ok) {
      setImportError(result.error)
      return
    }
    setImportPreview({ favorites: result.favorites, history: result.history })
  }

  return (
    <div className="col">
      <div className="page-head">
        <h1>历史与备份</h1>
        <div className="sub">看过的每一批都留着，随时能翻回去</div>
      </div>

      {!isStorageAvailable() && (
        <div className="note danger" style={{ marginBottom: 14 }}>
          浏览器不允许本站保存数据（可能是隐私模式）。这次的收藏和历史<strong>只在这个标签页里有效</strong>，
          关掉就没了。要留住的话请先导出备份。
        </div>
      )}

      <h2 style={{ fontSize: 14, margin: '4px 0 10px' }}>生成记录</h2>
      {state.history.length === 0 ? (
        <Empty glyph="录" title="还没有记录">
          在「取名」里每换一批条件都会自动记一笔，方便你回头对比不同方向。
        </Empty>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {state.history.map((h) => (
            <button
              key={h.id}
              className="name-card"
              style={{ padding: '12px 14px' }}
              onClick={() => onRestore(h.prefsJson, h.seed)}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600 }}>
                  {h.summary}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-3)' }}>{fmt(h.at)}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--ink-3)' }}>
                点一下，回到当时的条件重新看
              </div>
            </button>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 14, margin: '24px 0 6px' }}>备份</h2>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 12, lineHeight: 1.7 }}>
        数据只存在这台设备上。换手机、清缓存之前导出一份，就不会丢。
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" style={{ flex: 1 }} onClick={exportBackup}>导出备份</button>
        <button className="btn" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>导入备份</button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void onFile(f)
          e.target.value = ''
        }}
      />
      {importError && <div className="note danger" style={{ marginTop: 12 }}>{importError}</div>}

      <h2 style={{ fontSize: 14, margin: '24px 0 6px' }}>清理</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 30 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onClearHistory} disabled={!state.history.length}>
          只清历史
        </button>
        <button className="btn danger" style={{ flex: 1 }} onClick={() => setConfirmClearAll(true)}>
          清空全部数据
        </button>
      </div>

      <Sheet
        open={!!importPreview}
        title="确认导入"
        onClose={() => setImportPreview(null)}
        footer={
          <>
            <button className="btn block" onClick={() => setImportPreview(null)}>取消</button>
            <button
              className="btn primary block"
              onClick={() => {
                if (importPreview) onImport(importPreview.favorites, importPreview.history)
                setImportPreview(null)
              }}
            >
              合并进来
            </button>
          </>
        }
      >
        <div className="note info">
          这份备份里有 <strong>{importPreview?.favorites.length ?? 0}</strong> 个收藏、
          <strong>{importPreview?.history.length ?? 0}</strong> 条历史。
        </div>
        <p style={{ marginTop: 12, fontSize: 13.5, lineHeight: 1.75 }}>
          导入会和现有数据<strong>合并去重</strong>，不会覆盖你现在的收藏。
          相同的名字只保留一份。
        </p>
      </Sheet>

      <Sheet
        open={confirmClearAll}
        title="清空全部数据"
        onClose={() => setConfirmClearAll(false)}
        footer={
          <>
            <button className="btn block" onClick={() => setConfirmClearAll(false)}>取消</button>
            <button
              className="btn danger block"
              onClick={() => { onClearAll(); setConfirmClearAll(false) }}
            >
              我确认，全部清空
            </button>
          </>
        }
      >
        <div className="note danger">
          会删掉 {state.favorites.length} 个收藏和 {state.history.length} 条历史，无法撤销。
        </div>
        <p style={{ marginTop: 12, fontSize: 13.5, lineHeight: 1.75 }}>
          建议先点上面的「导出备份」存一份到手机里，再回来清空。
        </p>
      </Sheet>
    </div>
  )
}
