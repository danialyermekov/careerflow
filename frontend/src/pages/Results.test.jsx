import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Simulate } from 'react-dom/test-utils'
import { TextDecoder, TextEncoder } from 'util'
import { AppProvider } from '../context/AppContext'
import { translations } from '../i18n'
import { clearLLMSettings, getLLMSettings, saveLLMSettings } from '../utils/llmSettings'
import * as api from '../utils/api'
import Results, { getCourseProviderUrl } from './Results'

jest.mock('../utils/api')

describe('getCourseProviderUrl', () => {
  test('returns direct url when course.url is an http link', () => {
    expect(getCourseProviderUrl({ url: 'https://example.com/course', title: 'Python', platform: 'Udemy' }))
      .toBe('https://example.com/course')
  })

  test('returns null when course is missing or falsy', () => {
    expect(getCourseProviderUrl(null)).toBeNull()
    expect(getCourseProviderUrl(undefined)).toBeNull()
  })

  test('constructs search url for Coursera when direct url is missing', () => {
    expect(getCourseProviderUrl({ title: 'Machine Learning Specialization', platform: 'Coursera' }))
      .toBe('https://www.coursera.org/search?query=Machine%20Learning%20Specialization')
  })

  test('constructs search url for Stepik when direct url is missing', () => {
    expect(getCourseProviderUrl({ title: 'Python Generation', platform: 'Stepik' }))
      .toBe('https://stepik.org/catalog/search?q=Python%20Generation')
  })

  test('constructs search url for EdX, Udacity, and Udemy', () => {
    expect(getCourseProviderUrl({ title: 'CS50', platform: 'edX' }))
      .toBe('https://www.edx.org/search?q=CS50')
    expect(getCourseProviderUrl({ title: 'Data Engineer', platform: 'Udacity' }))
      .toBe('https://www.udacity.com/courses/all?search=Data%20Engineer')
    expect(getCourseProviderUrl({ title: 'Complete Web Dev', platform: 'Udemy' }))
      .toBe('https://www.udemy.com/courses/search/?q=Complete%20Web%20Dev')
  })

  test('falls back to Google search when platform is unknown', () => {
    expect(getCourseProviderUrl({ title: 'Intro to Algorithms', platform: 'CustomAcademy' }))
      .toBe('https://www.google.com/search?q=CustomAcademy%20Intro%20to%20Algorithms')
  })
})

