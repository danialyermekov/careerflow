import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Simulate } from 'react-dom/test-utils'
import { AppProvider } from '../context/AppContext'
import Navbar from './Navbar'

jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false }) }))

let container, root
beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => root.render(<AppProvider><Navbar /></AppProvider>))
})
afterEach(() => { act(() => root.unmount()); container.remove() })

test('settings disclosure keeps sign-in outside and Escape closes it and restores focus', async () => {
  const trigger = container.querySelector('button[aria-expanded]')
  const panel = document.getElementById(trigger.getAttribute('aria-controls'))
  expect(panel.contains(container.querySelector('a[href="/#login"]'))).toBe(false)
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  await act(async () => trigger.click())
  expect(panel.dataset.open).toBe('true')
  const language = [...panel.querySelectorAll('button')].find(el => el.textContent === 'RU')
  language.focus()
  await act(async () => Simulate.keyDown(language, { key: 'Escape' }))
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  expect(panel.dataset.open).toBe('false')
  expect(document.activeElement).toBe(trigger)
})

test('language and theme changes keep the disclosure usable; leaving navigation closes it', async () => {
  const trigger = container.querySelector('button[aria-expanded]')
  await act(async () => trigger.click())
  await act(async () => [...container.querySelectorAll('button')].find(el => el.textContent === 'RU').click())
  expect(trigger.getAttribute('aria-label')).toBe('Настройки интерфейса')
  expect(trigger.getAttribute('aria-expanded')).toBe('true')
  await act(async () => container.querySelector('button[title]').click())
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(trigger.getAttribute('aria-expanded')).toBe('true')
  await act(async () => Simulate.blur(trigger, { relatedTarget: document.body }))
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  expect(localStorage.getItem('lang')).toBe('ru')
  expect(localStorage.getItem('theme')).toBe('dark')
})
