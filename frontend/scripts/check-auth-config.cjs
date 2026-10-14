const fs = require('node:fs')
const path = require('node:path')

function checkAuthConfig(env, bundle) {
  const url = env.REACT_APP_SUPABASE_URL || ''
  const key = env.REACT_APP_SUPABASE_PUBLISHABLE_KEY || ''
  if (!url.trim() || !key.trim()) {
    throw new Error('Auth build requires REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_PUBLISHABLE_KEY. Supply GitHub Secrets or local frontend/.env before building.')
  }
  let validUrl = false
  try {
    const parsed = new URL(url)
    validUrl = parsed.protocol === 'https:' && !parsed.username && !parsed.password
  } catch {}
  if (!validUrl || url !== url.trim()) throw new Error('REACT_APP_SUPABASE_URL must be a public HTTPS URL without surrounding whitespace.')
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key)
  if (!publicKey) {
    try {
      publicKey = key.split('.').length === 3 && JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon'
    } catch {}
  }
  if (!publicKey) throw new Error('REACT_APP_SUPABASE_PUBLISHABLE_KEY must be a public publishable or legacy anon key; server keys are forbidden.')
  if (bundle !== undefined && (!bundle.includes(url) || !bundle.includes(key))) {
    throw new Error('Auth configuration is missing from compiled JavaScript. Rebuild frontend with both REACT_APP_SUPABASE_* parameters.')
  }
}

if (require.main === module) {
  process.env.NODE_ENV = 'production'
  require('react-scripts/config/env')
  try {
    checkAuthConfig(process.env)
    if (process.argv.includes('--built')) {
      const directory = path.resolve(__dirname, '../build/static/js')
      const bundle = fs.readdirSync(directory).filter(name => /^main\..*\.js$/.test(name))
        .map(name => fs.readFileSync(path.join(directory, name), 'utf8')).join('\n')
      checkAuthConfig(process.env, bundle)
    }
    console.log('Supabase public Auth build configuration verified' + (process.argv.includes('--built') ? ' in compiled JavaScript.' : '.'))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

module.exports = { checkAuthConfig }