describe('Results component', () => {
  const result = {
    session_id: 'test-session', top_profession: 'Data Analyst', alternative_profession: 'Data Scientist',
    final_scores: { 'Data Analyst': 0.8, 'Data Scientist': 0.7 },
    skill_scores: {}, classification_scores: {}, demand_scores: {}, roadmap_with_courses: {},
    full_roadmap: {}, _formData: { skills: ['sql'] },
  }
  let container, root

  beforeEach(async () => {
    global.IS_REACT_ACT_ENVIRONMENT = true
    global.TextDecoder = TextDecoder
    clearLLMSettings()
    sessionStorage.clear()
    localStorage.clear()
    localStorage.setItem('lang', 'en')
    HTMLElement.prototype.scrollIntoView = jest.fn()
    api.getRecommendationHistory.mockResolvedValue({ items: [] })
    api.getRecommendationState.mockResolvedValue({ progress: {} })
    api.saveRoadmapProgress.mockResolvedValue({})
    api.saveCourseFilterPreferences.mockResolvedValue({})
    api.getTrialStatus.mockResolvedValue({ available: false, remaining: 0, total: 3 })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => root.render(<AppProvider><Results results={result} /></AppProvider>))
    const open = container.querySelector('.aiFab')
    await act(async () => open.click())
    await act(async () => [...container.querySelectorAll('.advisorModes button')].find(button => button.textContent === translations.en.experience.byok).click())
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    jest.clearAllMocks()
  })

  test('real assistant is disabled without a key and responds immediately to save/remove', async () => {
    expect(container.textContent).toContain(translations.en.llm.noKey)
    expect(container.querySelector('textarea[placeholder]').disabled).toBe(true)
    await act(async () => saveLLMSettings('anthropic', 'test-only-secret'))
    expect(container.querySelector('textarea[placeholder]').disabled).toBe(false)
    expect(container.querySelector(`button[aria-label="${translations.en.results.voiceRecord}"]`).disabled).toBe(true)
    expect(container.textContent).toContain(translations.en.llm.voiceGemini)
    await act(async () => clearLLMSettings())
    expect(container.querySelector('textarea[placeholder]').disabled).toBe(true)
    expect(container.textContent).toContain(translations.en.llm.noKey)
    expect(api.sendChatStream).not.toHaveBeenCalled()
  })

  test('split SSE chunks preserve text and show safe provider errors without deleting the key', async () => {
    await act(async () => saveLLMSettings('gemini', 'test-only-secret'))
    const stream = 'data: {"type":"text","content":"Career data: advice"}\n\n' +
      'data: {"type":"error","code":"key_rejected","content":"test-only-secret"}\n\n' +
      'data: [DONE]\n\n'
    const chunks = [stream.slice(0, 24), stream.slice(24, 62), stream.slice(62)]
    const reader = { read: jest.fn(async () => chunks.length
      ? { value: new TextEncoder().encode(chunks.shift()), done: false }
      : { done: true }) }
    api.sendChatStream.mockResolvedValue({ ok: true, body: { getReader: () => reader } })
    const input = container.querySelector('textarea[placeholder]')
    await act(async () => Simulate.change(input, { target: { value: 'Career advice', style: {}, scrollHeight: 20 } }))
    await act(async () => container.querySelector(`button[aria-label="${translations.en.results.chatSend}"]`).click())
    expect(container.textContent).toContain(translations.en.llm.errors.key_rejected)
    expect(container.textContent).not.toContain('test-only-secret')
    expect(getLLMSettings().apiKey).toBe('test-only-secret')
    const history = api.sendChatStream.mock.calls[0][0].history
    expect(history.some(m => m.content === 'Career advice')).toBe(false)
  })

  test('AI CTA button is rendered near top recommendation and dynamically updates label', async () => {
    const ctaBtn = container.querySelector('button[aria-label*="Ask"]')
    expect(ctaBtn).not.toBeNull()
    expect(ctaBtn.textContent).toContain(translations.en.results.askAiRecommendation)

    await act(async () => saveLLMSettings('anthropic', 'test-key'))
    expect(ctaBtn.textContent).toContain(translations.en.results.askClaudeRecommendation)

    await act(async () => saveLLMSettings('gemini', 'test-key'))
    expect(ctaBtn.textContent).toContain(translations.en.results.askGeminiRecommendation)
  })

  test('clicking AI CTA button opens the AI Advisor drawer', async () => {
    // Close the drawer first
    const closeBtn = container.querySelector(`button[title="${translations.en.results.closeAiPanel}"]`)
    expect(closeBtn).not.toBeNull()
    await act(async () => closeBtn.click())
    expect(container.querySelector('.chatSidebar')).toBeNull()

    // Click the top recommendation CTA button
    const ctaBtn = container.querySelector('button[aria-label*="Ask"]')
    expect(ctaBtn).not.toBeNull()
    await act(async () => ctaBtn.click())

    // Drawer is open again
    expect(container.querySelector('.chatSidebar')).not.toBeNull()
  })

  test('failed state loading never overwrites saved progress with empty defaults', async () => {
    act(() => root.unmount())
    root = createRoot(container)
    api.getRecommendationState.mockRejectedValue(new Error('Storage unavailable'))
    api.saveRoadmapProgress.mockClear()
    api.saveCourseFilterPreferences.mockClear()
    await act(async () => root.render(<AppProvider><Results results={result} /></AppProvider>))
    await act(async () => new Promise(resolve => setTimeout(resolve, 450)))
    expect(api.saveRoadmapProgress).not.toHaveBeenCalled()
    expect(api.saveCourseFilterPreferences).not.toHaveBeenCalled()
    expect(container.textContent).toContain(translations.en.beta.saveError)
  })
})

