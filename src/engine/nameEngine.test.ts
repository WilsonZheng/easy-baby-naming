import { describe, expect, it } from 'vitest'
import { BANNED_COMBOS, generateNames, PREFIX_CHARS, SUFFIX_CHARS } from './nameEngine'
import { SOURCES, findSource, findSourceSameClause } from '../data/sources'
import { CURATED_SET } from '../data/curatedNames'
import { semanticsOf } from './semantics'
import { DEFAULT_PREFS, type Prefs } from '../types'
import { CHAR_MAP } from '../data/characters'
import { checkHomophone } from './homophone'
import { assessReadability } from './readability'
import { checkTones } from './pinyin'

function prefs(over: Partial<Prefs> = {}): Prefs {
  return { ...DEFAULT_PREFS, surname: '李', ...over }
}

describe('生成基本可用', () => {
  it('给出请求数量的候选', () => {
    const out = generateNames({ prefs: prefs(), targetElement: null, seed: 1, count: 12 })
    expect(out).toHaveLength(12)
    expect(new Set(out.map((n) => n.given)).size).toBe(12)
  })

  it('每个候选都带姓、拼音和解释', () => {
    const out = generateNames({ prefs: prefs(), targetElement: null, seed: 2, count: 6 })
    for (const n of out) {
      expect(n.full.startsWith('李')).toBe(true)
      expect(n.pinyin).toContain('lǐ')
      expect(n.why.length).toBeGreaterThan(5)
      expect(n.chars).toHaveLength(2)
    }
  })

  it('换一批（不同 seed）会给出不同结果', () => {
    const a = generateNames({ prefs: prefs(), targetElement: null, seed: 1, count: 12 })
    const b = generateNames({ prefs: prefs(), targetElement: null, seed: 999, count: 12 })
    const overlap = a.filter((x) => b.some((y) => y.given === x.given)).length
    expect(overlap).toBeLessThan(12)
  })

  it('单字名模式只出一个字', () => {
    const out = generateNames({ prefs: prefs({ length: 1 }), targetElement: null, seed: 3, count: 8 })
    expect(out.every((n) => n.given.length === 1)).toBe(true)
  })
})

describe('硬规则永不放宽', () => {
  it('不出爆款组合', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const out = generateNames({ prefs: prefs(), targetElement: null, seed, count: 40 })
      expect(out.some((n) => BANNED_COMBOS.has(n.given))).toBe(false)
    }
  })

  it('避讳字一个都不出现', () => {
    const out = generateNames({
      prefs: prefs({ avoidChars: '明月清风' }),
      targetElement: null, seed: 7, count: 40,
    })
    for (const n of out) {
      for (const c of '明月清风') expect(n.given).not.toContain(c)
    }
  })

  it('名字不会和姓用同一个字', () => {
    const out = generateNames({ prefs: prefs({ surname: '林' }), targetElement: null, seed: 8, count: 40 })
    expect(out.every((n) => !n.given.includes('林'))).toBe(true)
  })

  it('不出现三个三声连读', () => {
    const out = generateNames({ prefs: prefs({ surname: '李' }), targetElement: null, seed: 9, count: 60 })
    for (const n of out) {
      const tones = [3, ...n.chars.map((c) => c.tone)]
      expect(checkTones(tones).some((i) => i.kind === 'triple-third')).toBe(false)
    }
  })

  it('谐音黑名单里的组合会被剔除：范 + 建/剑 不会出现', () => {
    const out = generateNames({ prefs: prefs({ surname: '范' }), targetElement: null, seed: 10, count: 80 })
    expect(out.every((n) => !n.homophones.some((h) => h.level === 'block'))).toBe(true)
  })

  it('杨姓不会配出「阳痿」的读音', () => {
    const out = generateNames({ prefs: prefs({ surname: '杨' }), targetElement: null, seed: 11, count: 80 })
    for (const n of out) {
      const syl = ['yang', ...n.chars.map((c) => c.pinyin)]
      expect(checkHomophone(syl.map((s) => s.normalize('NFD').replace(/[̀-̏]/g, '')))
        .some((h) => h.level === 'block')).toBe(false)
    }
  })

  it('必含字一定出现在每个候选里', () => {
    const out = generateNames({
      prefs: prefs({ mustInclude: '文' }),
      targetElement: null, seed: 12, count: 20,
    })
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((n) => n.given.includes('文'))).toBe(true)
  })
})

