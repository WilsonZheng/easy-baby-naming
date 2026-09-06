/**
 * 把模型返回的筛选条件校验后应用到偏好上。
 *
 * 模型的输出一律当作不可信输入：逐字段白名单校验，任何不认识的值直接丢弃，
 * 绝不因为「模型说了」就往 prefs 里塞东西。校验完还要把改了什么列给用户看。
 */
import { CHAR_MAP } from '../data/characters'
import type { IntentResult } from './prompts'
import type { Prefs } from '../types'

const GENDERS = new Set(['boy', 'girl', 'neutral'])
const STYLES = new Set(['shu', 'nat', 'jian', 'qing', 'any'])
const EN_STYLES = new Set(['classic', 'nature', 'short', 'modern', 'any'])
const ELEMENTS = new Set(['金', '木', '水', '火', '土', 'auto', 'none'])
const MODES = new Set(['zh', 'en'])

const LABELS: Record<string, string> = {
  surname: '姓氏', gender: '性别', length: '名字字数', style: '名字气质',
  element: '五行', mustInclude: '必含字', avoidChars: '避讳字',
  avoidPopular: '避开爆款字', easyToWrite: '优先少笔画',
  englishFriendly: '优先英语好念', enStyle: '英文名风格', mode: '模式',
}

const VALUE_TEXT: Record<string, Record<string, string>> = {
  gender: { boy: '男孩', girl: '女孩', neutral: '中性' },
  style: { shu: '书卷文雅', nat: '自然大气', jian: '简约温柔', qing: '清朗现代', any: '不挑' },
  enStyle: { classic: '经典', nature: '自然', short: '简洁', modern: '现代', any: '不挑' },
  mode: { zh: '先定中文名', en: '先定英文名' },
}

export interface AppliedChange {
  field: string
  label: string
  text: string
}

export function validateIntent(raw: IntentResult): {
  patch: Partial<Prefs>
  changes: AppliedChange[]
  ignored: string[]
} {
  const patch: Partial<Prefs> = {}
  const ignored: string[] = []

  const put = <K extends keyof Prefs>(k: K, v: Prefs[K]) => { patch[k] = v }

  if (raw.surname !== undefined) {
    const s = String(raw.surname).replace(/[^一-龥]/g, '').slice(0, 2)
    if (s) put('surname', s)
    else ignored.push('姓氏')
  }
  if (raw.gender !== undefined) {
    if (GENDERS.has(raw.gender)) put('gender', raw.gender)
    else ignored.push('性别')
  }
  if (raw.length !== undefined) {
    if (raw.length === 1 || raw.length === 2) put('length', raw.length)
    else ignored.push('名字字数')
  }
  if (raw.style !== undefined) {
    if (STYLES.has(raw.style)) put('style', raw.style as Prefs['style'])
    else ignored.push('名字气质')
  }
  if (raw.enStyle !== undefined) {
    if (EN_STYLES.has(raw.enStyle)) put('enStyle', raw.enStyle as Prefs['enStyle'])
    else ignored.push('英文名风格')
  }
  if (raw.element !== undefined) {
    if (ELEMENTS.has(raw.element)) put('element', raw.element as Prefs['element'])
    else ignored.push('五行')
  }
  if (raw.mode !== undefined) {
    if (MODES.has(raw.mode)) put('mode', raw.mode)
    else ignored.push('模式')
  }
  if (raw.mustInclude !== undefined) {
    const c = String(raw.mustInclude).replace(/[^一-龥]/g, '').charAt(0)
    // 必含字必须在字库里，否则一个名字都生成不出来
    if (c && CHAR_MAP.has(c)) put('mustInclude', c)
    else if (c) ignored.push(`必含字「${c}」（不在字库里）`)
    else ignored.push('必含字')
  }
  if (raw.avoidChars !== undefined) {
    const s = String(raw.avoidChars).replace(/[^一-龥]/g, '').slice(0, 12)
    if (s) put('avoidChars', s)
  }
  for (const k of ['avoidPopular', 'easyToWrite', 'englishFriendly'] as const) {
    const v = raw[k]
    if (v !== undefined) {
      if (typeof v === 'boolean') put(k, v)
      else ignored.push(LABELS[k])
    }
  }

  const changes: AppliedChange[] = Object.entries(patch).map(([field, value]) => ({
    field,
    label: LABELS[field] ?? field,
    text:
      typeof value === 'boolean' ? (value ? '开启' : '关闭')
        : VALUE_TEXT[field]?.[String(value)] ?? String(value),
  }))

  return { patch, changes, ignored }
}
