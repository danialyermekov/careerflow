import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Simulate } from 'react-dom/test-utils'
import App from './App'
import { DEMO_PROFILE, isDemoSession } from './utils/demoProfile'
import * as api from './utils/api'

jest.mock('./utils/api')
jest.mock('framer-motion', () => {
  const React = require('react')
  return { AnimatePresence: ({ children }) => <>{children}</>, motion: { main: ({ children }) => <main>{children}</main> }, useReducedMotion: () => false }
})

const result = {
  session_id: 'review-test-session', top_profession: 'Data Analyst', alternative_profession: 'Data Scientist',
  final_scores: { 'Data Analyst': 0.905, 'Data Scientist': 0.3933 },
  classification_scores: { 'Data Analyst': 0.6, 'Data Scientist': 0.2 },
  skill_scores: { 'Data Analyst': 0.3, 'Data Scientist': 0.15 },
  demand_scores: { 'Data Analyst': { trend_score: 0.8, market_share: 0.6, predicted_vacancies: 500 }, 'Data Scientist': { trend_score: 0.4, market_share: 0.2, predicted_vacancies: 200 } },
  scoring_weights: { classifier: 0.38, skill_matcher: 0.35, demand_trend: 0.2, demand_market_share: 0.07 },
  roadmap_with_courses: { analyst_tools: { tableau: { courses: [] } } },
  full_roadmap: { analyst_tools: ['tableau', 'excel'] },
  _formData: DEMO_PROFILE,
}
let container, root
const button = text => [...container.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') || el.textContent) === text)
const tourButton = text => [...container.querySelectorAll('.guidedTour button')].find(el => el.textContent === text)

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true
  window.history.replaceState({}, '', '/')
  localStorage.clear(); sessionStorage.clear(); localStorage.setItem('lang', 'en')
  window.scrollTo = jest.fn()
  window.scrollBy = jest.fn()
  HTMLElement.prototype.scrollIntoView = jest.fn()
  api.getRecommendation.mockResolvedValue(result)
  api.getRecommendationHistory.mockResolvedValue({ items: [] })
  api.getRecommendationState.mockResolvedValue({ results: result, progress: {} })
  api.saveRoadmapProgress.mockResolvedValue({})
  api.saveCourseFilterPreferences.mockResolvedValue({})
  api.filterCourses.mockResolvedValue({})
  api.getPublicFeedback.mockResolvedValue({ items: [], has_more: false })
  api.getPublicRoadmap.mockResolvedValue({ items: [], has_more: false })
  api.getTrialStatus.mockResolvedValue({ available: false, remaining: 0, total: 3 })
  container = document.createElement('div'); document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => { act(() => root.unmount()); container.remove(); jest.clearAllMocks() })

test('text-only branding appears in navbar and footer in both themes and keeps home navigation', async () => {
  localStorage.setItem('theme', 'dark')
  window.history.replaceState({}, '', '/#about')
  await act(async () => root.render(<App />))
  const home = container.querySelector('nav a[aria-label="CareerFlow"]')
  const headerLogo = home.querySelector('span')
  expect(headerLogo.textContent).toBe('CareerFlow')
  expect(container.querySelector('footer a[aria-label="CareerFlow"]').textContent).toBe('CareerFlow')
  expect(home.querySelector('img,picture,source')).toBeNull()
  expect(home.querySelector('svg')).toBeNull()
  expect(document.documentElement.dataset.theme).toBe('dark')
  await act(async () => container.querySelector('nav button[title]').click())
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(home.querySelector('span')).toBe(headerLogo)
  await act(async () => home.click())
  expect(window.location.hash).toBe('')
  expect(container.textContent).toContain('How CareerFlow works')
})

