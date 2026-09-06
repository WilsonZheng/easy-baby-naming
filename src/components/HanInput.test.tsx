import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { HanInput } from './HanInput'

/** 模拟中文输入法的完整过程：组字 -> 打拼音 -> 选字上屏 */
function typeWithIME(el: HTMLInputElement, pinyin: string, hanzi: string) {
  fireEvent.compositionStart(el)
  for (let i = 1; i <= pinyin.length; i++) {
    fireEvent.change(el, { target: { value: pinyin.slice(0, i) } })
  }
  // 选字：输入框内容被替换成汉字，然后 compositionend
  fireEvent.change(el, { target: { value: hanzi } })
  fireEvent.compositionEnd(el, { target: { value: hanzi } })
}

function Harness({ maxChars, initial = '' }: { maxChars?: number; initial?: string }) {
  const [v, setV] = useState(initial)
  return (
    <>
      <HanInput value={v} onChange={setV} maxChars={maxChars} aria-label="姓氏" />
      <span data-testid="out">{v}</span>
    </>
  )
}

describe('中文输入法', () => {
  it('组字过程中拼音不会被抹掉', () => {
    render(<Harness />)
    const el = screen.getByLabelText('姓氏') as HTMLInputElement

    fireEvent.compositionStart(el)
    fireEvent.change(el, { target: { value: 'l' } })
    expect(el.value).toBe('l')
    fireEvent.change(el, { target: { value: 'li' } })
    expect(el.value).toBe('li')
    fireEvent.change(el, { target: { value: 'lin' } })
    expect(el.value, '拼音被清空了，输入法就没法出候选词').toBe('lin')
  })

  it('组字过程中不会把半成品上报给外面', () => {
    const onChange = vi.fn()
    render(<HanInput value="" onChange={onChange} aria-label="姓氏" />)
    const el = screen.getByLabelText('姓氏') as HTMLInputElement
    fireEvent.compositionStart(el)
    fireEvent.change(el, { target: { value: 'lin' } })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('选字上屏后拿到汉字', () => {
    render(<Harness />)
    const el = screen.getByLabelText('姓氏') as HTMLInputElement
    typeWithIME(el, 'lin', '林')
    expect(screen.getByTestId('out')).toHaveTextContent('林')
  })

  it('复姓打得出来：ouyang 有六个字母，不能被长度限制卡死', () => {
    render(<Harness maxChars={2} />)
    const el = screen.getByLabelText('姓氏') as HTMLInputElement
    fireEvent.compositionStart(el)
    for (const s of ['o', 'ou', 'ouy', 'ouya', 'ouyan', 'ouyang']) {
      fireEvent.change(el, { target: { value: s } })
    }
    expect(el.value, '拼音在中途被截断，复姓就打不出来').toBe('ouyang')
    fireEvent.change(el, { target: { value: '欧阳' } })
    fireEvent.compositionEnd(el, { target: { value: '欧阳' } })
    expect(screen.getByTestId('out')).toHaveTextContent('欧阳')
  })

  it('上屏之后才做长度截断', () => {
    render(<Harness maxChars={2} />)
    const el = screen.getByLabelText('姓氏') as HTMLInputElement
    typeWithIME(el, 'shangguanwan', '上官婉')
    expect(screen.getByTestId('out')).toHaveTextContent('上官')
  })

  it('上屏之后才过滤掉非汉字', () => {
    render(<Harness />)
    const el = screen.getByLabelText('姓氏') as HTMLInputElement
    fireEvent.change(el, { target: { value: 'abc林def' } })
    expect(screen.getByTestId('out')).toHaveTextContent('林')
  })

  it('直接粘贴汉字也能用', () => {
    render(<Harness maxChars={2} />)
    const el = screen.getByLabelText('姓氏') as HTMLInputElement
    fireEvent.change(el, { target: { value: '欧阳' } })
    expect(screen.getByTestId('out')).toHaveTextContent('欧阳')
  })

  it('输入法没发 compositionend 就失焦时，失焦兜底提交', () => {
    render(<Harness />)
    const el = screen.getByLabelText('姓氏') as HTMLInputElement
    fireEvent.compositionStart(el)
    fireEvent.change(el, { target: { value: '陈' } })
    expect(screen.getByTestId('out')).toHaveTextContent('')
    fireEvent.blur(el, { target: { value: '陈' } })
    expect(screen.getByTestId('out')).toHaveTextContent('陈')
  })

  it('外部改值（读取历史、导入备份）会同步进来', () => {
    const { rerender } = render(<HanInput value="李" onChange={() => {}} aria-label="姓氏" />)
    const el = screen.getByLabelText('姓氏') as HTMLInputElement
    expect(el.value).toBe('李')
    rerender(<HanInput value="王" onChange={() => {}} aria-label="姓氏" />)
    expect(el.value).toBe('王')
  })

  it('组字中途外部改值不会打断用户正在打的字', () => {
    const { rerender } = render(<HanInput value="李" onChange={() => {}} aria-label="姓氏" />)
    const el = screen.getByLabelText('姓氏') as HTMLInputElement
    fireEvent.compositionStart(el)
    fireEvent.change(el, { target: { value: 'wang' } })
    rerender(<HanInput value="张" onChange={() => {}} aria-label="姓氏" />)
    expect(el.value).toBe('wang')
  })
})
