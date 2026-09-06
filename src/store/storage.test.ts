import { describe, expect, it } from 'vitest'
import { buildBackup, EMPTY_STATE, mergeFavorites, parseBackup, type Favorite } from './storage'
import { buildShareUrl, decodeShare, encodeShare, type SharePayload } from './share'

function fav(id: string, given = '和之'): Favorite {
  return {
    id, full: '林' + given, given, surname: '林', pinyin: 'lín hé zhī',
    englishName: null, note: '', score: 88, addedAt: Date.now(),
  }
}

describe('备份导出与导入', () => {
  it('导出的结构能被自己解析回来', () => {
    const state = { ...EMPTY_STATE, favorites: [fav('a'), fav('b', '清和')] }
    const text = JSON.stringify(buildBackup(state))
    const result = parseBackup(text)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.favorites).toHaveLength(2)
  })

  it('坏 JSON 给出可读的错误，而不是抛异常', () => {
    const r = parseBackup('{ 这不是 json')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('JSON')
  })

  it('不是本站的备份会被拒绝', () => {
    const r = parseBackup(JSON.stringify({ app: 'other', version: 1, favorites: [], history: [] }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('名渡')
  })

  it('版本不认识时说清楚是哪个版本', () => {
    const r = parseBackup(JSON.stringify({ app: 'namebridge', version: 9, favorites: [], history: [] }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('9')
  })

  it('缺字段时不当成空数据默默通过', () => {
    const r = parseBackup(JSON.stringify({ app: 'namebridge', version: 1 }))
    expect(r.ok).toBe(false)
  })

  it('导入是合并去重，不覆盖已有收藏', () => {
    const current = [fav('a'), fav('b', '清和')]
    const incoming = [fav('b', '清和'), fav('c', '予安')]
    const merged = mergeFavorites(current, incoming)
    expect(merged).toHaveLength(3)
    expect(new Set(merged.map((f) => f.id))).toEqual(new Set(['a', 'b', 'c']))
  })
})

describe('分享链接', () => {
  const payload: SharePayload = {
    v: 1, s: '陈',
    n: [{ g: '嘉禾' }, { g: '泠帆', e: 'Liam' }, { g: '瑜白', m: '奶奶最喜欢这个' }],
  }

  it('编码后能原样解回来', () => {
    expect(decodeShare(encodeShare(payload))).toEqual(payload)
  })

  it('中文和备注不会在 base64 往返中损坏', () => {
    const decoded = decodeShare(encodeShare(payload))
    expect(decoded?.n[2].m).toBe('奶奶最喜欢这个')
    expect(decoded?.s).toBe('陈')
  })

  it('编码结果是 URL 安全的，没有 + / = ', () => {
    expect(encodeShare(payload)).not.toMatch(/[+/=]/)
  })

  it('乱码不会让页面崩，只返回 null', () => {
    expect(decodeShare('这不是合法的编码!!!')).toBeNull()
    expect(decodeShare('')).toBeNull()
    expect(decodeShare(encodeShare({ ...payload, v: 2 as unknown as 1 }))).toBeNull()
  })

  it('生成的链接带 #/share/ 前缀', () => {
    expect(buildShareUrl(payload)).toContain('#/share/')
  })

  it('二十个名字的链接仍在常见的 URL 长度限制内', () => {
    const many: SharePayload = {
      v: 1, s: '欧阳',
      n: Array.from({ length: 20 }, (_, i) => ({ g: `清和${i}`, e: 'Oliver', m: '一句备注' })),
    }
    expect(encodeShare(many).length).toBeLessThan(2000)
  })
})