test('live demo calls the real API directly and guides all five steps without an AI request', async () => {
  await act(async () => root.render(<App />))
  expect(container.textContent).toContain('How CareerFlow works')
  expect(container.textContent).toContain('No AI key required')
  expect(container.textContent).toContain('limited free AI preview')
  expect(container.textContent).not.toContain('generates examples for missing classes')
  expect([...container.querySelectorAll('a')].map(a => a.href)).toEqual(expect.arrayContaining([
    'https://huggingface.co/datasets/lukebarousse/data_jobs',
    'https://www.kaggle.com/datasets/hafsaatm/career-path-recommendation',
  ]))
  await act(async () => button('Try the demo').click())
  expect(api.getRecommendation).toHaveBeenCalledWith({ ...DEMO_PROFILE, lang: 'en' }, { demo: true })
  expect(container.querySelector('#profile-gpa')).toBeNull()
  expect(isDemoSession(result.session_id)).toBe(true)
  expect(window.location.hash).toBe('#results/review-test-session')
  expect(container.textContent).toContain('90.5 / 100')
  expect(container.textContent).toContain('+28.50 points')
  expect(container.textContent).toContain('0.60000')
  expect(container.querySelectorAll('.aiFab')).toHaveLength(1)
  expect(container.querySelectorAll('main')).toHaveLength(1)
  expect(container.querySelector('.guidedTour').textContent).toContain('Your Recommendation')
  await act(async () => button('Next').click())
  expect(container.querySelector('.guidedTour').textContent).toContain('Why This Career?')
  await act(async () => tourButton('Back').click())
  expect(container.querySelector('.guidedTour').textContent).toContain('Your Recommendation')
  await act(async () => button('Next').click())
  await act(async () => button('Next').click())
  expect(container.querySelector('.guidedTour').textContent).toContain('Compare Career Paths')
  await act(async () => button('Next').click())
  expect(container.textContent).toContain('Tableau')
  expect(container.textContent).toContain('Completed 0 of 1 steps')
  await act(async () => Simulate.change(container.querySelector('input[type="checkbox"][aria-label="Tableau"]'), { target: { checked: true } }))
  expect(container.textContent).toContain('Completed 1 of 1 steps')
  await act(async () => button('Next').click())
  expect(container.querySelector('.guidedTour').textContent).toContain('Continue Your Journey')
  expect(container.querySelector('.guidedTour a').getAttribute('href')).toBe('/#login')
  await act(async () => button('Skip Tour').click())
  expect(container.querySelector('.guidedTour')).toBeNull()
  await act(async () => button('History').click())
  expect(container.textContent).toContain('Your account history is private')
  expect(api.sendChatStream).not.toHaveBeenCalled()
  expect(api.sendTrialMessage).not.toHaveBeenCalled()
  expect(api.getRecommendationHistory).not.toHaveBeenCalled()
})

test('pending demo has one status and a later profile submission ignores the old completion', async () => {
  let resolveDemo, resolveProfile
  api.getRecommendation
    .mockImplementationOnce(() => new Promise(resolve => { resolveDemo = resolve }))
    .mockImplementationOnce(() => new Promise(resolve => { resolveProfile = resolve }))
  await act(async () => root.render(<App />))
  const launch = button('Try the demo')
  await act(async () => { launch.click(); launch.click() })
  expect(api.getRecommendation).toHaveBeenCalledTimes(1)
  expect(container.querySelectorAll('button[aria-label="Preparing your example…"]')).toHaveLength(3)
  expect([...container.querySelectorAll('button[aria-label="Preparing your example…"]')].every(el => el.disabled)).toBe(true)
  expect([...container.querySelectorAll('[role="status"]')].filter(el => el.textContent)).toHaveLength(1)
  expect(container.querySelector('.betaPage')).toBeNull()
  await act(async () => button('Create your profile').click())
  await act(async () => Simulate.change(container.querySelector('#profile-gpa'), { target: { value: '3.1' } }))
  await act(async () => Simulate.submit(container.querySelector('#career-profile')))
  await act(async () => resolveDemo(result))
  expect(window.location.hash).toBe('#profile')
  expect(container.querySelector('#profile-gpa').value).toBe('3.1')
  expect(container.querySelector('button[type="submit"]').disabled).toBe(true)
  expect(container.querySelector('.guidedTour')).toBeNull()
  await act(async () => resolveProfile({ ...result, session_id: 'personal-result' }))
  expect(window.location.hash).toBe('#results/personal-result')
  expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  expect(document.activeElement).toBe(container.querySelector('h1'))
})

test.each(['hashchange', 'popstate'])('leaving demo via %s ignores a late success or error', async event => {
  let rejectDemo
  api.getRecommendation.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectDemo = reject }))
  await act(async () => root.render(<App />))
  await act(async () => button('Try the demo').click())
  await act(async () => {
    window.history.pushState({}, '', '/#login')
    window.dispatchEvent(new Event(event))
  })
  await act(async () => rejectDemo(new Error('Service unavailable')))
  expect(window.location.hash).toBe('#login')
  expect(container.textContent).not.toContain(require('./i18n').translations.en.experience.demoFailed)
  expect(container.querySelector('.appError')).toBeNull()
  expect(container.querySelector('[aria-busy="true"]')).toBeNull()
})

