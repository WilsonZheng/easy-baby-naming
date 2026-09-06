/**
 * 出生城市 -> IANA 时区 + 经度。
 * 时区用来把「当地钟表时间」换算成真实时刻（夏令时由 Intl 自动处理）；
 * 经度用来做真太阳时校正 —— 奥克兰在东经 174.76，而 UTC+12 的中央经线是 180，
 * 两者差 21 分钟，这个差值会真的影响时柱。
 * 格式：中文名|英文名|IANA 时区|经度（东正西负）|地区分组（下拉框里用它分组）
 */
const RAW = `
奥克兰|Auckland|Pacific/Auckland|174.76|新西兰
惠灵顿|Wellington|Pacific/Auckland|174.78|新西兰
基督城|Christchurch|Pacific/Auckland|172.64|新西兰
悉尼|Sydney|Australia/Sydney|151.21|澳大利亚
墨尔本|Melbourne|Australia/Melbourne|144.96|澳大利亚
布里斯班|Brisbane|Australia/Brisbane|153.03|澳大利亚
珀斯|Perth|Australia/Perth|115.86|澳大利亚
阿德莱德|Adelaide|Australia/Adelaide|138.60|澳大利亚
堪培拉|Canberra|Australia/Sydney|149.13|澳大利亚
多伦多|Toronto|America/Toronto|-79.38|加拿大
温哥华|Vancouver|America/Vancouver|-123.12|加拿大
蒙特利尔|Montreal|America/Toronto|-73.57|加拿大
卡尔加里|Calgary|America/Edmonton|-114.07|加拿大
渥太华|Ottawa|America/Toronto|-75.70|加拿大
纽约|New York|America/New_York|-74.01|美国
洛杉矶|Los Angeles|America/Los_Angeles|-118.24|美国
旧金山|San Francisco|America/Los_Angeles|-122.42|美国
圣何塞|San Jose|America/Los_Angeles|-121.89|美国
西雅图|Seattle|America/Los_Angeles|-122.33|美国
圣地亚哥|San Diego|America/Los_Angeles|-117.16|美国
波士顿|Boston|America/New_York|-71.06|美国
费城|Philadelphia|America/New_York|-75.16|美国
匹兹堡|Pittsburgh|America/New_York|-79.99|美国
华盛顿|Washington DC|America/New_York|-77.04|美国
亚特兰大|Atlanta|America/New_York|-84.39|美国
迈阿密|Miami|America/New_York|-80.19|美国
芝加哥|Chicago|America/Chicago|-87.63|美国
休斯顿|Houston|America/Chicago|-95.37|美国
达拉斯|Dallas|America/Chicago|-96.80|美国
奥斯汀|Austin|America/Chicago|-97.74|美国
明尼阿波利斯|Minneapolis|America/Chicago|-93.27|美国
丹佛|Denver|America/Denver|-104.99|美国
凤凰城|Phoenix|America/Phoenix|-112.07|美国
檀香山|Honolulu|Pacific/Honolulu|-157.86|美国
伦敦|London|Europe/London|-0.13|英国与爱尔兰
曼彻斯特|Manchester|Europe/London|-2.24|英国与爱尔兰
伯明翰|Birmingham|Europe/London|-1.90|英国与爱尔兰
爱丁堡|Edinburgh|Europe/London|-3.19|英国与爱尔兰
都柏林|Dublin|Europe/Dublin|-6.26|英国与爱尔兰
巴黎|Paris|Europe/Paris|2.35|欧洲其他
柏林|Berlin|Europe/Berlin|13.40|欧洲其他
慕尼黑|Munich|Europe/Berlin|11.58|欧洲其他
阿姆斯特丹|Amsterdam|Europe/Amsterdam|4.90|欧洲其他
苏黎世|Zurich|Europe/Zurich|8.54|欧洲其他
斯德哥尔摩|Stockholm|Europe/Stockholm|18.07|欧洲其他
马德里|Madrid|Europe/Madrid|-3.70|欧洲其他
米兰|Milan|Europe/Rome|9.19|欧洲其他
新加坡|Singapore|Asia/Singapore|103.82|东南亚
吉隆坡|Kuala Lumpur|Asia/Kuala_Lumpur|101.69|东南亚
曼谷|Bangkok|Asia/Bangkok|100.50|东南亚
雅加达|Jakarta|Asia/Jakarta|106.85|东南亚
马尼拉|Manila|Asia/Manila|120.98|东南亚
东京|Tokyo|Asia/Tokyo|139.69|东亚其他
大阪|Osaka|Asia/Tokyo|135.50|东亚其他
首尔|Seoul|Asia/Seoul|126.98|东亚其他
迪拜|Dubai|Asia/Dubai|55.27|其他地区
北京|Beijing|Asia/Shanghai|116.41|中国大陆
上海|Shanghai|Asia/Shanghai|121.47|中国大陆
广州|Guangzhou|Asia/Shanghai|113.26|中国大陆
深圳|Shenzhen|Asia/Shanghai|114.06|中国大陆
成都|Chengdu|Asia/Shanghai|104.07|中国大陆
杭州|Hangzhou|Asia/Shanghai|120.16|中国大陆
南京|Nanjing|Asia/Shanghai|118.80|中国大陆
武汉|Wuhan|Asia/Shanghai|114.30|中国大陆
西安|Xi'an|Asia/Shanghai|108.95|中国大陆
重庆|Chongqing|Asia/Shanghai|106.55|中国大陆
天津|Tianjin|Asia/Shanghai|117.20|中国大陆
苏州|Suzhou|Asia/Shanghai|120.62|中国大陆
长沙|Changsha|Asia/Shanghai|112.94|中国大陆
青岛|Qingdao|Asia/Shanghai|120.38|中国大陆
沈阳|Shenyang|Asia/Shanghai|123.43|中国大陆
哈尔滨|Harbin|Asia/Shanghai|126.53|中国大陆
大连|Dalian|Asia/Shanghai|121.62|中国大陆
厦门|Xiamen|Asia/Shanghai|118.09|中国大陆
福州|Fuzhou|Asia/Shanghai|119.30|中国大陆
昆明|Kunming|Asia/Shanghai|102.83|中国大陆
郑州|Zhengzhou|Asia/Shanghai|113.63|中国大陆
济南|Jinan|Asia/Shanghai|117.00|中国大陆
合肥|Hefei|Asia/Shanghai|117.28|中国大陆
南昌|Nanchang|Asia/Shanghai|115.89|中国大陆
石家庄|Shijiazhuang|Asia/Shanghai|114.51|中国大陆
太原|Taiyuan|Asia/Shanghai|112.55|中国大陆
长春|Changchun|Asia/Shanghai|125.32|中国大陆
贵阳|Guiyang|Asia/Shanghai|106.63|中国大陆
南宁|Nanning|Asia/Shanghai|108.37|中国大陆
兰州|Lanzhou|Asia/Shanghai|103.83|中国大陆
乌鲁木齐|Urumqi|Asia/Shanghai|87.62|中国大陆
拉萨|Lhasa|Asia/Shanghai|91.14|中国大陆
呼和浩特|Hohhot|Asia/Shanghai|111.75|中国大陆
海口|Haikou|Asia/Shanghai|110.20|中国大陆
香港|Hong Kong|Asia/Hong_Kong|114.17|港澳台
澳门|Macau|Asia/Macau|113.54|港澳台
台北|Taipei|Asia/Taipei|121.56|港澳台
台中|Taichung|Asia/Taipei|120.68|港澳台
高雄|Kaohsiung|Asia/Taipei|120.30|港澳台
约翰内斯堡|Johannesburg|Africa/Johannesburg|28.05|其他地区
开普敦|Cape Town|Africa/Johannesburg|18.42|其他地区
圣保罗|Sao Paulo|America/Sao_Paulo|-46.63|其他地区
`.trim()

