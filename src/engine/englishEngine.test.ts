import { describe, expect, it } from 'vitest'
import { checkFullEnglishName, filterEnglishNames, pairEnglishNames } from './englishEngine'
import { generate } from './nameEngine'
import { DEFAULT_PREFS, type Prefs } from '../types'

function prefs(over: Partial<Prefs> = {}): Prefs {
  return { ...DEFAULT_PREFS, surname: '林', ...over }
}

describe('中英文名配对', () => {
  it('读音相同才算贴得上，前缀相同不算', () => {
    // 箫 xiāo 不该配上 bridge 是 xi 的名字 —— 这两个音一点都不像
    const forXiao = pairEnglishNames('箫声', ['xiāo', 'shēng'], 'neutral', 'any', 20)
    const sydney = forXiao.find((p) => p.name.name === 'Sydney')
    expect(sydney?.reasons.some((r) => r.includes('读音贴近'))).toBeFalsy()

    // 熙 xī 才该配上
    const forXi = pairEnglishNames('熙和', ['xī', 'hé'], 'neutral', 'any', 30)
    expect(forXi.find((p) => p.name.name === 'Sydney')?.reasons.some((r) => r.includes('读音'))).toBe(true)
  })

  it('n 和 ng 尾视为同一档：兰 lán 配得上 bridge 是 lang 的名字', () => {
    const out = pairEnglishNames('芷兰', ['zhǐ', 'lán'], 'girl', 'any', 30)
    const lawrence = out.find((p) => p.name.name === 'Lauren')
    expect(lawrence?.matched).toBe(true)
  })

  it('只有抽象意象重合才算含义呼应，都沾一点自然不算', () => {
    // 南山 和 Wren（鹪鹩）都沾「自然」，但说含义呼应是牵强的
    const out = pairEnglishNames('南山', ['nán', 'shān'], 'neutral', 'any', 30)
    const wren = out.find((p) => p.name.name === 'Wren')
    expect(wren?.reasons.some((r) => r.includes('含义和中文名呼应'))).toBeFalsy()

    // 琴书 和 Harper（竖琴手）都指向音乐，这才算
    const music = pairEnglishNames('琴书', ['qín', 'shū'], 'neutral', 'any', 30)
    expect(music.find((p) => p.name.name === 'Harper')?.matched).toBe(true)
  })

  it('没配上时如实说明是各自独立的选择', () => {
    const out = pairEnglishNames('南山', ['nán', 'shān'], 'neutral', 'any', 30)
    const loose = out.find((p) => !p.matched)
    expect(loose?.reasons[0]).toContain('各自成立')
  })

  it('性别筛选生效', () => {
    expect(pairEnglishNames('浩然', ['hào', 'rán'], 'boy', 'any', 40)
      .every((p) => p.name.gender !== 'f')).toBe(true)
    expect(pairEnglishNames('婉宁', ['wǎn', 'níng'], 'girl', 'any', 40)
      .every((p) => p.name.gender !== 'm')).toBe(true)
  })

  it('中性模式只给中性名', () => {
    expect(filterEnglishNames('neutral', 'any', '').every((n) => n.gender === 'n')).toBe(true)
  })
})

describe('英文全名检查', () => {
  it('首字母拼出不友好的词时会警告', () => {
    const r = checkFullEnglishName('Amy', 'Shan', 'Su')
    expect(r.initials).toBe('ASS')
    expect(r.notes.some((n) => n.level === 'warn')).toBe(true)
  })

  it('正常的名字不报警', () => {
    const r = checkFullEnglishName('Emma', 'Lin', 'Zhang')
    expect(r.initials).toBe('ELZ')
    expect(r.notes.some((n) => n.level === 'warn')).toBe(false)
  })

  it('头韵和单音节只作提示，不算问题', () => {
    const r = checkFullEnglishName('Lily', '', 'Li')
    expect(r.notes.every((n) => n.level === 'info')).toBe(true)
  })
})

describe('换一批不重复', () => {
  it('把看过的排除掉之后，连续五批没有一个重复', () => {
    const seen = new Set<string>()
    for (let batch = 0; batch < 5; batch++) {
      const out = generate({
        prefs: prefs(), targetElement: null, seed: batch * 977 + 3, count: 12, exclude: seen,
      })
      for (const n of out.names) {
        expect(seen.has(n.given), `${n.full} 在第 ${batch + 1} 批重复出现`).toBe(false)
        seen.add(n.given)
      }
    }
    expect(seen.size).toBe(60)
  })

  it('不传排除集时会重复 —— 这正是修复前的行为', () => {
    const a = generate({ prefs: prefs(), targetElement: null, seed: 1, count: 12 })
    const b = generate({ prefs: prefs(), targetElement: null, seed: 2, count: 12 })
    const overlap = a.names.filter((x) => b.names.some((y) => y.given === x.given))
    expect(overlap.length).toBeGreaterThan(0)
  })

  it('候选被抽干时如实返回 exhausted', () => {
    const seen = new Set<string>()
    let last = generate({ prefs: prefs({ mustInclude: '文' }), targetElement: null, seed: 1, count: 12 })
    for (let i = 0; i < 30 && !last.exhausted; i++) {
      for (const n of last.names) seen.add(n.given)
      last = generate({
        prefs: prefs({ mustInclude: '文' }), targetElement: null, seed: i * 31 + 7, count: 12, exclude: seen,
      })
    }
    expect(last.exhausted).toBe(true)
    expect(last.names.length).toBeLessThan(12)
  })
})