test.each(['success', 'failure'])('changing language keeps the pending demo and localizes its %s', async outcome => {
  let resolveDemo, rejectDemo
  api.getRecommendation.mockImplementationOnce(() => new Promise((resolve, reject) => { resolveDemo = resolve; rejectDemo = reject }))
  await act(async () => root.render(<App />))
  await act(async () => button('Try the demo').click())
  await act(async () => button('RU').click())
  expect(container.querySelectorAll('button[aria-label="Готовим ваш пример…"]')).toHaveLength(3)
  expect([...container.querySelectorAll('button[aria-label="Готовим ваш пример…"]')].every(el => el.disabled)).toBe(true)
  if (outcome === 'success') {
    await act(async () => resolveDemo(result))
    expect(window.location.hash).toBe('#results/review-test-session')
    expect(container.querySelector('.guidedTour')).not.toBeNull()
  } else {
    await act(async () => rejectDemo(new Error('Request failed')))
    expect(container.querySelector('[role="alert"]').textContent).toBe(require('./i18n').translations.ru.experience.demoFailed)
  }
})

test.each([500, 429])('failed demo (%s) restores all actions and Retry can succeed', async status => {
  let rejectDemo
  api.getRecommendation.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectDemo = reject }))
  await act(async () => root.render(<App />))
  await act(async () => button('Try the demo').click())
  await act(async () => rejectDemo(Object.assign(new Error('Request failed'), { status })))
  const text = require('./i18n').translations.en.experience
  expect(container.querySelector('[role="alert"]').textContent).toBe(status === 429 ? text.demoBusy : text.demoFailed)
  expect([...container.querySelectorAll('button[aria-label="Try the demo"]')].every(el => !el.disabled)).toBe(true)
  await act(async () => button('Try again').click())
  expect(window.location.hash).toBe('#results/review-test-session')
  expect(container.querySelector('.guidedTour')).not.toBeNull()
  await act(async () => button('Skip Tour').click())
  expect(document.activeElement).toBe(container.querySelector('h1'))
})

test('normal empty and partial profiles keep GPA validation and accept optional defaults', async () => {
  window.history.replaceState({}, '', '/#profile')
  await act(async () => root.render(<App />))
  expect(container.textContent).not.toContain('25%')
  await act(async () => Simulate.submit(container.querySelector('form')))
  expect(api.getRecommendation).not.toHaveBeenCalled()
  await act(async () => Simulate.change(container.querySelector('#profile-gpa'), { target: { value: '3.1' } }))
  await act(async () => Simulate.submit(container.querySelector('form')))
  expect(api.getRecommendation.mock.calls[0][0]).toMatchObject({ gpa: 3.1, skills: [], python: 0, communication: 3 })
  expect(container.querySelector('.demoBadge')).toBeNull()
  await act(async () => button('Add skills').click())
  expect(container.querySelector('#profile-gpa').value).toBe('3.1')
  expect(container.querySelector('#profile-field').value).toBe('Computer Science')
})

test('profile help has three steps and links to the existing methodology, with definitions shown once', async () => {
  await act(async () => root.render(<App />))
  expect(container.querySelectorAll('#interactive-preview .previewSignals')).toHaveLength(0)
  expect(container.querySelectorAll('#scoring-engine article')).toHaveLength(4)
  await act(async () => button('Create your profile').click())
  const guide = container.querySelector('.guide')
  expect(guide.querySelectorAll('li')).toHaveLength(3)
  expect(guide.querySelector('table,.formula')).toBeNull()
  expect(guide.textContent).not.toMatch(/TF-IDF|Cloud Computing|Final Score|Data Analyst/)
  expect(guide.querySelector('a').getAttribute('href')).toBe('/#methodology')
})

