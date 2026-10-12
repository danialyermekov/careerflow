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

describe('editorial All Professions master-detail', () => {
  const names = ['Data Analyst', 'Data Scientist', 'Data Engineer', 'Business Analyst', 'Machine Learning Engineer', 'Software Engineer', 'Cloud Engineer']
  const result = {
    session_id: 'all-professions-test', top_profession: names[4], alternative_profession: names[1],
    final_scores: Object.fromEntries(names.map((name, index) => [name, [.2170, .5600, .4990, .4818, .5611, .3992, .4505][index]])),
    classification_scores: Object.fromEntries(names.map((name, index) => [name, [14, 7, 6, 5, 4, 3, 1][index]])),
    skill_scores: Object.fromEntries(names.map((name, index) => [name, [.1, .7, .2, .4, .3, .6, .5][index]])),
    demand_scores: Object.fromEntries(names.map((name, index) => [name, { trend_score: [.2, .4, .8, .5, .6, .1, .3][index], market_share: [.1, .3, .2, .4, .9, .5, .6][index] }])),
    scoring_weights: { classifier: .2, skill_matcher: .3, demand_trend: .35, demand_market_share: .15 },
    roadmaps_by_profession: Object.fromEntries(names.map((name, index) => [name, {
      full: { programming: ['python', 'sql', `skill-${index}`] }, gap: { programming: [`skill-${index}`] },
      roadmap_with_courses: { programming: { [`skill-${index}`]: { courses: [] } } },
    }])),
    full_roadmap: {}, roadmap_with_courses: {}, _formData: { skills: ['Python', 'SQL'] },
  }
  let container, root
  const rows = () => [...container.querySelectorAll('.careerRanking .careerSelect')]
  const detail = () => container.querySelector('#selected-career-details')
  const button = text => [...container.querySelectorAll('button')].find(el => el.textContent === text)
  const openAll = async () => act(async () => button(translations.en.results.tabs.all).click())
  beforeEach(async () => {
    global.IS_REACT_ACT_ENVIRONMENT = true
    localStorage.clear(); sessionStorage.clear(); localStorage.setItem('lang', 'en'); clearLLMSettings()
    HTMLElement.prototype.scrollIntoView = jest.fn()
    api.getRecommendationState.mockResolvedValue({ progress: {} })
    api.getTrialStatus.mockResolvedValue({ available: false, remaining: 0, total: 3 })
    api.saveRoadmapProgress.mockResolvedValue({}); api.saveCourseFilterPreferences.mockResolvedValue({})
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container)
    await act(async () => root.render(<AppProvider><Results results={result} /></AppProvider>))
    await openAll()
  })
  afterEach(() => { act(() => root.unmount()); container.remove(); jest.clearAllMocks(); jest.restoreAllMocks() })

  test.each([
    ['score', [4, 1, 2, 3, 6, 5, 0]], ['skill', [1, 5, 6, 3, 4, 2, 0]],
    ['profile', [0, 1, 2, 3, 4, 5, 6]], ['trend', [2, 4, 3, 1, 6, 0, 5]], ['market', [4, 6, 5, 3, 1, 2, 0]],
  ])('%s sorts actual normalized data, retaining overall ranks and top-match identity', async (sort, order) => {
    const before = JSON.stringify(result)
    const control = container.querySelector(`.careerSort button[data-sort="${sort}"]`)
    expect(control).not.toBeNull()
    await act(async () => { control.focus(); control.click() })
    expect(rows().map(row => row.dataset.profession)).toEqual(order.map(index => names[index]))
    const overall = [4, 1, 2, 3, 6, 5, 0]
    for (const row of rows()) {
      expect(row.querySelector('.careerRank').textContent).toBe(`#${overall.indexOf(names.indexOf(row.dataset.profession)) + 1}`)
      expect(row.querySelector('.careerScore').textContent).toBe(`${(result.final_scores[row.dataset.profession] * 100).toFixed(1)} / 100`)
    }
    expect(control.getAttribute('aria-pressed')).toBe('true')
    expect(document.activeElement).toBe(control)
    expect(rows().find(row => row.querySelector('.careerTopBadge')).dataset.profession).toBe(names[4])
    expect(rows().find(row => row.getAttribute('aria-pressed') === 'true').dataset.profession).toBe(names[4])
    const comparisonRanks = [...container.querySelectorAll('.careerComparisons .professionBarRank')].map(el => el.textContent)
    expect(comparisonRanks).toEqual(order.map(index => `#${overall.indexOf(index) + 1}`))
    expect(JSON.stringify(result)).toBe(before)
  })

  test('selection updates career details, four signals and skill coverage without leaving All Professions or losing focus', async () => {
    const row = rows().find(row => row.dataset.profession === names[1])
    await act(async () => { row.focus(); row.click() })
    expect(container.querySelector('#results-tab-all').getAttribute('aria-selected')).toBe('true')
    expect(row.getAttribute('aria-pressed')).toBe('true')
    expect(document.activeElement).toBe(row)
    expect(detail().querySelector('h3').textContent).toBe(names[1])
    expect(detail().querySelector('.careerDetailRank').textContent).toContain('#2')
    expect(detail().querySelector('.careerScore').textContent).toBe('56.0 / 100')
    expect([...detail().querySelectorAll('.signalContribution b')].map(el => el.textContent)).toEqual(['3.50 points', '30.00 points', '17.50 points', '5.00 points'])
    expect(detail().querySelector('.careerCoverage').textContent).toContain('2 of 3')
    expect([...detail().querySelectorAll('.careerKnownSkills span')].map(el => el.textContent)).toEqual(['Python', 'Sql'])
    expect(detail().querySelector('.careerMissingSkills').textContent).toContain('Skill-1')
    await act(async () => detail().querySelector('.methodDetails summary').click())
    expect(detail().querySelector('.methodDetails').open).toBe(true)
    expect(detail().querySelector('.methodDetails').textContent).toContain('17.50 × 0.20 + 100.00 × 0.30 + 50.00 × 0.35 + 33.33 × 0.15 ≈ 56.0 / 100')
    const composition = [...row.querySelectorAll('.careerSignalSegments span')].map(el => parseFloat(el.style.width))
    expect(composition).toHaveLength(4)
    composition.forEach((value, index) => expect(value).toBeCloseTo([3.5, 30, 17.5, 5][index], 8))
    await act(async () => container.querySelector('.careerSort button[data-sort="trend"]').click())
    expect(detail().querySelector('h3').textContent).toBe(names[1])
    expect(detail().querySelector('.methodDetails').open).toBe(true)
    expect(api.sendChatStream).not.toHaveBeenCalled(); expect(api.sendTrialMessage).not.toHaveBeenCalled()
  })

  test('selected-career roadmap uses the existing result tab, and Best Match preserves that selection and chart mode', async () => {
    const hash = window.location.hash
    await act(async () => rows().find(row => row.dataset.profession === names[2]).click())
    await act(async () => detail().querySelector('.primaryAction').click())
    expect(container.querySelector('#results-tab-roadmap').getAttribute('aria-selected')).toBe('true')
    expect(container.querySelector('.roadmapHint').textContent).toContain(names[2])
    expect(container.querySelector('.roadmap').textContent).toContain('Skill-2')
    expect(window.location.hash).toBe(hash)
    await act(async () => button(translations.en.results.tabs.best).click())
    expect(container.querySelector('.bestName').textContent).toBe(names[2])
    await act(async () => button(translations.en.results.chartModes.radar).click())
    await openAll()
    expect(detail().querySelector('h3').textContent).toBe(names[2])
    await act(async () => button(translations.en.results.tabs.best).click())
    expect(container.querySelector('.radarCompare')).not.toBeNull()
  })

  test('all existing comparison charts remain reachable and selecting a comparison still opens career-specific Best Match', async () => {
    const comparisons = container.querySelector('.careerComparisons')
    expect(comparisons).not.toBeNull()
    await act(async () => comparisons.querySelector('summary').click())
    expect(comparisons.open).toBe(true)
    expect(comparisons.querySelectorAll('.scoreCircleCard')).toHaveLength(7)
    expect(comparisons.querySelectorAll('.professionBarRow')).toHaveLength(7)
    expect(comparisons.querySelectorAll('.gapCompareRow')).toHaveLength(7)
    await act(async () => [...comparisons.querySelectorAll('.professionBarRow')].find(el => el.textContent.includes(names[6])).click())
    expect(container.querySelector('.bestName').textContent).toBe(names[6])
  })

  test('legacy or partial data discloses missing weights, inputs and alternative coverage rather than borrowing top-career skills', async () => {
    await act(async () => root.render(<AppProvider><Results results={{ ...result, scoring_weights: undefined, roadmaps_by_profession: undefined, classification_scores: {}, skill_scores: {}, demand_scores: {}, full_roadmap: { programming: ['top-only'] } }} /></AppProvider>))
    await act(async () => rows().find(row => row.dataset.profession === names[1]).click())
    expect(detail().textContent).toContain(translations.en.review.missingWeights)
    expect(detail().textContent).toContain(translations.en.review.partialSignals)
    expect(detail().querySelector('.careerCoverage').textContent).toContain(translations.en.review.gapUnavailable)
    expect(detail().querySelector('.careerCoverage').textContent).not.toContain('Top-only')
    expect(detail().querySelector('.careerScore').textContent).toBe('56.0 / 100')
    expect(detail().textContent).not.toMatch(/NaN|Infinity|undefined/)
    expect([...detail().querySelectorAll('.signalContribution b')].every(el => el.textContent.startsWith('—'))).toBe(true)
    const comparisons = container.querySelector('.careerComparisons')
    await act(async () => comparisons.querySelector('summary').click())
    const alternative = [...comparisons.querySelectorAll('.gapCompareRow')].find(el => el.textContent.includes(names[1]))
    expect(alternative.querySelector('.gapCompareMeta').textContent).toBe(translations.en.review.gapUnavailable)
    expect(alternative.querySelector('.gapCompareTrack')).toBeNull()
  })

  test('missing final scores produce a localized empty ranking without fabricated careers', async () => {
    await act(async () => root.render(<AppProvider><Results results={{ ...result, final_scores: undefined }} /></AppProvider>))
    expect(rows()).toHaveLength(0)
    expect(container.querySelector('.allPanel').textContent).toContain(translations.en.review.rankingEmpty)
    expect(detail()).toBeNull()
  })

  test('partial final scores and an unavailable saved selection resolve one stable career identity for detail, gaps and roadmap', async () => {
    api.getRecommendationState.mockResolvedValueOnce({ progress: { selectedProfession: names[6] } })
    await act(async () => root.render(<AppProvider><Results results={{ ...result, session_id: 'partial-final-saved', final_scores: { [names[1]]: .56, [names[2]]: .4990 } }} /></AppProvider>))
    expect(detail().querySelector('h3').textContent).toBe(names[1])
    expect(detail().querySelector('.careerMissingSkills').textContent).toContain('Skill-1')
    expect(detail().querySelector('.careerMissingSkills').textContent).not.toContain('Skill-4')
    await act(async () => container.querySelector('.careerSort button[data-sort="trend"]').click())
    expect(detail().querySelector('h3').textContent).toBe(names[1])
    await act(async () => detail().querySelector('.primaryAction').click())
    expect(container.querySelector('.roadmapHint').textContent).toContain(names[1])
    expect(container.querySelector('.roadmap').textContent).toContain('Skill-1')
    await act(async () => new Promise(resolve => setTimeout(resolve, 400)))
    expect(api.saveRoadmapProgress).toHaveBeenLastCalledWith('partial-final-saved', expect.objectContaining({ selectedProfession: names[1] }))
  })

  test('restored career/progress survives sorting, with a keyboard-operable jump to selected details', async () => {
    api.getRecommendationState.mockResolvedValueOnce({ progress: { selectedProfession: names[6], doneSkills: ['programming::skill-6'] } })
    await act(async () => root.render(<AppProvider><Results results={{ ...result, session_id: 'all-saved-history' }} /></AppProvider>))
    expect(detail().querySelector('h3').textContent).toBe(names[6])
    for (const row of rows()) { expect(row.tagName).toBe('BUTTON'); expect(row.tabIndex).toBe(0) }
    await act(async () => container.querySelector('.careerSort button[data-sort="skill"]').click())
    await act(async () => container.querySelector('.rankingDetailLink').click())
    expect(document.activeElement).toBe(detail().querySelector('h3'))
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
    await act(async () => detail().querySelector('.primaryAction').click())
    expect(container.querySelector('.roadmapProgressPanel').textContent).toContain('1 of 1')
  })
})
