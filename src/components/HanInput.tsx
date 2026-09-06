import { useEffect, useRef, useState } from 'react'

/**
 * 汉字输入框。
 *
 * 中文输入法的工作方式是：先把拼音塞进输入框（组字中），用户选字后才替换成汉字。
 * 如果在组字过程中就过滤掉非汉字，拼音会被逐字抹掉，候选词根本出不来 ——
 * 结果就是完全打不了中文。同理，maxLength 也不能直接加在 input 上，
 * 「欧阳」的拼音 ouyang 有 6 个字母，会被 maxLength=2 卡死。
 *
 * 所以：组字期间原样显示、不过滤、不上报；组字结束（或直接粘贴汉字）时
 * 再做过滤和长度截断。
 */
interface Props {
  value: string
  onChange: (value: string) => void
  /** 最多保留几个字符，不限则不传 */
  maxChars?: number
  /** 同时允许拉丁字母（用于「中文名或英文名都行」的输入框） */
  allowLatin?: boolean
  id?: string
  className?: string
  placeholder?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
}

const NON_HAN = /[^一-龥]/g
const NON_HAN_OR_LATIN = /[^一-龥A-Za-z'\- ]/g

export function HanInput({
  value, onChange, maxChars, allowLatin, className = 'input', ...rest
}: Props) {
  const composing = useRef(false)
  const [draft, setDraft] = useState(value)

  // 外部改了值（读取历史、导入备份）时同步进来，但不要打断正在进行的组字
  useEffect(() => {
    if (!composing.current) setDraft(value)
  }, [value])

  const commit = (raw: string) => {
    let clean = raw.replace(allowLatin ? NON_HAN_OR_LATIN : NON_HAN, '')
    if (maxChars !== undefined) clean = clean.slice(0, maxChars)
    setDraft(clean)
    if (clean !== value) onChange(clean)
  }

  return (
    <input
      {...rest}
      className={className}
      value={draft}
      onCompositionStart={() => { composing.current = true }}
      onCompositionEnd={(e) => {
        composing.current = false
        commit(e.currentTarget.value)
      }}
      onChange={(e) => {
        const raw = e.target.value
        // nativeEvent.isComposing 是最可靠的信号；个别浏览器不给，就用自己记的状态兜底
        const isComposing =
          (e.nativeEvent as InputEvent).isComposing ?? composing.current
        if (isComposing || composing.current) {
          setDraft(raw) // 组字中：原样显示，等选完字再处理
          return
        }
        commit(raw)
      }}
      onBlur={(e) => {
        // 有的输入法在失焦时不发 compositionend，兜一下底
        if (composing.current) {
          composing.current = false
          commit(e.currentTarget.value)
        }
      }}
    />
  )
}