test('editorial landing explains career exploration, four-step flow, seven tracks and scroll-only section navigation', async () => {
  await act(async () => root.render(<App />))
  expect(container.querySelector('h1').textContent).toBe('Explore your IT career options. Find your next learning step.')
  expect(button('Create your profile')).toBeTruthy()
  expect(container.querySelectorAll('#how-it-works ol > li')).toHaveLength(4)
  expect(container.querySelectorAll('#career-tracks article')).toHaveLength(7)
  expect(container.querySelector('#interactive-preview').textContent).toContain('3.2')
  expect(container.querySelector('#interactive-preview').textContent).not.toMatch(/94\.3|High Confidence|100k/)
  const methodology = container.querySelector('a[href="#methodology"]')
  await act(async () => methodology.click())
  expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
  expect(document.activeElement.id).toBe('methodology')
  expect(window.location.hash).toBe('')
  expect(api.getRecommendation).not.toHaveBeenCalled()
  await act(async () => button('Create your profile').click())
  expect(window.location.hash).toBe('#profile')
  expect(container.querySelector('#profile-gpa')).not.toBeNull()
})

test('profile keyboard skill entry can leave an empty combobox and reset a normal edited profile', async () => {
  window.history.replaceState({}, '', '/#profile')
  await act(async () => root.render(<App />))
  const input = container.querySelector('input[aria-label="Your skills"]')
  const preventDefault = jest.fn()
  await act(async () => Simulate.keyDown(input, { key: 'Tab', preventDefault }))
  expect(preventDefault).not.toHaveBeenCalled()
  await act(async () => Simulate.change(input, { target: { value: 'Pyth' } }))
  await act(async () => Simulate.keyDown(input, { key: 'ArrowDown' }))
  await act(async () => Simulate.keyDown(input, { key: 'Enter' }))
  expect(container.querySelector('button[aria-label="Remove skill: Python"]')).not.toBeNull()
  expect(container.textContent).toContain('Adding a tool above does not select an area here.')
  expect(container.querySelector('input[name="python"]').checked).toBe(false)
  expect(container.querySelectorAll('#career-profile input[type="checkbox"]')).toHaveLength(11)
  expect(container.querySelectorAll('#career-profile button[aria-pressed]')).toHaveLength(25)
  await act(async () => Simulate.change(container.querySelector('#profile-gpa'), { target: { value: '3.5' } }))
  await act(async () => button('Reset form').click())
  expect(container.querySelector('#profile-gpa').value).toBe('')
  expect(container.querySelector('button[aria-label="Remove skill: Python"]')).toBeNull()
  expect(input.value).toBe('')
  expect(container.querySelector('details').firstElementChild.tagName).toBe('SUMMARY')
})

test.each(['ru', 'kk'])('profile translates study fields and knowledge areas in %s without changing submitted keys', async lang => {
  const t = require('./i18n').translations[lang]
  localStorage.setItem('lang', lang)
  window.history.replaceState({}, '', '/#profile')
  await act(async () => root.render(<App />))
  expect(container.querySelector('#profile-field option[value="Computer Science"]').textContent).toBe(t.form.fields['Computer Science'])
  expect(container.querySelector('input[name="machine_learning"]').parentElement.textContent).toContain(t.form.technicalLabels.machine_learning)
  await act(async () => Simulate.change(container.querySelector('#profile-gpa'), { target: { value: '3.2' } }))
  await act(async () => Simulate.change(container.querySelector('input[name="machine_learning"]'), { target: { checked: true } }))
  await act(async () => Simulate.submit(container.querySelector('#career-profile')))
  expect(api.getRecommendation.mock.calls[0][0]).toMatchObject({ field_of_study: 'Computer Science', machine_learning: 1, lang })
})

test('resume service failure keeps the existing text fallback and reports unrecognized files', async () => {
  window.history.replaceState({}, '', '/#profile')
  api.parseResume.mockRejectedValue(new Error('Parser unavailable'))
  await act(async () => root.render(<App />))
  await act(async () => {
    Simulate.change(container.querySelector('input[type="file"]'), { target: { files: [new File(['Python SQL'], 'fallback.txt', { type: 'text/plain' })] } })
    await new Promise(resolve => setTimeout(resolve, 50))
  })
  expect(container.querySelector('button[aria-label="Remove skill: Python"]')).not.toBeNull()
  expect(container.textContent).toContain('Review those chips and select any matching Technical Knowledge Areas yourself.')
  await act(async () => button('Dismiss import summary').click())
  expect(container.querySelector('button[aria-label="Remove skill: Python"]')).not.toBeNull()
  expect(container.querySelector('input[name="python"]').checked).toBe(false)
  await act(async () => {
    Simulate.change(container.querySelector('input[type="file"]'), { target: { files: [new File(['nothing recognized'], 'unknown.txt', { type: 'text/plain' })] } })
    await new Promise(resolve => setTimeout(resolve, 50))
  })
  expect(container.textContent).toContain('For browser-only parsing, text-based PDF/TXT files work best.')
  expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  expect(api.getRecommendation).not.toHaveBeenCalled()
})

