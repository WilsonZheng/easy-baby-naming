/** 汉字 -> 意象标签，用于和英文名做「含义呼应」的配对。 */
const GROUPS: Record<string, string> = {
  light: '光明曜晨曦昭旭昕晏熠煜灿炜焕曙阳昱璨皎皓朗炎',
  water: '江河海洋溪泉澜涵汐沐洛淮湛泓淼渊沁澈沛泽泠洵浚澄漪涟渡津涯帆舟航',
  sea: '海洋澜淼涯帆舟航',
  sky: '云霄霖霞雯雪霜宇宙穹空寰阔',
  nature: '林森松柏桐梧楠榕桦杨柳栩楷枫榆柯梓桑芷芸苒菡薇蕾芊苓茵萱蕊荷莲兰芝蓁蘅葳茜莞苏芳芬菲蓉竹梅桂棠樱榛山岚峰岑岩春夏秋禾穗',
  flower: '芷菡薇蕾荷莲兰芝茜芳芬菲蓉梅桂棠樱蕊',
  forest: '林森松柏桐梧楠榕桦杨柳枫榆桑',
  mountain: '山岚峰岑岩崇峻屿嵘磊磐',
  wise: '慧智哲学睿敏颖思悟谦谨知',
  strong: '毅刚坚峻磊磐骏骁骥驰锐铮炽拓建弘博志疆钧鸿鹏',
  grace: '和悦欣怡恬婉娴妍姝婵嫣媛婧妙婷柔嘉佳',
  peace: '安宁静谧泰康凝和',
  joy: '悦欣怡歆灿嘉',
  pure: '洁白素皎净纯真朴冰青玉',
  noble: '玉珂琅瑾瑜璟珩琛琪瑶珊玥璇琬珞瑄璨琳玲瑛君敬彦崇华',
  jewel: '玉珂琅瑾瑜璟珩琛琪瑶珊玥璇琬珞瑄璨琳玲瑛锦金银鑫钰',
  star: '星辰曦璨银',
  night: '宵夕黛霄',
  gift: '恩惠予毓育',
  music: '音韵律弦笙筝琴箫歌谣诗词赋',
  bird: '翔翎翊羽翩鸿鹏鹤鸾燕莺',
  life: '春苏元初生永恒承',
  true: '诚信真允谨秉',
  love: '慕恩怜',
  spring: '春苒茵蓁',
  dawn: '曦晨曙旭昕朝',
  home: '堂城安宁',
  whole: '和圆全元',
  new: '初新元',
  youth: '稚初春',
  hope: '愿望憬',
  honor: '誉敬崇彰',
  beauty: '嫣妍姝媛婉华绚',
  earth: '坤培城域堂塘垚土田畴',
  tree: '林松柏桐梧楠榕桦杨柳枫榆桑',
  summer: '夏炎暄',
}

const CHAR_SEM = new Map<string, string[]>()
for (const [tag, chars] of Object.entries(GROUPS)) {
  for (const c of chars) {
    const list = CHAR_SEM.get(c) ?? []
    list.push(tag)
    CHAR_SEM.set(c, list)
  }
}

export function semanticsOf(chars: string): string[] {
  const out = new Set<string>()
  for (const c of chars) for (const t of CHAR_SEM.get(c) ?? []) out.add(t)
  return [...out]
}
