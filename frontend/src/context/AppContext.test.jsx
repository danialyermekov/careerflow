import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider, useApp } from './AppContext'

function Preferences() {
  const { theme, toggleTheme, lang, setLanguage } = useApp()
  return <>
    <button onClick={toggleTheme}>{theme}</button>
    <button onClick={() => setLanguage('kk')}>{lang}</button>
  </>
}

let container, root
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  jest.restoreAllMocks()
})

test.each([null, 'invalid'])('new or invalid preference %s starts light and saves a usable dark toggle', stored => {
  if (stored) localStorage.setItem('theme', stored)
  act(() => root.render(<AppProvider><Preferences /></AppProvider>))
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(localStorage.getItem('theme')).toBe('light')
  act(() => container.querySelector('button').click())
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem('theme')).toBe('dark')
})

test.each(['en', 'ru', 'kk'])('saved dark preference survives %s language changes and remount', lang => {
  localStorage.setItem('theme', 'dark')
  localStorage.setItem('lang', lang)
  act(() => root.render(<AppProvider><Preferences /></AppProvider>))
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(document.documentElement.lang).toBe(lang)
  act(() => container.querySelectorAll('button')[1].click())
  expect(document.documentElement.lang).toBe('kk')
  expect(document.documentElement.dataset.theme).toBe('dark')
  act(() => root.unmount())
  root = createRoot(container)
  act(() => root.render(<AppProvider><Preferences /></AppProvider>))
  expect(document.documentElement.dataset.theme).toBe('dark')
  act(() => container.querySelector('button').click())
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(localStorage.getItem('theme')).toBe('light')
})

test('unavailable browser storage keeps the light default and theme toggle usable', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked') })
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked') })
  act(() => root.render(<AppProvider><Preferences /></AppProvider>))
  expect(document.documentElement.dataset.theme).toBe('light')
  act(() => container.querySelector('button').click())
  expect(document.documentElement.dataset.theme).toBe('dark')
})