test('edited demo profile keeps demo ownership and a failed submission leaves input and retry available', async () => {
  window.history.replaceState({}, '', '/#profile')
  let rejectRecommendation
  api.getRecommendation.mockImplementation(() => new Promise((resolve, reject) => { rejectRecommendation = reject }))
  await act(async () => root.render(<App />))
  await act(async () => button('Use demo profile').click())
  expect(container.querySelector('#profile-gpa').value).toBe('3.2')
  await act(async () => Simulate.submit(container.querySelector('#career-profile')))
  expect(container.querySelector('button[type="submit"][aria-busy="true"]').disabled).toBe(true)
  expect(api.getRecommendation).toHaveBeenCalledWith({ ...DEMO_PROFILE, gpa: 3.2, lang: 'en' }, { demo: true })
  await act(async () => rejectRecommendation(new Error('Service unavailable')))
  expect(container.querySelector('.appError').textContent).toBeTruthy()
  expect(container.querySelector('#profile-gpa').value).toBe('3.2')
  expect(container.querySelector('button[type="submit"][aria-busy="false"]').disabled).toBe(false)
  await act(async () => button('Reset form').click())
  expect(container.querySelector('#profile-gpa').value).toBe('')
  expect(container.textContent).not.toContain('Demo profile')
})

test('profile resume import merges reviewed skills and preserves all technical and rating payload fields', async () => {
  window.history.replaceState({}, '', '/#profile')
  let resolveResume
  api.parseResume.mockImplementation(() => new Promise(resolve => { resolveResume = resolve }))
  await act(async () => root.render(<App />))
  const file = new File(['Python SQL'], 'profile.txt', { type: 'text/plain' })
  await act(async () => Simulate.change(container.querySelector('input[type="file"]'), { target: { files: [file] } }))
  expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  await act(async () => resolveResume({ skills: ['Python', 'SQL'], role: 'Data Analyst' }))
  expect(container.textContent).toContain('profile.txt')
  expect(container.querySelector('button[aria-label="Remove skill: SQL"]')).not.toBeNull()
  const checks = container.querySelectorAll('#career-profile input[type="checkbox"]')
  for (const check of checks) await act(async () => Simulate.change(check, { target: { checked: true } }))
  await act(async () => Simulate.change(container.querySelector('#profile-gpa'), { target: { value: '3.5' } }))
  await act(async () => container.querySelector('button[aria-label="Communication: 5 / 5"]').click())
  await act(async () => Simulate.submit(container.querySelector('#career-profile')))
  expect(api.getRecommendation.mock.calls[0][0]).toEqual({
    ...DEMO_PROFILE, skills: ['Python', 'SQL'], gpa: 3.5, lang: 'en',
    python: 1, java: 1, c_cpp: 1, sql: 1, machine_learning: 1, data_analysis: 1,
    cloud_computing: 1, cybersecurity: 1, web_development: 1, devops: 1, networking: 1,
    communication: 5, leadership: 3, problem_solving: 3, teamwork: 3, adaptability: 3,
  })
  expect(api.getRecommendation.mock.calls[0][1]).toEqual({ demo: false })
})

test('keyboard Escape skips the demo without calling an AI provider', async () => {
  await act(async () => root.render(<App />))
  await act(async () => button('Try the demo').click())
  expect(document.activeElement).toBe(container.querySelector('.guidedTour'))
  await act(async () => Simulate.keyDown(container.querySelector('.guidedTour'), { key: 'Escape' }))
  expect(container.querySelector('.guidedTour')).toBeNull()
  expect(api.sendTrialMessage).not.toHaveBeenCalled()
})

test.each(['contact', 'about', 'privacy', 'terms', 'feedback'])('%s uses clickable public contact without personal addresses', async page => {
  window.history.replaceState({}, '', `/${page}`)
  await act(async () => root.render(<App />))
  expect(container.querySelector('main a[href="mailto:contact@careerflow.live"]')).not.toBeNull()
  expect(container.textContent).not.toContain('founder@careerflow.live')
  expect(container.querySelector('footer a[href="/contact"]')).not.toBeNull()
})

