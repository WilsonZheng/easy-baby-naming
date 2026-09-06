import type { BaziResult } from '../engine/bazi'
import type { Element } from '../data/characters'

const ORDER: Element[] = ['金', '木', '水', '火', '土']

export function BaziPanel({ bazi, cityName }: { bazi: BaziResult; cityName: string }) {
  const max = Math.max(...Object.values(bazi.elements), 1)
  const offset = bazi.trueSolarOffsetMinutes

  return (
    <div>
      <div className="pillars">
        {[
          { cap: '年柱', p: bazi.year },
          { cap: '月柱', p: bazi.month },
          { cap: '日柱', p: bazi.day },
          { cap: '时柱', p: bazi.hour },
        ].map(({ cap, p }) => (
          <div className={p ? 'pillar' : 'pillar empty-pillar'} key={cap}>
            <div className="cap">{cap}</div>
            <div className="gz">{p ? p.label : '—'}</div>
            <div className="el">{p ? '' : '未填时间'}</div>
          </div>
        ))}
      </div>

      <div className="element-bars">
        {ORDER.map((el) => {
          const v = bazi.elements[el]
          const cls = v === 0 ? 'fill zero' : v < max * 0.35 ? 'fill low' : 'fill'
          return (
            <div className="element-bar" key={el}>
              <span className="name">{el}</span>
              <span className="track"><span className={cls} style={{ width: `${(v / max) * 100}%` }} /></span>
              <span className="num">{v}</span>
            </div>
          )
        })}
      </div>

      <div className="kv-list" style={{ marginTop: 14 }}>
        <div className="kv">
          <span className="k">节气</span>
          <span className="v">
            出生在「{bazi.termWindow.current}」之后，下一个节气是「{bazi.termWindow.next}」
          </span>
        </div>
        {bazi.trueSolarTime && (
          <div className="kv">
            <span className="k">真太阳时</span>
            <span className="v">
              {bazi.trueSolarTime}
              <span style={{ color: 'var(--ink-3)' }}>
                {` （${cityName}的经度让真太阳时比当地钟表${offset >= 0 ? '早' : '晚'} ${Math.abs(offset)} 分钟，时柱按真太阳时算）`}
              </span>
            </span>
          </div>
        )}
        <div className="kv">
          <span className="k">五行分布</span>
          <span className="v">
            {bazi.missing.length > 0
              ? `完全没有出现的是${bazi.missing.join('、')}`
              : `五行齐全，最弱的是${bazi.weakest.join('、') || bazi.strongest}`}
            ，最旺的是{bazi.strongest}
          </span>
        </div>
      </div>

      {bazi.nearTermBoundary && (
        <div className="note warn" style={{ marginTop: 12 }}>
          出生时刻距离交节只有几十分钟。本站用的天文算法精度约十几分钟，这种临界情况请再查一次权威万年历确认月柱。
        </div>
      )}

      <div className="note" style={{ marginTop: 12 }}>
        这里只做确定的历法换算：干支纪年月日时、地支藏干、五行加权统计。
        <strong>不做旺衰断语，也不预测命运。</strong>
        不同流派对「补什么」的判断差别很大，请把它当成一个可选的参考维度，而不是标准答案。
      </div>
    </div>
  )
}