describe('软条件按偏好生效', () => {
  it('选男孩时不会出现强女性倾向的字', () => {
    const out = generateNames({ prefs: prefs({ gender: 'boy' }), targetElement: null, seed: 13, count: 40 })
    for (const n of out) {
      for (const c of n.chars) expect(CHAR_MAP.get(c.char)!.gender).toBeGreaterThan(-2)
    }
  })

  it('选女孩时不会出现强男性倾向的字', () => {
    const out = generateNames({ prefs: prefs({ gender: 'girl' }), targetElement: null, seed: 14, count: 40 })
    for (const n of out) {
      for (const c of n.chars) expect(CHAR_MAP.get(c.char)!.gender).toBeLessThan(2)
    }
  })

  it('指定五行时，绝大多数候选都含该五行', () => {
    const out = generateNames({ prefs: prefs(), targetElement: '水', seed: 15, count: 12 })
    const hit = out.filter((n) => n.elements.includes('水')).length
    expect(hit / out.length).toBeGreaterThan(0.8)
  })

  it('开启避开爆款时，不出现流行度 3 的字', () => {
    const out = generateNames({ prefs: prefs({ avoidPopular: true }), targetElement: null, seed: 16, count: 60 })
    for (const n of out) {
      for (const c of n.chars) expect(CHAR_MAP.get(c.char)!.overuse).toBeLessThan(3)
    }
  })

  // 抽样是带随机性的，单个 seed 的样本会被噪声淹没。
  // 偏好生效与否要跨多个 seed 取平均才测得准。
  function sample(over: Partial<Prefs>, seeds = 8) {
    const out = []
    for (let seed = 0; seed < seeds; seed++) {
      out.push(...generateNames({ prefs: prefs(over), targetElement: null, seed, count: 12 }))
    }
    return out
  }

  it('开启英语好念优先时，平均可读性高于关闭时', () => {
    const avg = (xs: ReturnType<typeof sample>) =>
      xs.reduce((a, n) => a + n.readability.score, 0) / xs.length
    expect(avg(sample({ englishFriendly: true }))).toBeGreaterThan(avg(sample({ englishFriendly: false })))
  })

  it('开启易写优先时，平均笔画明显下降，而不是只差一两画', () => {
    const avg = (xs: ReturnType<typeof sample>) =>
      xs.reduce((a, n) => a + n.totalStrokes, 0) / xs.length
    const on = sample({ easyToWrite: true })
    const off = sample({ easyToWrite: false })
    expect(avg(off) - avg(on)).toBeGreaterThan(2)
    // 最费劲的那个也该被压下来
    expect(Math.max(...on.map((n) => n.totalStrokes)))
      .toBeLessThan(Math.max(...off.map((n) => n.totalStrokes)))
  })
})

describe('英语可读性判断', () => {
  it('把 x/q/ü 标成难念', () => {
    const r = assessReadability(['xù'])
    expect(r.issues.some((i) => i.level === 'hard')).toBe(true)
    expect(r.score).toBeLessThan(80)
  })

  it('把 lín、míng 这种判为好念', () => {
    expect(assessReadability(['lín', 'míng']).score).toBeGreaterThanOrEqual(90)
  })

  it('识别撞上英语俚语的音节', () => {
    expect(assessReadability(['dōng']).clashes.length).toBeGreaterThan(0)
  })
})

describe('名字要讲得通', () => {
  it('从不引用讲凋零、离别、死亡的诗句作为出处', () => {
    for (const seed of [1, 5, 42, 777]) {
      for (const surname of ['林', '王', '陈', '欧阳']) {
        const out = generateNames({
          prefs: prefs({ surname }), targetElement: null, seed, count: 40,
        })
        for (const n of out) {
          if (!n.source) continue
          const entry = SOURCES.find((s) => s.line === n.source!.line)
          expect(entry?.inauspicious, `${n.full} 引用了 ${n.source.line}`).toBe(false)
        }
      }
    }
  })

  it('只在精选组合里成立的字，不会出现在自由组合里', () => {
    const risky = ['落', '暮', '芜', '蕤', '曲', '珠', '衿', '汉']
    for (const seed of [1, 9, 33, 500]) {
      const out = generateNames({ prefs: prefs(), targetElement: null, seed, count: 60 })
      for (const n of out) {
        if (CURATED_SET.has(n.given)) continue
        for (const c of risky) {
          expect(n.given, `${n.full} 是自由组合却含「${c}」`).not.toContain(c)
        }
      }
    }
  })

  it('自由组合的两个字之间必须有意义或气质上的关联', () => {
    // 反例：京和卷都是好字，合起来不成词
    const out = generateNames({ prefs: prefs(), targetElement: null, seed: 3, count: 80 })
    for (const n of out) {
      if (CURATED_SET.has(n.given) || n.source) continue
      const [a, b] = n.given.split('')
      const semA = semanticsOf(a)
      const semB = semanticsOf(b)
      const shared = semA.some((t) => semB.includes(t))
      const connector = SUFFIX_CHARS.has(b) || PREFIX_CHARS.has(a)
      expect(shared || connector, `${n.full} 的两个字之间没有关联`).toBe(true)
    }
  })

  it('精选名会排在列表靠前的位置', () => {
    const out = generateNames({ prefs: prefs(), targetElement: null, seed: 11, count: 12 })
    const curatedCount = out.filter((n) => CURATED_SET.has(n.given)).length
    expect(curatedCount).toBeGreaterThanOrEqual(5)
  })
})