test('a direct result URL reloads the saved result through the existing state endpoint', async () => {
  window.history.replaceState({}, '', '/#results/review-test-session')
  await act(async () => root.render(<App />))
  expect(api.getRecommendationState).toHaveBeenCalledWith('review-test-session')
  expect(container.textContent).toContain('Your recommendation')
  expect(document.title).toBe('Your recommendation — CareerFlow')
  expect(container.textContent).toContain('90.5 / 100')
  expect(api.getRecommendation).not.toHaveBeenCalled()
})

test('results tab title stays localized when language changes and profile navigation resets it', async () => {
  window.history.replaceState({}, '', '/#results/review-test-session')
  await act(async () => root.render(<App />))
  await act(async () => button('Learning roadmap').click())
  expect(document.title).toBe('Learning roadmap — CareerFlow')
  await act(async () => button('RU').click())
  expect(document.title).toBe('План обучения — CareerFlow')
  await act(async () => {
    window.history.pushState({}, '', '/#profile')
    window.dispatchEvent(new Event('popstate'))
  })
  expect(document.title).toBe('Создать свой профиль — CareerFlow')
})


test('PDF uses the selected career, score units and historical market context', async () => {
  window.history.replaceState({}, '', '/#results/review-test-session')
  await act(async () => root.render(<App />))
  const alternative = [...container.querySelectorAll('.alternativeGrid button')].find(el => el.textContent.includes('Data Scientist'))
  await act(async () => alternative.click())
  const write = jest.fn()
  const open = jest.spyOn(window, 'open').mockReturnValue({ document: { write, close: jest.fn() } })
  try {
    await act(async () => button('Download PDF').click())
    const html = write.mock.calls[0][0]
    expect(html).toContain('<title>Learning roadmap: Data Scientist</title>')
    expect(html).toContain('39.3 / 100')
    expect(html).toContain('2023')
    expect(html).toContain('not a probability')
  } finally { open.mockRestore() }
})


test.each(['en', 'ru', 'kk'])('compact footer retains unique public destinations and contact email access in %s', async lang => {
  localStorage.setItem('lang', lang)
  await act(async () => root.render(<App />))
  const footer = container.querySelector('footer')
  expect(footer.textContent).toContain('© 2026 CareerFlow')
  expect([...footer.querySelectorAll('a')].map(link => link.getAttribute('href'))).toEqual([
    '/', '/about', '/changelog', '/roadmap', 'https://github.com/danialyermekov/careerflow', '/contact', '/privacy', '/terms', '/disclaimer',
  ])
  expect(footer.querySelectorAll('nav h2')).toHaveLength(2)
  const github = footer.querySelector('a[target="_blank"]')
  expect(github.rel).toBe('noopener noreferrer')
  expect(container.querySelector('nav').textContent).not.toContain(require('./i18n').translations[lang].beta.beta)
  expect(footer.textContent).not.toContain(require('./i18n').translations[lang].beta.beta)
  window.history.pushState({}, '', '/contact')
  await act(async () => window.dispatchEvent(new PopStateEvent('popstate')))
  expect(container.querySelector('main a[href="mailto:contact@careerflow.live"]')).not.toBeNull()
  window.history.pushState({}, '', '/privacy')
  await act(async () => window.dispatchEvent(new PopStateEvent('popstate')))
  expect(container.querySelector('main').textContent).toContain('PostgreSQL')
  if (lang === 'en') expect(container.querySelector('main').textContent).toContain('only for the AI request')
})

