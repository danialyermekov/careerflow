const { test } = require('node:test')
const assert = require('node:assert/strict')
const { checkAuthConfig } = require('./check-auth-config.cjs')

const config = {
  REACT_APP_SUPABASE_URL: 'https://test.supabase.co',
  REACT_APP_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_build_fixture',
}
const jwt = role => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.fixture`

test('requires both parameters without disclosing their values', () => {
  for (const name of Object.keys(config)) {
    assert.throws(() => checkAuthConfig({ ...config, [name]: '' }), /Auth build requires/)
  }
})
test('only permits HTTPS and browser public keys', () => {
  assert.doesNotThrow(() => checkAuthConfig(config))
  assert.doesNotThrow(() => checkAuthConfig({ ...config, REACT_APP_SUPABASE_PUBLISHABLE_KEY: jwt('anon') }))
  for (const key of ['sb_secret_private', jwt('service_role'), 'malformed']) {
    assert.throws(() => checkAuthConfig({ ...config, REACT_APP_SUPABASE_PUBLISHABLE_KEY: key }), error =>
      error.message.includes('server keys are forbidden') && !error.message.includes(key))
  }
  for (const url of ['http://test.supabase.co', 'invalid', 'https://user:password@test.supabase.co']) {
    assert.throws(() => checkAuthConfig({ ...config, REACT_APP_SUPABASE_URL: url }), /public HTTPS URL/)
  }
})
test('rejects a stale or unconfigured bundle and accepts compiled parameters', () => {
  assert.throws(() => checkAuthConfig(config, 'old bundle'), /missing from compiled JavaScript/)
  for (const value of Object.values(config)) {
    assert.throws(() => checkAuthConfig(config, value), /missing from compiled JavaScript/)
  }
  assert.doesNotThrow(() => checkAuthConfig(config, Object.values(config).join(';')))
})
