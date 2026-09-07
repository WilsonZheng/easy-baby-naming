import { CHARACTERS } from '../data/characters'
import { SOURCES } from '../data/sources'
import { ENGLISH_NAMES } from '../data/englishNames'
import { HOMOPHONE_RULE_COUNT } from '../engine/homophone'
import { CITIES } from '../data/cities'

const PITFALLS = [
  {
    h: '爆款字：好听，但一个班能有三个',
    p: '梓、涵、萱、沐、汐、诺、轩、子这些字这十年被用得极密。名字本身没问题，问题是老师点名要加姓才分得清。',
    e: '2010 年后出生的孩子里，「梓」是最高频的取名用字之一。本站默认把这类字排除，你可以在「更多条件」里关掉。',
  },
  {
    h: '谐音：单看名字没事，加上姓就出事',
    p: '事故几乎都发生在姓和名连读的时候。「建」是个好字，姓范就成了别的意思；「伟」是个好字，姓杨就麻烦了。',
    e: `本站内置 ${HOMOPHONE_RULE_COUNT} 条谐音规则，按「姓 + 名」的完整读音比对。命中严重的那一类会直接从候选里剔除，不给你看。`,
  },
  {
    h: '在英语环境里念不出来',
    p: '拼音里的 x、q、ü、zh、以及 zhi/chi/shi 的舌尖韵，英语里根本没有对应音。老师会稳定地念错，孩子要纠正十几年。',
    e: '「旭 Xu」会被念成 Zoo 或 Ex-you；「谦 Qian」会被念成 Kwee-an。本站会把具体会被念成什么写出来，让你自己权衡，而不是简单地不推荐。',
  },
  {
    h: '三个三声连读，念着费劲',
    p: '「李雨晚」这样三个三声连着，口语里要连续变调，念快了会含糊。相邻两个三声只是提醒，三个连着本站直接剔除。',
    e: '这不是玄学，是普通话的连读变调规则：三声在三声前要变成二声。',
  },
  {
    h: '两个字偏旁一样，写出来重复',
    p: '「沐汐」「琳琅」「峰岚」这类，两个字长得太像，写在一起视觉上发闷。喜欢整齐可以留，想要错落就换。',
    e: '本站会标出来，但只降权不剔除 —— 这是审美偏好，不是错误。',
  },
]

const EN_CRITERIA = [
  '拼写稳定：只有一种通行拼法，不会出现 Katherine / Catherine / Kathryn 这种一辈子要拼给别人听的情况。',
  '没有明显负面含义或双关，不会成为班上起外号的素材。',
  '发音在英语里是规则的，老师第一次看到就能念对。',
  '标注昵称牵引：Elizabeth 会被叫成 Liz、Beth、Eliza，你得先接受这件事。',
  '标注当下的流行度：太流行意味着班上不止一个。',
]

const CHECKLIST = [
  '把名字念出来。姓 + 名连着念十遍，再让家里人念一遍，听听有没有你没想到的谐音。',
  '写出来。用手写一遍，看看笔画多不多、两个字长得像不像。',
  '在搜索引擎里搜「姓名」全名，看有没有撞上公众人物或负面新闻。',
  '如果在国内上户口，去当地派出所确认这两个字在户籍系统的规范字库里。生僻字会办不了证件。',
  '如果孩子会在英语国家上学，把拼音写下来给一个英语母语的朋友念，听听实际效果。',
  '检查英文全名的首字母缩写，别拼出奇怪的词。',
  '想好将来的护照写法：中文名的拼音是连写还是分开，一旦定了就很难改。',
]

