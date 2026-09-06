import { describe, expect, it } from 'vitest'
import { validateIntent } from './applyIntent'
import { extractJson, OpenRouterError } from './openrouter'
import type { IntentResult } from './prompts'

describe('模型输出一律不可信', () => {
  it('正常的结果会被完整采纳', () => {
    const { patch, changes } = validateIntent({
      surname: '陈', gender: 'girl', style: 'nat', avoidPopular: true, englishFriendly: true,
    })
    expect(patch).toEqual({
      surname: '陈', gender: 'girl', style: 'nat', avoidPopular: true, englishFriendly: true,
    })
    expect(changes.map((c) => c.label)).toContain('姓氏')
  })

  it('不认识的枚举值直接丢掉，不会塞进偏好里', () => {
    const { patch, ignored } = validateIntent({
      gender: 'male' as never, style: 'elegant', element: '風', enStyle: 'vintage', mode: 'jp' as never,
    })
    expect(patch).toEqual({})
    expect(ignored).toEqual(expect.arrayContaining(['性别', '名字气质', '五行', '英文名风格', '模式']))
  })

  it('姓氏里的非汉字会被清掉，超长会被截断', () => {
    expect(validateIntent({ surname: 'Chen 陈先生' }).patch.surname).toBe('陈先')
    expect(validateIntent({ surname: 'abc' }).ignored).toContain('姓氏')
  })

  it('必含字必须在字库里，否则会一个名字都生成不出来', () => {
    expect(validateIntent({ mustInclude: '文' }).patch.mustInclude).toBe('文')
    const bad = validateIntent({ mustInclude: '龘' })
    expect(bad.patch.mustInclude).toBeUndefined()
    expect(bad.ignored.some((x) => x.includes('龘'))).toBe(true)
  })

  it('布尔字段收到字符串时不做隐式转换', () => {
    const { patch, ignored } = validateIntent({ avoidPopular: 'true' as never, easyToWrite: 1 as never })
    expect(patch.avoidPopular).toBeUndefined()
    expect(patch.easyToWrite).toBeUndefined()
    expect(ignored).toEqual(expect.arrayContaining(['避开爆款字', '优先少笔画']))
  })

  it('字数只认 1 和 2', () => {
    expect(validateIntent({ length: 2 }).patch.length).toBe(2)
    expect(validateIntent({ length: 3 as never }).patch.length).toBeUndefined()
  })

  it('模型多塞的字段不会被写进偏好', () => {
    const evil = { surname: '林', isAdmin: true, __proto__: { hacked: 1 }, theme: 'dark' } as IntentResult
    const { patch } = validateIntent(evil)
    expect(Object.keys(patch)).toEqual(['surname'])
  })

  it('空对象不会报错，只是什么都不改', () => {
    const { patch, changes } = validateIntent({})
    expect(patch).toEqual({})
    expect(changes).toHaveLength(0)
  })

  it('避讳字过长会被截断', () => {
    const long = '明月清风山水林泉花草树木石头'
    expect(validateIntent({ avoidChars: long }).patch.avoidChars!.length).toBe(12)
  })
})

describe('解析模型返回的 JSON', () => {
  it('干净的 JSON', () => {
    expect(extractJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 })
  })

  it('包在 markdown 代码块里的', () => {
    expect(extractJson<{ a: number }>('```json\n{"a":1}\n```')).toEqual({ a: 1 })
  })

  it('前后带解释文字的', () => {
    expect(extractJson<{ a: number }>('好的，这是结果：\n{"a":1}\n希望有帮助')).toEqual({ a: 1 })
  })

  it('完全不是 JSON 时给出可读的错误，而不是抛 SyntaxError', () => {
    expect(() => extractJson('我不太明白你的意思')).toThrow(OpenRouterError)
    expect(() => extractJson('我不太明白你的意思')).toThrow(/不是合法 JSON/)
  })
})
