import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { getTrialStatus, sendTrialMessage } from '../utils/api'
import AdvisorComposer from './AdvisorComposer'

export default function FreePreview({ sessionId, careerContext, onByok }) {
  const { user, loading } = useAuth()
  const { t } = useApp()
  if (loading) return <p role="status">{t.beta.loading}</p>
  if (!user) return (
    <section className="freePreview" aria-label={t.experience.free}>
      <p>{t.experience.signInRequired}</p>
      <a href="/#login" onClick={() => {
        sessionStorage.setItem('careerflow-auth-return', window.location.hash || window.location.pathname)
      }}>{t.beta.login}</a>
      {onByok && <button type="button" onClick={onByok}>{t.experience.connectKey}</button>}
    </section>
  )
  return <SignedInPreview key={`${user.id}:${sessionId}`} sessionId={sessionId} careerContext={careerContext} onByok={onByok} />
}

function SignedInPreview({ sessionId, careerContext, onByok }) {
  const { t, lang } = useApp()
  const text = t.experience
  const [quota, setQuota] = useState(null)
  const [consent, setConsent] = useState(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') return false
    try {
      return sessionStorage.getItem('careerflow-ai-consent') === 'true'
    } catch {
      return false
    }
  })
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const active = useRef(false)

  useEffect(() => {
    let active = true
    getTrialStatus().then(value => { if (active) setQuota(value) }).catch(() => { if (active) setError('unavailable') })
    return () => { active = false }
  }, [sessionId])

  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])

  const handleConsentChange = event => {
    const checked = event.target.checked
    setConsent(checked)
    try {
      sessionStorage.setItem('careerflow-ai-consent', String(checked))
    } catch {}
  }

  const send = async question => {
    const message = (question ?? input).trim()
    if (!consent || busy || !quota?.available || !quota.remaining || !message || message.length > 1000) return
    setBusy(true); setError('')
    try {
      const history = careerContext ? [...messages.slice(-3), { role: 'user', content: careerContext }] : messages
      const reply = await sendTrialMessage(sessionId, history, message, lang)
      if (!active.current) return
      setMessages(previous => [...previous, { role: 'user', content: message }, { role: 'assistant', content: reply.response }])
      setQuota(previous => ({ ...previous, remaining: reply.remaining }))
      setInput('')
    } catch (failure) {
      if (!active.current) return
      setError(failure.code === 'trial_exhausted' ? 'exhausted' : ['trial_busy', 'trial_rate_limited'].includes(failure.code) ? 'busy' : failure.code === 'trial_provider_failed' ? 'failed' : 'unavailable')
      try {
        const status = await getTrialStatus()
        if (active.current) setQuota(status)
      } catch { if (active.current) setQuota(null) }
    } finally { if (active.current) setBusy(false) }
  }

  const enabled = quota?.available && quota.remaining > 0 && consent && !busy
  const unavailable = quota?.available === false || error === 'unavailable'
  const exhausted = error === 'exhausted' || (quota?.available && quota.remaining === 0)

  return (
    <section className="freePreview" aria-label={text.free}>
      <div className="previewHeader">
        {!unavailable && <h3>{text.free}</h3>}
        {!unavailable && <p className="previewSubtitle">{text.freeText}</p>}
        {!unavailable && quota && <p className="previewQuota" role="status">{text.remaining(quota.remaining, quota.total)}</p>}
        {!unavailable && quota?.total > 0 && <div className="previewQuotaTrack" role="progressbar" aria-label={text.free} aria-valuemin={0} aria-valuemax={quota.total} aria-valuenow={quota.remaining}><i style={{ width: `${Math.max(0, Math.min(100, quota.remaining / quota.total * 100))}%` }} /></div>}
        {!quota && !error && <p className="previewStatus" role="status">{t.beta.loading}</p>}
        {unavailable && <p className="previewStatus previewUnavailable" role="status"><strong>{text.unavailable}</strong></p>}
        {unavailable && <p>{text.unavailableHelp}</p>}
        {!unavailable && exhausted && <p className="previewStatus previewExhausted">{text.exhausted}</p>}
      </div>
      {(unavailable || exhausted) && onByok && <button type="button" onClick={onByok}>{text.connectKey}</button>}
      {error && !['unavailable', 'exhausted'].includes(error) && <p className="previewAlert" role="alert">{text[error] || text.failed}</p>}
      {!unavailable && quota && !exhausted && <>
      <div className="previewMessages" role="log" aria-label={t.review.advisorConversation} aria-live="polite">
        {!messages.length && <p className="previewEmpty">{t.results.askAnything}</p>}
        {messages.map((message, index) => (
          <div key={index} className={`previewMessage ${message.role === 'assistant' ? 'previewAssistant' : 'previewUser'}`}>
            <p>
              {message.role === 'assistant' && <strong>Gemini: </strong>}
              {message.content}
            </p>
          </div>
        ))}
      </div>

      <div className="previewSuggestions" aria-label={t.review.advisorSuggestions}>
        {text.suggestions.map(question => (
          <button
            key={question}
            type="button"
            className="suggestionChip"
            disabled={!enabled}
            onClick={() => send(question)}
          >
            {question}
          </button>
        ))}
      </div>

      <AdvisorComposer className="previewForm" onSend={() => send()} sendDisabled={!enabled || !input.trim()}
        sendLabel={busy ? t.beta.loading : t.results.chatSend}
        consent={<label className="previewConsentCompact">
          <input
            type="checkbox"
            checked={consent}
            onChange={handleConsentChange}
          />
          <span>{text.ageConfirm}</span>
        </label>}
        textareaProps={{ 'aria-label': t.results.chatPlaceholder, maxLength: 1000, value: input,
          onChange: event => setInput(event.target.value), disabled: !enabled, placeholder: t.results.chatPlaceholder }}
        privacy={<p className="previewDisclosure">
          {text.disclosure} <a href="/privacy">{text.privacyLink}</a>
        </p>} />
      </>}
    </section>
  )
}
