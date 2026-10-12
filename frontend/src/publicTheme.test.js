/** @jest-environment node */
const fs = require('node:fs')
const path = require('node:path')
const { JSDOM } = require('jsdom')
const template = fs.readFileSync(path.resolve(__dirname, '../public/index.html'), 'utf8')

test.each([[null, 'light'], ['dark', 'dark'], ['light', 'light'], ['invalid', 'light']])(
  'initial HTML applies preference %s before React loads', (stored, expected) => {
    const dom = new JSDOM(template, {
      url: 'https://careerflow.test/', runScripts: 'dangerously',
      beforeParse(window) { if (stored) window.localStorage.setItem('theme', stored) },
    })
    expect(dom.window.document.documentElement.dataset.theme).toBe(expected)
    expect(dom.window.document.querySelector('meta[name="theme-color"]').content).toBe(expected === 'dark' ? '#07090d' : '#FBFBFA')
    dom.window.close()
  }
)

test('initial HTML remains light when browser storage is blocked', () => {
  const dom = new JSDOM(template, {
    url: 'https://careerflow.test/', runScripts: 'dangerously',
    beforeParse(window) { Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked') } }) },
  })
  expect(dom.window.document.documentElement.dataset.theme).toBe('light')
  dom.window.close()
})