test.each(['en', 'ru', 'kk'])('public updates distinguish verified availability dates from launch dates in %s', async lang => {
  localStorage.setItem('lang', lang)
  window.history.replaceState({}, '', '/changelog')
  await act(async () => root.render(<App />))
  const entries = [...container.querySelectorAll('.releaseTimeline > li')]
  expect(entries).toHaveLength(3)
  expect(entries.map(entry => entry.querySelector('time').dateTime)).toEqual(['2026-10-14', '2026-10-09', '2026-10-07'])
  const text = require('./productI18n').productTranslations[lang]
  expect(entries[0].textContent).toContain(text.availabilityVerified)
  expect(entries[0].textContent).toContain(text.redesignRelease)
  expect([...entries[0].querySelectorAll('ul > li')].map(item => item.textContent)).toEqual(text.redesignChanges)
  expect(entries[1].textContent).toContain(text.availabilityVerified)
  expect(entries[1].textContent).toContain(text.accountRelease)
  expect(entries[2].textContent).toContain(text.launchDate)
  expect(entries[0].querySelector('a').href).toBe('https://github.com/danialyermekov/careerflow/commit/6be6e3505c35e6d16f01a20f4edbc5600f523f0b')
  expect(entries[1].querySelector('a').href).toBe('https://github.com/danialyermekov/careerflow/commit/94a6c61305198e9d0163bfb193189076cd022e11')
})

test.each(['en', 'ru', 'kk'])('roadmap keeps completed capabilities and exploratory ideas without the released redesign in %s', async lang => {
  localStorage.setItem('lang', lang)
  window.history.replaceState({}, '', '/roadmap')
  await act(async () => root.render(<App />))
  const groups = [...container.querySelectorAll('.roadmapGroup')]
  const text = require('./productI18n').productTranslations[lang]
  expect(groups.map(group => group.querySelector('h2').textContent)).toEqual([text.completed, text.inProgress, text.planned, text.exploring])
  expect(groups[0].querySelector('#private-accounts')).not.toBeNull()
  expect(groups[0].querySelector('#community-feedback')).not.toBeNull()
  expect(container.querySelector('#frontend-refresh')).toBeNull()
  expect(groups[1].querySelectorAll('li')).toHaveLength(0)
  expect(groups[1].textContent).toContain(text.noInProgressItems)
  expect(groups[0].querySelector('#ai-preview').textContent).toBe(text.roadmapItems['ai-preview'])
  expect(groups[2].querySelectorAll('li')).toHaveLength(0)
  expect(groups[2].textContent).toContain(text.noPlannedItems)
  expect(groups[3].querySelector('#market-refresh')).not.toBeNull()
  expect(groups[3].querySelector('#more-careers')).not.toBeNull()
  expect(groups[3].querySelector('#recommendation-quality')).not.toBeNull()
})

test.each(['about', 'contact', 'privacy', 'terms', 'disclaimer', 'feedback', 'changelog', 'roadmap', 'login'])('public %s route stays available without signing in', async page => {
  window.history.replaceState({}, '', `/#${page}`)
  localStorage.setItem('career-recommendation-history', 'old-private-data')
  await act(async () => root.render(<App />))
  expect(container.querySelector('.betaPage')).not.toBeNull()
  expect(container.textContent).not.toContain('old-private-data')
  expect(api.getRecommendationHistory).not.toHaveBeenCalled()
  expect(container.querySelector('footer')).not.toBeNull()
  expect(container.querySelector('a[href="/about"]')).not.toBeNull()
})

test.each(['about', 'feedback', 'changelog', 'roadmap'])('clean /%s route works on direct load and popstate', async page => {
  window.history.replaceState({}, '', `/${page}`)
  await act(async () => root.render(<App />))
  expect(container.querySelector('h1').textContent).toBe(require('./productI18n').productTranslations.en[page])
  expect(document.title).toBe(require('./data/seo.json').pages[`/${page}`].title)
  window.history.pushState({}, '', '/about')
  await act(async () => window.dispatchEvent(new PopStateEvent('popstate')))
  expect(container.textContent).toContain('Developer & Maintainer')
  expect(container.textContent).not.toContain('Nurbek Seiilbek')
  expect(container.textContent).not.toContain('Turan Tastan')
})

test('About AI CTA enters the real recommendation and advisor flow without sending an AI request', async () => {
  window.history.replaceState({}, '', '/about')
  await act(async () => root.render(<App />))
  expect(container.textContent).toContain('limited free AI preview')
  await act(async () => button('Explore AI Advisor').click())
  expect(window.location.pathname).toBe('/')
  expect(window.location.hash).toBe('#profile')
  await act(async () => Simulate.change(container.querySelector('#profile-gpa'), { target: { value: '3.1' } }))
  await act(async () => Simulate.submit(container.querySelector('form')))
  expect(container.querySelector('.chatSidebar')).not.toBeNull()
  expect(api.sendChatStream).not.toHaveBeenCalled()
})
