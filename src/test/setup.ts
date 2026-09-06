import '@testing-library/jest-dom/vitest'

// jsdom 没有实现 scrollTo，组件里用它只是为了切页时回到顶部，测试里安全地忽略
window.scrollTo = () => {}
