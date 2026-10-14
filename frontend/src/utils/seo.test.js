import { updatePageMetadata } from './seo'
import seo from '../data/seo.json'
import { translations } from '../i18n'

beforeEach(() => { document.head.innerHTML = '' })

test.each(['en', 'ru', 'kk'])('private route and results-tab titles are meaningful in %s', lang => {
  const t = translations[lang]
  for (const [page, title] of [['results', t.results.title], ['form', t.review.start], ['login', t.beta.login], ['account', t.beta.account]]) {
    updatePageMetadata(page, t, lang)
    expect(document.title).toBe(`${title} — CareerFlow`)
    expect(document.title).not.toBe('CareerFlow — CareerFlow')
  }
  for (const title of [t.results.roadmap, t.review.historyTab]) {
    updatePageMetadata('results', t, lang, title)
    expect(document.title).toBe(`${title} — CareerFlow`)
    expect(document.querySelector('meta[name="robots"]').content).toBe('noindex, follow')
  }
})
test.each(Object.entries(seo.pages))('public metadata is specific and canonical for %s', (path, expected) => {
  updatePageMetadata(path === '/' ? 'hero' : path.slice(1), translations.en, 'en')
  expect(document.title).toBe(expected.title)
  expect(document.querySelector('meta[name="description"]').content).toBe(expected.description)
  expect(document.querySelector('link[rel="canonical"]').href).toBe(seo.origin + path)
  expect(document.querySelector('meta[property="og:url"]').content).toBe(seo.origin + path)
  expect(document.querySelector('meta[property="og:title"]').content).toBe(expected.title)
  expect(document.querySelector('meta[name="twitter:description"]').content).toBe(expected.description)
  expect(document.querySelector('meta[name="robots"]').content).toBe('index, follow')
})
test.each(['form', 'results', 'login', 'account'])('private %s view removes public canonical/schema and is noindex', page => {
  updatePageMetadata('hero', translations.en, 'en')
  expect(document.getElementById('careerflow-schema')).not.toBeNull()
  updatePageMetadata(page, translations.en, 'en')
  expect(document.querySelector('meta[name="robots"]').content).toBe('noindex, follow')
  expect(document.querySelector('link[rel="canonical"]')).toBeNull()
  expect(document.getElementById('careerflow-schema')).toBeNull()
  updatePageMetadata('hero', translations.en, 'en')
  expect(JSON.parse(document.getElementById('careerflow-schema').textContent)['@graph'].map(item => item['@type'])).toEqual(['WebSite', 'WebApplication'])
})
test.each(['ru', 'kk'])('language changes preserve the actual public URL without inventing hreflang: %s', lang => {
  updatePageMetadata('about', translations[lang], lang)
  expect(document.title).toContain(translations[lang].product.about)
  expect(document.querySelector('meta[name="description"]').content).toBe(translations[lang].product.whatText)
  expect(document.querySelector('link[rel="canonical"]').href).toBe(seo.origin + '/about')
  expect(document.querySelector('link[hreflang]')).toBeNull()
})