export interface City {
  zh: string
  en: string
  tz: string
  lon: number
  /** 下拉框里的分组名 */
  region: string
}

export const CITIES: City[] = RAW.split('\n').map((row) => {
  const [zh, en, tz, lon, region] = row.split('|')
  return { zh, en, tz, lon: Number(lon), region }
})

/** 下拉框的分组顺序：海外华人最集中的地方排前面 */
export const REGION_ORDER = [
  '新西兰', '澳大利亚', '加拿大', '美国', '英国与爱尔兰', '欧洲其他',
  '东南亚', '东亚其他', '中国大陆', '港澳台', '其他地区',
] as const

export function citiesByRegion(): { region: string; cities: City[] }[] {
  return REGION_ORDER
    .map((region) => ({ region, cities: CITIES.filter((c) => c.region === region) }))
    .filter((g) => g.cities.length > 0)
}

export const CITY_MAP = new Map(CITIES.map((c) => [c.zh, c]))

export function searchCities(q: string, limit = 8): City[] {
  const s = q.trim().toLowerCase()
  if (!s) return []
  return CITIES.filter((c) => c.zh.includes(s) || c.en.toLowerCase().includes(s)).slice(0, limit)
}

/**
 * 把「某时区的当地钟表时间」换算成真实时刻。
 * 用 Intl 反查该时刻在目标时区的偏移量，夏令时因此自动生效。
 */
export function zonedTimeToUtc(
  year: number, month: number, day: number, hour: number, minute: number, tz: string,
): Date {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute)
  let guess = asUtc
  for (let i = 0; i < 2; i++) {
    guess = asUtc - tzOffsetMs(new Date(guess), tz)
  }
  return new Date(guess)
}

/** 某时刻在某时区的 UTC 偏移（毫秒） */
export function tzOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]))
  const asUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour) % 24, Number(parts.minute), Number(parts.second),
  )
  return asUtc - date.getTime()
}
