/**
 * 分享链接。
 *
 * 没有后端，所以整份名单直接编码进 URL 的 hash 里。
 * 这样国内的长辈点开链接就能看到候选名单，不需要注册、不需要装 App，
 * 数据也不会经过任何服务器。
 */
export interface SharePayload {
  v: 1
  /** 姓 */
  s: string
  /** 名单：中文名 + 可选英文名 + 可选备注 */
  n: { g: string; e?: string; m?: string }[]
  /** 分享者留言 */
  t?: string
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : ''
  const bin = atob(b64 + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function encodeShare(payload: SharePayload): string {
  const json = JSON.stringify(payload)
  return toBase64Url(new TextEncoder().encode(json))
}

export function decodeShare(code: string): SharePayload | null {
  try {
    const json = new TextDecoder().decode(fromBase64Url(code))
    const data = JSON.parse(json) as SharePayload
    if (data.v !== 1 || typeof data.s !== 'string' || !Array.isArray(data.n)) return null
    return data
  } catch {
    return null
  }
}

export function buildShareUrl(payload: SharePayload): string {
  const base = window.location.origin + window.location.pathname
  return `${base}#/share/${encodeShare(payload)}`
}
