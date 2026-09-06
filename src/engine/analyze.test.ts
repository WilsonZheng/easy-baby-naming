import { describe, expect, it } from 'vitest'
import { analyzeName, detectInputKind, splitName } from './analyze'

describe('切分姓和名', () => {
  it('单姓', () => {
    expect(splitName('郑清越')).toEqual({ surname: '郑', given: '清越' })
    expect(splitName('王伟')).toEqual({ surname: '王', given: '伟' })
  })

  it('复姓优先于单姓', () => {
    expect(splitName('欧阳清越')).toEqual({ surname: '欧阳', given: '清越' })
    expect(splitName('司马光')).toEqual({ surname: '司马', given: '光' })
  })

  it('复姓只有三个字时仍按复姓切', () => {
    expect(splitName('上官婉')).toEqual({ surname: '上官', given: '婉' })
  })

  it('忽略空格和标点', () => {
    expect(splitName(' 郑 清越 ')).toEqual({ surname: '郑', given: '清越' })
  })
})

describe('分析已有的名字', () => {
  it('给出全名拼音和逐字信息', () => {
    const a = analyzeName('郑清越')!
    expect(a.full).toBe('郑清越')
    expect(a.pinyin).toBe('zhèng qīng yuè')
    expect(a.givenChars.map((c) => c.meaning)).toEqual(['清澈明净', '清越超逸'])
    expect(a.totalStrokes).toBe(23)
  })

  it('主字库没有的常见字，从查询表里补上读音', () => {
    const a = analyzeName('王志伟')!
    expect(a.pinyin).toBe('wáng zhì wěi')
    const wei = a.givenChars.find((c) => c.char === '伟')!
    expect(wei.unknown).toBe(false)
    expect(wei.meaning).toBe('伟大')
    // 查询表不记五行笔画，就该留空，而不是编一个
    expect(wei.element).toBeNull()
    expect(wei.strokes).toBeNull()
  })

  it('两张表都查不到时如实标为未知，不猜', () => {
    const a = analyzeName('李龘鑫')!
    expect(a.unknownCount).toBe(1)
    const x = a.givenChars.find((c) => c.char === '龘')!
    expect(x.unknown).toBe(true)
    expect(x.pinyin).toBeNull()
    expect(x.meaning).toBeNull()
    // 有字不认识时不给总笔画，免得算出一个偏小的数误导人
    expect(a.totalStrokes).toBeNull()
  })

  it('对已有的名字也做谐音检查', () => {
    const a = analyzeName('杨伟')!
    expect(a.homophones.some((h) => h.reads === '阳痿')).toBe(true)
  })

  it('英语可读性只看名，不含姓', () => {
    const a = analyzeName('徐旭')!
    // 旭 xù 的 x 在英语里读不出来
    expect(a.readability!.issues.some((i) => i.syllable === 'xu')).toBe(true)
  })

  it('两个字同出一句典籍时给出出处', () => {
    expect(analyzeName('林坤德')!.source?.ref).toContain('周易')
    expect(analyzeName('林清越')!.source).toBeNull()
  })

  it('标出两个字同偏旁', () => {
    expect(analyzeName('王沐汐')!.sameRadical).toBe('氵')
    expect(analyzeName('王清和')!.sameRadical).toBeNull()
  })

  it('只有姓没有名时返回 null', () => {
    expect(analyzeName('郑')).toBeNull()
    expect(analyzeName('')).toBeNull()
  })

  it('姓不在姓氏表里也能分析名字本身', () => {
    const a = analyzeName('龘清越')!
    expect(a.surname).toBe('龘')
    expect(a.givenChars[0].pinyin).toBe('qīng')
    expect(a.readability).not.toBeNull()
  })
})

describe('判断输入的是中文还是英文', () => {
  it('认出中文名', () => {
    expect(detectInputKind('郑清越')).toBe('zh')
  })

  it('认出英文名，包括带连字符和空格的', () => {
    expect(detectInputKind('Grace')).toBe('en')
    expect(detectInputKind('Mary Jane')).toBe('en')
    expect(detectInputKind("O'Brien")).toBe('en')
  })

  it('空的或者混杂的返回 unknown', () => {
    expect(detectInputKind('')).toBe('unknown')
    expect(detectInputKind('   ')).toBe('unknown')
    expect(detectInputKind('123')).toBe('unknown')
  })
})