describe('出处的字序', () => {
  it('两个字必须按原句的先后顺序出现', () => {
    // 「地势坤，君子以厚德载物」支持「坤德」，不支持「德坤」
    expect(findSource('坤', '德')).toBeTruthy()
    expect(findSource('德', '坤')).toBeUndefined()
    // 「言念君子，温其如玉」支持「念玉」，不支持「玉念」
    expect(findSource('念', '玉')).toBeTruthy()
    expect(findSource('玉', '念')).toBeUndefined()
  })

  it('生成的名字里，凡是标了出处的，字序都和原句一致', () => {
    for (const seed of [2, 20, 200]) {
      for (const surname of ['林', '陈', '黄']) {
        const out = generateNames({ prefs: prefs({ surname }), targetElement: null, seed, count: 40 })
        for (const n of out) {
          if (!n.source) continue
          const plain = n.source.line.replace(/[^一-龥]/g, '')
          const [a, b] = n.given.split('')
          expect(plain.indexOf(a), `${n.full}：${n.source.line}`).toBeLessThan(plain.lastIndexOf(b))
        }
      }
    }
  })
})

describe('一屏名字要有变化', () => {
  it('同一个首字最多出现两次', () => {
    for (const seed of [1, 50, 900]) {
      const out = generateNames({ prefs: prefs(), targetElement: null, seed, count: 12 })
      const counts = new Map<string, number>()
      for (const n of out) counts.set(n.given[0], (counts.get(n.given[0]) ?? 0) + 1)
      expect(Math.max(...counts.values())).toBeLessThanOrEqual(2)
    }
  })

  it('同一个尾字最多出现两次：不能一屏都是「x远」', () => {
    for (const seed of [1, 50, 900]) {
      for (const gender of ['boy', 'girl', 'neutral'] as const) {
        const out = generateNames({ prefs: prefs({ gender }), targetElement: null, seed, count: 12 })
        const counts = new Map<string, number>()
        for (const n of out) {
          const last = n.given[n.given.length - 1]
          counts.set(last, (counts.get(last) ?? 0) + 1)
        }
        expect(Math.max(...counts.values()), `seed ${seed} / ${gender}`).toBeLessThanOrEqual(2)
      }
    }
  })
})

describe('出处只在两个字本来就成词时才算关联', () => {
  it('相邻的算：「春江潮水连海平」支持「春江」', () => {
    expect(findSourceSameClause('春', '江')).toBeTruthy()
  })

  it('隔太远的不算：「春风又绿江南岸」不支持「风江」', () => {
    expect(findSourceSameClause('风', '江')).toBeUndefined()
  })

  it('跨分句的不算：「等闲识得东风面，万紫千红总是春」不支持「风春」', () => {
    expect(findSourceSameClause('风', '春')).toBeUndefined()
  })

  it('凶意的句子一律不算', () => {
    // 「惟草木之零落兮，恐美人之迟暮」里「落」「暮」不相邻也不该被采用
    expect(findSourceSameClause('零', '落')).toBeUndefined()
  })
})

describe('高危姓氏的谐音拦截', () => {
  it('吴姓不会配出「无知」「无心」「无言」这类读音', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 12; seed++) {
      const out = generateNames({
        prefs: prefs({ surname: '吴' }), targetElement: null, seed, count: 40,
      })
      for (const n of out) {
        seen.add(n.given)
        expect(n.homophones.filter((h) => h.level === 'block'), n.full).toHaveLength(0)
      }
    }
    // 这些名字本身都很好，但配上吴姓会读成无知/无心/无言/无德
    for (const bad of ['知远', '心远', '言之', '德言']) {
      expect(seen.has(bad), `吴${bad} 不该出现`).toBe(false)
    }
    // 拦掉这些之后仍然有足够多的候选可选
    expect(seen.size).toBeGreaterThan(150)
  })

  it('史姓不会配出不雅读音，且仍有足够候选', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 6; seed++) {
      const out = generateNames({
        prefs: prefs({ surname: '史' }), targetElement: null, seed, count: 40,
      })
      for (const n of out) {
        seen.add(n.given)
        expect(n.homophones.filter((h) => h.level === 'block'), n.full).toHaveLength(0)
      }
    }
    expect(seen.size).toBeGreaterThan(80)
  })
})

describe('英语可读性不该误报', () => {
  it('sh 和 ch 不算障碍：英语本来就有这两个音', () => {
    expect(assessReadability(['shū']).issues).toHaveLength(0)
    expect(assessReadability(['chéng']).issues).toHaveLength(0)
  })

  it('ao 不算障碍：英语的 how 就是这个音', () => {
    expect(assessReadability(['hào']).issues).toHaveLength(0)
  })

  it('真正读不出来的仍然要标出来', () => {
    expect(assessReadability(['xù']).issues.length).toBeGreaterThan(0)
    expect(assessReadability(['qiān']).issues.length).toBeGreaterThan(0)
    expect(assessReadability(['lǚ']).issues.length).toBeGreaterThan(0)
    expect(assessReadability(['zhì']).issues.length).toBeGreaterThan(0)
  })
})
