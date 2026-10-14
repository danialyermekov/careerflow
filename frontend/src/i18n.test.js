import { translations } from './i18n'

test('public beta elements and policy content have complete EN/RU/KZ translations', () => {
  for (const lang of ['ru', 'kk']) {
    expect(Object.keys(translations[lang].beta).sort()).toEqual(Object.keys(translations.en.beta).sort())
    for (const key of Object.keys(translations.en.beta)) expect(translations[lang].beta[key]).toBeTruthy()
  }
})

test('public product pages have matching translated keys and roadmap items', () => {
  for (const lang of ['ru', 'kk']) {
    expect(Object.keys(translations[lang].product).sort()).toEqual(Object.keys(translations.en.product).sort())
    expect(Object.keys(translations[lang].product.roadmapItems).sort()).toEqual(Object.keys(translations.en.product.roadmapItems).sort())
    expect(translations[lang].product.howSteps).toHaveLength(5)
    expect(translations[lang].product.mvpChanges).toHaveLength(4)
  }
})

const supportedLanguages = ['en', 'ru', 'kk']

test.each(supportedLanguages)('%s uses the same demand and historical trend labels in controls and explanations', lang => {
  const t = translations[lang]
  expect(t.results.sortOptions.market).toBe(t.review.demandShare)
  expect(t.results.marketShare).toBe(t.review.demandShare)
  expect(t.results.sortOptions.trend).toBe(t.review.historicalTrend)
  expect(t.results.trend).toBe(t.review.historicalTrend)
  expect(t.review.signals[2][0]).toBe(t.review.historicalTrend)
  expect(t.review.signals[3][0]).toBe(t.review.demandShare)
})

test.each(['en', 'ru', 'kk'])('%s supplies the complete four-step editorial landing and form labels', lang => {
  expect(translations[lang].review.steps).toHaveLength(4)
  expect(translations[lang].hero.trackDescriptions).toHaveLength(7)
  for (const key of ['previewTitle', 'previewPending', 'methodology', 'tracksTitle', 'privacyText']) {
    expect(translations[lang].hero[key]).toBeTruthy()
  }
  for (const key of ['addSkill', 'reset', 'selected', 'academicHint', 'step']) {
    expect(translations[lang].form[key]).toBeTruthy()
  }
})

test.each(['en', 'ru', 'kk'])('%s translates the complete walkthrough and preview', lang => {
  expect(Object.keys(translations[lang].experience).sort()).toEqual(Object.keys(translations.en.experience).sort())
  expect(translations[lang].experience.steps).toHaveLength(5)
  expect(translations[lang].experience.suggestions).toHaveLength(3)
  expect(translations[lang].experience.remaining(2, 3)).toContain('2')
})

const supportedProfessions = [
  'Data Scientist',
  'Data Analyst',
  'Data Engineer',
  'Business Analyst',
  'Machine Learning Engineer',
  'Software Engineer',
  'Cloud Engineer',
]

const roadmapCategories = [
  'programming',
  'libraries',
  'analyst_tools',
  'cloud',
  'databases',
  'webframeworks',
  'other',
  'os',
]

describe('translations', () => {
  test.each(supportedLanguages)('%s has navigation, hero, form, and results dictionaries', lang => {
    expect(translations[lang].nav.steps).toHaveLength(4)
    expect(translations[lang].hero.title).toBeTruthy()
    expect(translations[lang].form.submit).toBeTruthy()
    expect(translations[lang].results.tabs.best).toBeTruthy()
  })

  test.each(supportedLanguages)('%s translates every supported profession', lang => {
    for (const profession of supportedProfessions) {
      expect(translations[lang].professions[profession]).toBeTruthy()
    }
  })

  test.each(supportedLanguages)('%s translates roadmap categories', lang => {
    for (const category of roadmapCategories) {
      expect(translations[lang].categories[category]).toBeTruthy()
    }
  })

  test.each(supportedLanguages)('%s translates chart modes', lang => {
    expect(translations[lang].results.chartModes.bars).toBeTruthy()
    expect(translations[lang].results.chartModes.radar).toBeTruthy()
    expect(translations[lang].results.chartModes.gap).toBeTruthy()
  })
})
