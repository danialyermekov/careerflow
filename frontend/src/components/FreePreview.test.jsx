import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Simulate } from 'react-dom/test-utils'
import { AppProvider } from '../context/AppContext'
import { translations } from '../i18n'
import * as api from '../utils/api'
import FreePreview from './FreePreview'

jest.mock('../utils/api')
let root, container
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  api.getTrialStatus.mockResolvedValue({ available: true, remaining: 3, total: 3 })
  api.sendTrialMessage.mockResolvedValue({ response: 'Learn SQL first.', remaining: 2, provider: 'gemini' })
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container)
})
afterEach(() => { act(() => root.unmount()); container.remove(); jest.clearAllMocks() })

test.each(['en', 'ru', 'kk'])('preview is localized in %s, needs consent and never sends automatically', async lang => {
  const text = translations[lang].experience
  await act(async () => root.render(<AppProvider initialLanguage={lang}><FreePreview sessionId="owned-session" /></AppProvider>))
  expect(container.textContent).toContain(text.remaining(3, 3))
  const suggested = [...container.querySelectorAll('button')].find(button => button.textContent === text.suggestions[0])
  expect(suggested.disabled).toBe(true)
  expect(api.sendTrialMessage).not.toHaveBeenCalled()
  await act(async () => Simulate.change(container.querySelector('input[type="checkbox"]'), { target: { checked: true } }))
  await act(async () => suggested.click())
  expect(api.sendTrialMessage).toHaveBeenCalledWith('owned-session', [], text.suggestions[0], lang)
  expect(container.textContent).toContain(text.remaining(2, 3))
  expect(container.textContent).toContain('Gemini: Learn SQL first.')
  expect(container.textContent).not.toContain('Claude: Learn SQL first.')
})

test('unavailable preview hides quota and disabled chat, and offers BYOK', async () => {
  api.getTrialStatus.mockResolvedValue({ available: false, remaining: 1, total: 3 })
  const onByok = jest.fn()
  await act(async () => root.render(<AppProvider initialLanguage="en"><FreePreview sessionId="owned-session" onByok={onByok} /></AppProvider>))
  expect(container.textContent).not.toContain('1 of 3 free messages remaining')
  expect(container.textContent).toContain(translations.en.experience.unavailable)
  expect(api.sendTrialMessage).not.toHaveBeenCalled()
  expect(container.querySelector('textarea')).toBeNull()
  expect(container.querySelector('h3')).toBeNull()
  expect(container.querySelectorAll('button')).toHaveLength(1)
  expect(container.querySelector('button').textContent).toBe(translations.en.experience.connectKey)
  await act(async () => container.querySelector('button').click())
  expect(onByok).toHaveBeenCalledTimes(1)
})

test('exhausted preview identifies quota exhaustion separately', async () => {
  api.getTrialStatus.mockResolvedValue({ available: true, remaining: 0, total: 3 })
  await act(async () => root.render(<AppProvider initialLanguage="en"><FreePreview sessionId="owned-session" /></AppProvider>))
  expect(container.textContent).toContain(translations.en.experience.exhausted)
  expect(container.textContent).not.toContain(translations.en.experience.unavailable)
  expect(container.querySelector('textarea')).toBeNull()
})
