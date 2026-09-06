import { describe, expect, it, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { resetAppStateForTests } from './store/useAppState'

beforeEach(() => {
  localStorage.clear()
  resetAppStateForTests()
  window.location.hash = ''
})

describe('主流程', () => {
  it('填上姓氏就立刻出名字，不需要走完向导', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByText('先填一个姓')).toBeInTheDocument()

    await user.type(screen.getByLabelText('宝宝的姓氏'), '林')

    const cards = await screen.findAllByRole('button', { name: /点开看详细解释$/ })
    expect(cards.length).toBe(12)
    expect(cards[0]).toHaveTextContent('林')
  })

  it('用中文输入法能打出姓氏（拼音在组字过程中不能被抹掉）', async () => {
    render(<App />)
    const el = screen.getByLabelText('宝宝的姓氏') as HTMLInputElement

    fireEvent.compositionStart(el)
    for (const s of ['c', 'ch', 'che', 'chen']) {
      fireEvent.change(el, { target: { value: s } })
    }
    expect(el.value, '拼音被清空，输入法就出不来候选词').toBe('chen')

    fireEvent.change(el, { target: { value: '陈' } })
    fireEvent.compositionEnd(el, { target: { value: '陈' } })

    const cards = await screen.findAllByRole('button', { name: /点开看详细解释$/ })
    expect(cards[0]).toHaveTextContent('陈')
  })

  it('复姓也能用输入法打出来，不会被长度限制卡在半路', async () => {
    render(<App />)
    const el = screen.getByLabelText('宝宝的姓氏') as HTMLInputElement

    fireEvent.compositionStart(el)
    for (const s of ['o', 'ou', 'ouy', 'ouya', 'ouyan', 'ouyang']) {
      fireEvent.change(el, { target: { value: s } })
    }
    expect(el.value).toBe('ouyang')

    fireEvent.change(el, { target: { value: '欧阳' } })
    fireEvent.compositionEnd(el, { target: { value: '欧阳' } })

    const cards = await screen.findAllByRole('button', { name: /点开看详细解释$/ })
    expect(cards[0]).toHaveTextContent('欧阳')
  })

  it('姓氏不是汉字时给出明确提示', async () => {
    const user = userEvent.setup()
    render(<App />)
    const input = screen.getByLabelText('宝宝的姓氏')
    await user.type(input, 'abc')
    // 非汉字直接被过滤掉，输入框保持为空
    expect(input).toHaveValue('')
    expect(screen.getByText('先填一个姓')).toBeInTheDocument()
  })

  it('收藏后出现在心选里，并且刷新后还在', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await user.type(screen.getByLabelText('宝宝的姓氏'), '陈')

    const favButtons = await screen.findAllByRole('button', { name: /^收藏 / })
    const favLabel = favButtons[0].getAttribute('aria-label')!
    const favName = favLabel.replace('收藏 ', '')
    await user.click(favButtons[0])

    await user.click(screen.getByRole('button', { name: /心选/ }))
    expect(await screen.findByRole('heading', { name: '心选' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `移除 ${favName}` })).toBeInTheDocument()

    // 模拟重新打开页面
    unmount()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /心选/ }))
    expect(await screen.findByRole('button', { name: `移除 ${favName}` })).toBeInTheDocument()
  })

  it('详情弹层给出逐字解释和评分依据', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('宝宝的姓氏'), '林')
    const cards = await screen.findAllByRole('button', { name: /点开看详细解释$/ })
    await user.click(cards[0])

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('逐字来看')).toBeInTheDocument()
    expect(within(dialog).getByText('评分是怎么来的')).toBeInTheDocument()
    expect(within(dialog).getByText('在英语环境里会被怎么念')).toBeInTheDocument()
    expect(within(dialog).getByText('配一个英文名')).toBeInTheDocument()
  })

  it('按 Esc 能关掉弹层', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('宝宝的姓氏'), '林')
    const cards = await screen.findAllByRole('button', { name: /点开看详细解释$/ })
    await user.click(cards[0])
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('必含字和避讳字冲突时给出提示', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('宝宝的姓氏'), '林')
    await user.click(await screen.findByRole('button', { name: /^条件/ }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('必须含这个字'), '文')
    await user.type(within(dialog).getByLabelText('要避开的字'), '文')
    expect(await within(dialog).findByText(/同时出现在必含字和避讳字里/)).toBeInTheDocument()
  })

  it('选了按八字自动但没填出生信息时，说清楚还缺什么', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('宝宝的姓氏'), '林')
    await user.click(await screen.findByRole('button', { name: /^条件/ }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: '按八字自动' }))
    expect(await within(dialog).findByText(/还需要填出生日期/)).toBeInTheDocument()
  })

  it('分享链接打开的是只读页面', async () => {
    const code = btoa(
      String.fromCharCode(
        ...new TextEncoder().encode(JSON.stringify({ v: 1, s: '陈', n: [{ g: '嘉禾' }] })),
      ),
    ).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    window.location.hash = `#/share/${code}`
    render(<App />)
    expect(await screen.findByText('候选名单')).toBeInTheDocument()
    expect(screen.getByText(/这个页面是只读的/)).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '主导航' })).not.toBeInTheDocument()
  })

  it('指南页说清楚这个工具做不到什么', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /指南/ }))
    expect(await screen.findByText('这个工具做不到什么')).toBeInTheDocument()
    expect(screen.getByText(/公安户籍系统的实时规范字库/)).toBeInTheDocument()
  })
})