describe('editorial results navigation and Best Match', () => {
  const result = {
    session_id: 'editorial-test', top_profession: 'Data Analyst', alternative_profession: 'Data Scientist',
    final_scores: { 'Data Analyst': .95, 'Data Scientist': .4 },
    classification_scores: { 'Data Analyst': .6, 'Data Scientist': .2 },
    skill_scores: { 'Data Analyst': .3, 'Data Scientist': .15 },
    demand_scores: { 'Data Analyst': { trend_score: .8, market_share: .6, predicted_vacancies: 500 }, 'Data Scientist': { trend_score: .4, market_share: .2, predicted_vacancies: 200 } },
    scoring_weights: { classifier: .2, skill_matcher: .4, demand_trend: .1, demand_market_share: .3 },
    full_roadmap: { programming: ['python', 'sql', 'r'] }, roadmap_with_courses: { programming: { r: { courses: [] } } },
    roadmaps_by_profession: {
      'Data Analyst': { full: { programming: ['python', 'sql', 'r'] }, gap: { programming: ['r'] }, roadmap_with_courses: { programming: { r: { courses: [] } } } },
      'Data Scientist': { full: { libraries: ['numpy', 'pandas', 'pytorch'] }, gap: { libraries: ['numpy', 'pytorch'] }, roadmap_with_courses: { libraries: { numpy: { courses: [] }, pytorch: { courses: [] } } } },
    },
    _formData: { gpa: 3.2, field_of_study: 'Computer Science', skills: ['Python', 'SQL', 'Pandas'] },
  }
  let container, root
  const button = text => [...container.querySelectorAll('button')].find(el => el.textContent === text)
  beforeEach(async () => {
    global.IS_REACT_ACT_ENVIRONMENT = true
    localStorage.clear(); sessionStorage.clear(); localStorage.setItem('lang', 'en'); clearLLMSettings()
    api.getRecommendationState.mockResolvedValue({ progress: {} })
    api.getTrialStatus.mockResolvedValue({ available: false, remaining: 0, total: 3 })
    api.saveRoadmapProgress.mockResolvedValue({}); api.saveCourseFilterPreferences.mockResolvedValue({})
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container)
    await act(async () => root.render(<AppProvider><Results results={result} /></AppProvider>))
  })
  afterEach(() => { act(() => root.unmount()); container.remove(); jest.clearAllMocks(); jest.restoreAllMocks() })

  test('four controlled tabs support keyboard selection and retain the selected career and chart mode', async () => {
    const tabs = [...container.querySelectorAll('[role="tab"]')]
    expect(tabs).toHaveLength(4)
    await act(async () => { tabs[0].focus(); Simulate.keyDown(tabs[0], { key: 'ArrowRight' }) })
    expect(document.activeElement).toBe(tabs[1])
    expect(tabs[1].getAttribute('aria-selected')).toBe('true')
    await act(async () => [...container.querySelectorAll('.professionBarRow')].find(b => b.textContent.includes('Data Scientist')).click())
    expect(container.querySelector('.bestName').textContent).toBe('Data Scientist')
    expect(container.querySelector('.bestRank').textContent).toContain('Selected profession')
    await act(async () => button(translations.en.results.chartModes.radar).click())
    await act(async () => tabs[3].click())
    await act(async () => tabs[0].click())
    expect(container.querySelector('.bestName').textContent).toBe('Data Scientist')
    expect(button(translations.en.results.chartModes.radar).getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('.radarCompare')).not.toBeNull()
  })

  test('signal cards and calculation inspector use server weights and correct sum/max normalization', async () => {
    const cards = [...container.querySelectorAll('.signalContribution')]
    expect(cards).toHaveLength(4)
    expect(cards.map(c => c.querySelector('b').textContent)).toEqual(['15.00 points', '40.00 points', '10.00 points', '30.00 points'])
    const details = container.querySelector('.methodDetails')
    await act(async () => details.querySelector('summary').click())
    expect(details.open).toBe(true)
    expect(details.textContent).toContain('75.00 × 0.20 + 100.00 × 0.40 + 100.00 × 0.10 + 100.00 × 0.30 ≈ 95.0 / 100')
    expect(details.textContent).toContain('0.60000')
    expect([...container.querySelectorAll('.gapAssessment .gapChips span')].map(chip => chip.textContent)).toContain('R')
    for (const mode of ['radar', 'gap', 'bars']) {
      await act(async () => button(translations.en.results.chartModes[mode]).click())
      expect(button(translations.en.results.chartModes[mode]).getAttribute('aria-pressed')).toBe('true')
      expect(container.querySelector(mode === 'radar' ? '.radarCompare' : mode === 'gap' ? '.gapCompare' : '.professionBars')).not.toBeNull()
    }
    expect(container.querySelector('.professionBars')).not.toBeNull()
    expect(result.scoring_weights.classifier).toBe(.2)
    expect(api.sendChatStream).not.toHaveBeenCalled()
  })

  test('alternative summary, roadmap and PDF stay scoped to the selected profession', async () => {
    await act(async () => container.querySelector('.alternativeGrid button').click())
    expect(container.querySelector('.bestName').textContent).toBe('Data Scientist')
    expect(container.querySelector('.bestRank').textContent).toContain('#2')
    expect(container.querySelector('[aria-label="Skill gap assessment"]').textContent).toContain('Pytorch')
    await act(async () => button(translations.en.results.viewFullRoadmap).click())
    expect(container.querySelector('.roadmapHint').textContent).toContain('Data Scientist')
    expect(container.querySelector('.roadmap .catHeader')).not.toBeNull()
    await act(async () => container.querySelector('.roadmap .catHeader').click())
    expect(container.querySelector('.roadmap').textContent).toContain('Numpy')
    const printWindow = { document: { write: jest.fn(), close: jest.fn() }, focus: jest.fn(), print: jest.fn() }
    jest.spyOn(window, 'open').mockReturnValue(printWindow)
    await act(async () => button(translations.en.results.downloadPdf).click())
    expect(printWindow.document.write.mock.calls[0][0]).toContain('<div class="prof-name">Data Scientist</div>')
    expect(printWindow.document.write.mock.calls[0][0]).toContain('40.0 / 100')
    await act(async () => button(translations.en.results.tabs.best).click())
    expect(container.querySelectorAll('[data-tour-slot="recommendation"],[data-tour-slot="explanation"]')).toHaveLength(2)
    await act(async () => container.querySelector('button[aria-label*="Ask"]').click())
    expect(container.querySelector('.chatSidebar')).not.toBeNull()
    expect(api.sendTrialMessage).not.toHaveBeenCalled()
  })

  test('legacy responses disclose missing weights and unavailable alternative gap data', async () => {
    await act(async () => root.render(<AppProvider><Results results={{ ...result, scoring_weights: undefined, roadmaps_by_profession: undefined }} /></AppProvider>))
    expect(container.querySelector('.methodDetails').textContent).toContain(translations.en.review.missingWeights)
    expect([...container.querySelectorAll('.signalContribution b')].every(b => b.textContent.startsWith('—'))).toBe(true)
    await act(async () => container.querySelector('.alternativeGrid button').click())
    expect(container.querySelector('[aria-label="Skill gap assessment"]').textContent).toContain('Skill-gap data is unavailable for this career.')
  })

  test('saved progress survives selection and newly available categories can be reordered and persisted', async () => {
    api.getRecommendationState.mockResolvedValueOnce({ progress: { categoryOrder: ['programming'], doneSkills: ['libraries::numpy'] } })
    const savedResult = { ...result, session_id: 'editorial-saved', roadmaps_by_profession: {
      ...result.roadmaps_by_profession,
      'Data Scientist': { ...result.roadmaps_by_profession['Data Scientist'], roadmap_with_courses: {
        libraries: { numpy: { courses: [] }, pytorch: { courses: [] } }, cloud: { aws: { courses: [] } },
      } },
    } }
    await act(async () => root.render(<AppProvider><Results results={savedResult} /></AppProvider>))
    await act(async () => container.querySelector('.alternativeGrid button').click())
    await act(async () => button(translations.en.results.viewFullRoadmap).click())
    expect(container.querySelector('.roadmapProgressPanel').textContent).toContain('1 of 3')
    const categories = () => [...container.querySelectorAll('.roadmap .catName')].map(el => el.textContent)
    expect(categories()).toEqual(['LIBRARIES', 'CLOUD SERVICES'])
    const [libraries, cloud] = container.querySelectorAll('.roadmapCat')
    await act(async () => Simulate.dragStart(cloud))
    await act(async () => Simulate.drop(libraries))
    expect(categories()).toEqual(['CLOUD SERVICES', 'LIBRARIES'])
    await act(async () => new Promise(resolve => setTimeout(resolve, 400)))
    expect(api.saveRoadmapProgress).toHaveBeenLastCalledWith('editorial-saved', expect.objectContaining({
      categoryOrder: ['cloud', 'libraries'], doneSkills: ['libraries::numpy'], selectedProfession: 'Data Scientist',
    }))
  })
})
