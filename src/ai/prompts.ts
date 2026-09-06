/**
 * 提示词。
 *
 * 贯穿的一条原则：模型只能基于我们已经算好的资料说话。
 * 这个 App 的全部价值在于每一条结论都可核对，一旦模型开始编造典故和出处，
 * 用户就再也分不清哪些是真的了 —— 那比没有 AI 更糟。
 */
import type { NameCandidate } from '../types'
import type { Favorite } from '../store/storage'
import { CHAR_MAP } from '../data/characters'
import { assessReadability } from '../engine/readability'

const NO_FABRICATION = `
硬性要求：
- 只能使用下面提供的资料。字义、出处、五行、笔画、读音都以资料为准。
- 绝对不要编造典籍出处、诗句、典故或字义。资料里没写出处，就说没有出处。
- 不要做命理、吉凶、运势方面的判断，也不要暗示某个名字会带来好运或厄运。
- 不确定的事情就说不确定。`.trim()

/** 一、把一句话的期望翻译成筛选条件 */
export const INTENT_SYSTEM = `
你是一个中文取名工具的输入助手。用户会用一句话描述想要什么样的名字，
你要把它翻译成这个工具的筛选条件，输出 JSON。

可用字段（只输出你有把握的，没提到的字段一律省略）：
- surname: 姓氏，1-2 个汉字
- gender: "boy" | "girl" | "neutral"
- length: 1（单字名）| 2（双字名）
- style: "shu"（书卷文雅）| "nat"（自然大气）| "jian"（简约温柔）| "qing"（清朗现代）| "any"
- element: "金" | "木" | "水" | "火" | "土" | "auto"（按八字自动）| "none"（不参考）
- mustInclude: 必须包含的一个汉字，比如辈分字
- avoidChars: 要避开的汉字，连着写
- avoidPopular: true 表示避开梓涵萱这类高频字
- easyToWrite: true 表示优先笔画少、好学写
- englishFriendly: true 表示优先英语里好念的拼音
- enStyle: "classic" | "nature" | "short" | "modern" | "any"
- mode: "zh"（先定中文名）| "en"（先定英文名）
- explain: 一句中文，说明你是怎么理解这句话的（这个字段必填）

注意：
- 用户说「在国外上学」「老外好念」之类，对应 englishFriendly: true
- 用户说「不要烂大街」「别太常见」，对应 avoidPopular: true
- 用户说「山水」「自然」意象，对应 style: "nat"
- 用户说「有文化」「有诗意」「古典」，对应 style: "shu"
- 用户说「简单」「好写」，对应 easyToWrite: true
- 只在用户明确提到生辰八字或五行时才设 element
- 只输出 JSON，不要任何额外文字。`.trim()

export interface IntentResult {
  surname?: string
  gender?: 'boy' | 'girl' | 'neutral'
  length?: 1 | 2
  style?: string
  element?: string
  mustInclude?: string
  avoidChars?: string
  avoidPopular?: boolean
  easyToWrite?: boolean
  englishFriendly?: boolean
  enStyle?: string
  mode?: 'zh' | 'en'
  explain?: string
}

/** 二、读一遍心选名单，给出比较和建议 */
export const REVIEW_SYSTEM = `
你在帮一对海外华人父母比较他们已经收藏的几个候选名字。
他们的孩子会在英语国家长大，同时希望保留中文名的分量。

${NO_FABRICATION}

请用中文写，结构如下，不要用 Markdown 标题符号：
1. 先用两三句话说这几个名字整体是什么调性、彼此的差别在哪。
2. 逐个点评，每个名字两到三句：它的好处、要留意的地方。
3. 最后给一个倾向性建议，并说清楚这个建议的依据是什么。
   如果几个名字各有各的好，就直说取舍点在哪，让父母自己定。

语气要像一个懂行的朋友，不要用营销腔，不要吹捧。总长度控制在 400 字以内。`.trim()

/** 三、为一个名字写一段解读 */
export const EXPLAIN_SYSTEM = `
你在为一个中文名字写一段简短的解读，读者是这个孩子的父母。

${NO_FABRICATION}

写两到三句中文，不超过 120 字：
- 说清楚这两个字合起来是什么画面或什么气质。
- 如果资料里有典籍出处，可以点一句它的意思；没有就完全不要提出处。
- 不要重复资料里已经列出的笔画数、五行这类硬信息。
- 平实、具体，不要辞藻堆砌，不要「寓意着孩子将来…」这种套话。`.trim()

/** 把一个候选名整理成给模型看的资料 */
export function describeName(n: NameCandidate): string {
  const chars = n.chars
    .map((c) => `  ${c.char}（${c.pinyin}）：${c.meaning}；五行属${c.element}；${c.strokes} 画`)
    .join('\n')
  const lines = [
    `姓名：${n.full}`,
    `拼音：${n.pinyin}`,
    `逐字：\n${chars}`,
    `出处：${n.source ? `${n.source.line}（${n.source.ref}）` : '无出处，这两个字不是从典籍里取的'}`,
    `英语可读性：${n.readability.score} 分（100 为满分）`,
  ]
  if (n.readability.issues.length) {
    lines.push(`英语里容易念错的地方：${n.readability.issues.map((i) => `${i.syllable} 常被念成${i.heardAs}`).join('；')}`)
  }
  if (n.homophones.length) {
    lines.push(`谐音提醒：连读接近「${n.homophones.map((h) => h.reads).join('、')}」`)
  }
  if (n.toneNotes.length) lines.push(`连读：${n.toneNotes.join('；')}`)
  lines.push(`总笔画：${n.totalStrokes}`)
  return lines.join('\n')
}

/** 把收藏列表整理成给模型看的资料（收藏里只存了名字，这里补齐字义等信息） */
export function describeFavorites(favorites: Favorite[]): string {
  return favorites
    .map((f, i) => {
      const chars = f.given.split('').map((c) => {
        const e = CHAR_MAP.get(c)
        return e ? `  ${c}（${e.pinyin}）：${e.meaning}；五行属${e.element}；${e.strokes} 画` : `  ${c}：本站字库里没有这个字`
      }).join('\n')
      const pys = f.given.split('').map((c) => CHAR_MAP.get(c)?.pinyin).filter(Boolean) as string[]
      const read = pys.length ? assessReadability(pys) : null
      const bits = [
        `${i + 1}. ${f.full}`,
        `拼音：${f.pinyin}`,
        `逐字：\n${chars}`,
      ]
      if (read) {
        bits.push(`英语可读性：${read.score} 分`)
        if (read.issues.length) {
          bits.push(`英语里容易念错：${read.issues.map((x) => `${x.syllable} 常被念成${x.heardAs}`).join('；')}`)
        }
      }
      if (f.englishName) bits.push(`已选的英文名：${f.englishName}`)
      if (f.note) bits.push(`父母自己的备注：${f.note}`)
      return bits.join('\n')
    })
    .join('\n\n')
}
