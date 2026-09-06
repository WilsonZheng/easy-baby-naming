import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sheet } from './Sheet'

/**
 * 复现手机端「一输入键盘就被收起」的场景：
 * 父组件每次渲染都新建一个 onClose，用户每敲一个字都会触发重渲染。
 */
function Harness() {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(true)
  return (
    <Sheet open={open} title="说说你想要什么样的名字" onClose={() => setOpen(false)}>
      <textarea
        aria-label="一句话"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </Sheet>
  )
}

describe('弹层里的输入不会被打断', () => {
  it('连续输入时焦点始终留在输入框里', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const box = screen.getByLabelText('一句话')

    await user.click(box)
    expect(document.activeElement).toBe(box)

    for (const ch of ['姓', '陈', '女', '孩']) {
      await user.keyboard(ch)
      expect(document.activeElement, `打「${ch}」之后焦点被抢走了`).toBe(box)
    }
    expect(box).toHaveValue('姓陈女孩')
  })

  it('父组件重渲染（onClose 换了身份）不会把焦点抢走', () => {
    function Wrapper({ tick }: { tick: number }) {
      return (
        <Sheet open title="标题" onClose={() => void tick}>
          <input aria-label="输入" />
        </Sheet>
      )
    }
    const { rerender } = render(<Wrapper tick={0} />)
    const input = screen.getByLabelText('输入')
    input.focus()
    expect(document.activeElement).toBe(input)

    for (let i = 1; i <= 5; i++) {
      rerender(<Wrapper tick={i} />)
      expect(document.activeElement, `第 ${i} 次重渲染后焦点跑了`).toBe(input)
    }
  })

  it('打开时焦点落在弹层容器上，而不是里面的第一个按钮', () => {
    render(
      <Sheet open title="标题" onClose={() => {}}>
        <button>第一个按钮</button>
      </Sheet>,
    )
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: '第一个按钮' }))
  })

  it('Esc 仍然能关闭，且用的是最新的 onClose', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(<Sheet open title="标题" onClose={first}><div /></Sheet>)
    rerender(<Sheet open title="标题" onClose={second}><div /></Sheet>)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
