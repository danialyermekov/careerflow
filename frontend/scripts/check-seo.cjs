const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { JSDOM } = require('jsdom')
const seo = require('../src/data/seo.json')
const build = path.resolve(__dirname, '../build')
const titles = new Set(), descriptions = new Set()
function checkBranding(document) {
  for (const [selector, href] of [
    ['link[rel="icon"][type="image/svg+xml"]', '/branding/favicon.svg'],
    ['link[rel="icon"][sizes="16x16 32x32 48x48"]', '/favicon.ico'],
    ['link[rel="icon"][sizes="16x16"]', '/favicon-16x16.png'],
    ['link[rel="icon"][sizes="32x32"]', '/favicon-32x32.png'],
    ['link[rel="icon"][sizes="48x48"]', '/favicon-48x48.png'],
    ['link[rel="apple-touch-icon"]', '/apple-touch-icon.png'],
    ['link[rel="manifest"]', '/manifest.json'],
  ]) {
    assert.equal(document.querySelector(selector)?.getAttribute('href'), href, `Missing branding link: ${selector}`)
    assert(fs.existsSync(path.join(build, href)), `Missing branding asset: ${href}`)
  }
}
function checkPNG(filename, size) {
  const png = fs.readFileSync(path.join(build, filename))
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [size, size], filename)
}
for (const size of [16, 32, 48]) checkPNG(`favicon-${size}x${size}.png`, size)
checkPNG('apple-touch-icon.png', 180)
const manifest = JSON.parse(fs.readFileSync(path.join(build, 'manifest.json'), 'utf8'))
for (const [src, size, purpose] of [
  ['branding/android-chrome-192x192.png', 192, 'any'],
  ['branding/android-chrome-512x512.png', 512, 'any'],
  ['branding/android-chrome-maskable-512x512.png', 512, 'maskable'],
]) {
  assert(manifest.icons.some(icon => icon.src === src && icon.sizes === `${size}x${size}` && icon.purpose === purpose))
  checkPNG(src, size)
}
const ico = fs.readFileSync(path.join(build, 'favicon.ico'))
assert.equal(ico.readUInt16LE(2), 1)
assert.equal(ico.readUInt16LE(4), 3)
assert.deepEqual([0, 1, 2].map(index => [ico[6 + index * 16], ico[7 + index * 16]]), [[16, 16], [32, 32], [48, 48]])
const css = fs.readdirSync(path.join(build, 'static/css')).filter(name => name.endsWith('.css'))
  .map(name => fs.readFileSync(path.join(build, 'static/css', name), 'utf8')).join('\n')
for (const [route, metadata] of Object.entries(seo.pages)) {
  const html = fs.readFileSync(path.join(build, route.slice(1), 'index.html'), 'utf8')
  const document = new JSDOM(html).window.document // Scripts never run in this initial-response check.
  checkBranding(document)
  assert.equal(document.title, metadata.title)
  assert.equal(document.querySelector('meta[name="description"]').content, metadata.description)
  assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1)
  assert.equal(document.querySelector('link[rel="canonical"]').href, seo.origin + route)
  assert.equal(document.documentElement.lang, 'en')
  assert.equal(document.documentElement.dataset.theme, 'light')
  assert.equal(document.querySelector('meta[name="theme-color"]').content, '#FBFBFA')
  assert.equal(document.querySelector('meta[name="robots"]').content, 'index, follow')
  for (const [attribute, name, expected] of [
    ['property', 'og:title', metadata.title], ['property', 'og:description', metadata.description], ['property', 'og:url', seo.origin + route],
    ['property', 'og:image', seo.image], ['property', 'og:site_name', 'CareerFlow'], ['property', 'og:type', 'website'],
    ['name', 'twitter:card', 'summary_large_image'], ['name', 'twitter:title', metadata.title],
    ['name', 'twitter:description', metadata.description], ['name', 'twitter:image', seo.image],
  ]) assert.equal(document.querySelector(`meta[${attribute}="${name}"]`).content, expected)
  assert.equal(document.querySelectorAll('h1').length, 1)
  assert(document.querySelector('#root').textContent.length > 250)
  assert.equal(document.querySelector('link[hreflang]'), null)
  for (const internal of Object.keys(seo.pages)) assert(document.querySelector(`a[href="${internal}"]`), `${route}: missing navigation ${internal}`)
  for (const node of document.querySelectorAll('[class]')) for (const name of node.classList) {
    if (name.includes('__')) assert(css.includes('.' + name.replace(/[+/]/g, '\\$&')), `SSR/CRA CSS module mismatch: ${name}`)
  }
  const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent))
  assert.equal(schemas.length, route === '/' ? 1 : 0)
  if (schemas.length) {
    assert.deepEqual(schemas[0]['@graph'].map(item => item['@type']), ['WebSite', 'WebApplication'])
    for (const item of schemas[0]['@graph']) {
      assert.equal(item.name, 'CareerFlow'); assert.equal(item.url, seo.origin + '/')
      for (const unsupported of ['aggregateRating', 'review', 'offers', 'downloadCount']) assert.equal(item[unsupported], undefined)
    }
  }
  titles.add(metadata.title); descriptions.add(metadata.description)
}
assert.equal(titles.size, Object.keys(seo.pages).length)
assert.equal(descriptions.size, titles.size)
const sitemap = new JSDOM(fs.readFileSync(path.join(build, 'sitemap.xml'), 'utf8'), { contentType: 'application/xml' }).window.document
assert.deepEqual([...sitemap.querySelectorAll('loc')].map(node => node.textContent), Object.keys(seo.pages).map(route => seo.origin + route))
assert.equal(sitemap.querySelector('lastmod'), null)
assert(fs.readFileSync(path.join(build, 'robots.txt'), 'utf8').includes('Sitemap: ' + seo.origin + '/sitemap.xml'))
const shell = new JSDOM(fs.readFileSync(path.join(build, 'app-shell.html'), 'utf8')).window.document
checkBranding(shell)
assert.equal(shell.documentElement.dataset.theme, 'light')
assert.equal(shell.querySelector('meta[name="robots"]').content, 'noindex, follow')
assert.equal(shell.querySelector('link[rel="canonical"]'), null)
assert.equal(shell.querySelector('#root').textContent, '')
console.log(`SEO artifact checks passed: ${titles.size} initial HTML pages, metadata, CSS modules, JSON-LD, robots, sitemap, private shell and branding assets.`)