export function Guide() {
  return (
    <div className="col">
      <div className="page-head">
        <h1>取名指南</h1>
        <div className="sub">怎么用这个工具，以及它做不到什么</div>
      </div>

      <div className="note info" style={{ marginBottom: 18 }}>
        名渡是一个<strong>本地运行</strong>的取名工具。所有计算都发生在你的浏览器里，
        没有服务器，不收集任何数据，也不需要注册。
      </div>

      <h2 style={{ fontSize: 15, margin: '18px 0 10px' }}>五个最常见的坑</h2>
      {PITFALLS.map((p) => (
        <div className="guide-item" key={p.h}>
          <h3>{p.h}</h3>
          <p>{p.p}</p>
          <div className="example">{p.e}</div>
        </div>
      ))}

      <h2 style={{ fontSize: 15, margin: '24px 0 10px' }}>英文名是按什么标准收的</h2>
      <div className="guide-item">
        <p>库里 {ENGLISH_NAMES.length} 个名字，每一个都要同时满足下面几条：</p>
        <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 13.5, lineHeight: 1.85, color: 'var(--ink-2)' }}>
          {EN_CRITERIA.map((c) => <li key={c}>{c}</li>)}
        </ul>
        <div className="example">
          本站<strong>不强求</strong>中英文名发音一致。硬凑出来的往往两边都不自然。
          配对只给三种理由：读音相近、含义呼应、气质一致，你自己选哪个更重要。
        </div>
      </div>

      <h2 style={{ fontSize: 15, margin: '24px 0 10px' }}>五行是怎么算的</h2>
      <div className="guide-item">
        <p>
          本站做的是<strong>确定的历法换算</strong>：用天文算法求真节气，据此定年柱和月柱；
          日柱按干支纪日推算；时柱按真太阳时定时辰。地支藏干按本气、中气、余气加权，得出五行分布。
        </p>
        <div className="example">
          真太阳时是个容易被忽略的细节。奥克兰在东经 174.76 度，而 UTC+12 的中央经线是 180 度，
          两者差 21 分钟。出生时间接近时辰边界时，这 21 分钟会直接改变时柱。
          本站收录了 {CITIES.length} 个城市的经度和时区来做这个校正。
        </div>
        <div className="example" style={{ borderLeftColor: 'var(--amber-line)' }}>
          <strong>但也要说清楚三件事：</strong>
          一、字的五行归属按字形部首划分，这只是众多流派中的一种，别的流派结论会不一样；
          二、太阳位置用的是低精度公式，误差约十几分钟，出生时刻正好压在交节点上时请另查权威万年历；
          三、本站<strong>不做旺衰判断，不做吉凶预测</strong>。五行在这里只是一个可选的排序维度。
        </div>
      </div>

      <h2 style={{ fontSize: 15, margin: '24px 0 10px' }}>定下来之前，请走一遍这个清单</h2>
      <div className="guide-item">
        <ol className="checklist">
          {CHECKLIST.map((c, i) => (
            <li key={c}><span className="n">{i + 1}</span><span>{c}</span></li>
          ))}
        </ol>
      </div>

      <h2 style={{ fontSize: 15, margin: '24px 0 10px' }}>名字已经定了也用得上</h2>
      <div className="guide-item">
        <p>
          顶部切到「已有名字」，输入已经定下的中文名或英文名，会给出逐字解读、
          谐音检查，以及最要紧的那一项 —— <strong>这个名字在英语环境里会被念成什么</strong>。
          哪怕名字改不了了，提前知道也好过等孩子上学才发现。
        </p>
        <div className="example">
          输中文名会配出英文名，输英文名会配出中文名，两个方向都给理由。
          字库覆盖不到的字会如实说「不认识」，不会猜一个读音给你。
        </div>
      </div>

      <h2 style={{ fontSize: 15, margin: '24px 0 10px' }}>关于 AI 功能</h2>
      <div className="guide-item">
        <p>
          AI 是<strong>可选的</strong>，默认关闭。不开它，整个网站完全离线运行。
          开启需要你自己的 Groq API Key，免费额度不用充值。Groq 用自研的推理芯片，同样是免费额度但快得多。
        </p>
        <p style={{ marginTop: 8 }}>
          三个功能都刻意做成「AI 只负责表达，判断仍然由本地引擎给出」：
        </p>
        <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13.5, lineHeight: 1.85, color: 'var(--ink-2)' }}>
          <li><b>说一句话设条件</b>：把你的描述翻译成筛选条件。名字仍由本地引擎生成，
            AI 给的每个条件都会先经过白名单校验，不合法的当场丢掉并告诉你丢了什么。</li>
          <li><b>解读一个名字</b>：基于本站已经算好的字义和出处写一段话。
            提示词里明确禁止它编造典故 —— 资料里没有出处，它就不能说有。</li>
          <li><b>点评你的心选</b>：把候选名单和已算好的资料给它，让它比较并给倾向性建议。</li>
        </ul>
        <div className="example" style={{ borderLeftColor: 'var(--amber-line)' }}>
          <strong>开启 AI 就意味着数据会离开这台设备。</strong>
          你在「说一句话」里写的原文、让 AI 解读的名字、让 AI 点评的收藏名单（含你写的备注），
          都会发送到 Groq。
          出生日期、时间、城市和排出来的八字不会随这些功能发出去。
          API Key 只存在本机浏览器里，也不会写进导出的备份文件。
        </div>
        <div className="example">
          说到底，AI 在这里是个表达层。名字好不好、有没有谐音事故、英语里怎么念，
          这些结论仍然来自可核对的规则，不来自模型。
        </div>
      </div>

      <h2 style={{ fontSize: 15, margin: '24px 0 10px' }}>这个工具做不到什么</h2>
      <div className="guide-item">
        <p>
          说清楚边界比多列功能重要。下面这些本站<strong>没有</strong>，也不会假装有：
        </p>
        <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 13.5, lineHeight: 1.85, color: 'var(--ink-2)' }}>
          <li>公安户籍系统的实时规范字库 —— 生僻字能不能上户口，只有派出所说了算。</li>
          <li>全国重名数据库 —— 「少见用字」是基于用字频率的估计，不是真实的重名率。</li>
          <li>专业八字排盘的旺衰喜忌判断 —— 那需要真正的命理师，不是一段代码。</li>
          <li>跨设备云同步 —— 数据只在这台设备上，换设备请用「导出备份」。</li>
          <li>AI 也不会替你做决定 —— 它没见过你的孩子，也不知道你家里的讲究。</li>
        </ul>
      </div>

      <div className="note" style={{ margin: '20px 0 32px' }}>
        字库共 {CHARACTERS.length} 个取名用字，典籍出处 {SOURCES.length} 句（全部为公有领域的先秦至宋代文本）。
        名字的出处只有在两个字<strong>确实出现在同一句里</strong>时才会标注，不做拼凑。
      </div>
    </div>
  )
}
