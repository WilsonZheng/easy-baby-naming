/**
 * 常见偏旁归类。
 * 用途有两个：
 *  1. 两个字偏旁相同时，写出来视觉重复（「沐汐」「琳琅」），要降权；
 *  2. 展示「这个名字的两个字长得像不像」，让父母自己判断。
 */
const GROUPS: Record<string, string> = {
  '氵': '江河海洋溪泉澜涵汐沐洛淮湛泓淼渊沁澈沛泽洁泠洵浚澄淳漪涟渡津涯',
  '冫': '冰凛凝净',
  '雨': '云霄霖霞雯雪霜',
  '艹': '芷芸苒菡薇蕾芊苓茵萱蕊荷莲芝蓁蘅葳茜莞苏芳芬菲蓉英兰苍',
  '木': '林森松柏桐梧楠榕桦杨柳栩楷枫榆柯梓桑梅桂棠樱榛朴',
  '钅': '铭锦钧钰铮锐钦银铄钊',
  '王': '珂琅瑾瑜璟珩琛琪瑶珊玥璇琬珞瑄璨琳玲瑛玉',
  '女': '婉娴妍姝婵嫣媛婧妙婷娜',
  '火': '炎焕煜熠炽烨灿炜',
  '日': '明朗晨曦昀昭晗旭昕晏暄昱星曙暖',
  '讠': '语谦谨诚谧诺谣诗词',
  '忄': '恬憬恒',
  '心': '心意念思忆志愿恩惠慧',
  '山': '岚峰岑岩崇峻屿嵘',
  '土': '坤培城域堂塘垚',
  '石': '磊磐砚碧',
  '宀': '安宁宜宥宛宸康寰宇宙',
  '竹': '笙筝箫简',
  '禾': '穗秉秋禾秀稚',
  '马': '骏骁骐骥驰',
  '羽': '翔翎翊羽翩',
  '鸟': '鸿鹏鹤鸾莺',
  '亻': '仁信',
  '彡': '彬彦彰',
}

const CHAR_RADICAL = new Map<string, string>()
for (const [radical, chars] of Object.entries(GROUPS)) {
  for (const c of chars) CHAR_RADICAL.set(c, radical)
}

export function radicalOf(char: string): string | undefined {
  return CHAR_RADICAL.get(char)
}

/** 两个字是不是同一个偏旁 */
export function sameRadical(a: string, b: string): string | null {
  const ra = radicalOf(a)
  const rb = radicalOf(b)
  return ra && rb && ra === rb ? ra : null
}
