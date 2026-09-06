/**
 * 谐音风险检查。
 * 按「姓 + 名」的完整无调拼音去比对，因为绝大多数事故都是姓和名连起来才出现的
 * （单看名字「建」没问题，姓范就成了「犯贱」）。
 *
 * block = 不推荐，直接从候选里剔除
 * warn  = 提示用户自己判断
 */
export type HomophoneLevel = 'block' | 'warn'

export interface HomophoneHit {
  level: HomophoneLevel
  reads: string
  note: string
}

const RAW = `
yangwei|阳痿|block
fanjian|犯贱|block
xiajian|下贱|block
xialiu|下流|block
shabi|傻逼|block
jiba|生殖器俗称|block
wangba|王八|block
qinshou|禽兽|block
huli|狐狸精的前两字|block
duanming|短命|block
songzhong|送终|block
linzhong|临终|block
xuwei|虚伪|block
baichi|白痴|block
naocan|脑残|block
feiwu|废物|block
pianzi|骗子|block
wurenyao|无人要|block
duziteng|肚子疼|block
shizhenxiang|屎真香|block
renyao|人妖|block
shenjing|神经|block
caoni|粗口|block
xiaobian|小便|block
dabian|大便|block
gangmen|肛门|block
zhurou|猪肉|block
zhutou|猪头|block
gouzai|狗崽|block
siwang|死亡|block
shibai|失败|block
fanzui|犯罪|block
youbing|有病|block
bingdu|病毒|block
tuifei|颓废|block
wangguo|亡国|block
panguang|膀胱|block
jiangyou|酱油|warn
caidao|菜刀|warn
cainiao|菜鸟|warn
houzi|猴子|warn
duzi|肚子|warn
sunzi|孙子|warn
huzi|胡子|warn
hushuo|胡说|warn
maodun|矛盾|warn
mafan|麻烦|warn
yaofan|要饭|warn
dubo|赌博|warn
tanxin|贪心|warn
zhoumo|周末|warn
zhuxi|主席|warn
dongxi|东西|warn
sunshi|损失|warn
duanxin|短信|warn
wangji|忘记|warn
wangran|枉然|warn
songli|送礼|warn
luosuo|啰嗦|warn
luoji|逻辑|warn
linshi|临时|warn
yuangong|员工|warn
yuanliang|原谅|warn
panduan|判断|warn
pengzhang|膨胀|warn
zengjia|增加|warn
xuqiu|需求|warn
xuduo|许多|warn
yanjiu|研究|warn
yanse|颜色|warn
weisheng|卫生|warn
gaoxing|高兴|warn
zhufu|祝福|warn
caoyuan|草原|warn
jiangjun|将军|warn
wuzhi|无知|block
wuqing|无情|block
wuyong|无用|block
wuneng|无能|block
wuxin|无心|block
wuyan|无言|block
wuli|无理|warn
wuming|无名|warn
wushi|无视|warn
wude|无德|block
wuwei|无味|warn
libai|与诗人李白同名|warn
zhouyu|与三国周瑜同名|warn
baifei|白费|warn
laipi|赖皮|warn
hebi|何必|warn
wenti|问题|block
weiji|危机|warn
shiye|失业|warn
shiwang|失望|block
juewang|绝望|block
beishang|悲伤|block
kongju|恐惧|block
`.trim()

interface Rule {
  key: string
  reads: string
  level: HomophoneLevel
}

const RULES: Rule[] = RAW.split('\n').map((row) => {
  const [key, reads, level] = row.split('|')
  return { key, reads, level: level as HomophoneLevel }
})

const RULE_MAP = new Map(RULES.map((r) => [r.key, r]))

/**
 * @param syllables 姓和名的全部无调拼音音节，按顺序，例如 ['fan','jian','guo']
 */
export function checkHomophone(syllables: string[]): HomophoneHit[] {
  const hits: HomophoneHit[] = []
  const seen = new Set<string>()
  // 检查所有长度 >= 2 的连续片段
  for (let start = 0; start < syllables.length; start++) {
    for (let end = start + 2; end <= syllables.length; end++) {
      const key = syllables.slice(start, end).join('')
      const rule = RULE_MAP.get(key)
      if (rule && !seen.has(key)) {
        seen.add(key)
        hits.push({
          level: rule.level,
          reads: rule.reads,
          note: `连读接近「${rule.reads}」`,
        })
      }
    }
  }
  return hits
}

export const HOMOPHONE_RULE_COUNT = RULES.length
