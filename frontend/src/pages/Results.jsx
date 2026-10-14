import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import Feedback from '../components/Feedback'
import styles from './Results.module.css'
import { getScoreBreakdown, formatMatchScore, formatMatchPoints, formatRawValue } from '../utils/scoring'
import { isDemoSession } from '../utils/demoProfile'
import { updatePageMetadata } from '../utils/seo'
import LLMSettings from '../components/LLMSettings'
import GuidedTour from '../components/GuidedTour'
import FreePreview from '../components/FreePreview'
import AdvisorComposer from '../components/AdvisorComposer'
import ResultsNavigation from './results/ResultsNavigation'
import BestMatchPanel from './results/BestMatchPanel'
import AllProfessionsPanel from './results/AllProfessionsPanel'
import LearningRoadmapPanel from './results/LearningRoadmapPanel'
import HistoryFeedbackPanel from './results/HistoryFeedbackPanel'
import AdvisorDrawer from './results/AdvisorDrawer'
import { LLM_PROVIDERS, LLM_SETTINGS_EVENT } from '../utils/llmSettings'
import {
  clearRecommendationHistory,
  getRecommendationHistory,
  getRecommendationState,
  saveCourseFilterPreferences,
  saveRoadmapProgress,
  sendChatStream,
  transcribeVoice,
  filterCourses as fetchFilteredCourses
} from '../utils/api';
/* ─── Constants ─────────────────────────────────────────────── */
const CATEGORY_ICONS = {
  programming: '</>',
  libraries: '☰',
  analyst_tools: '◈',
  cloud: '☁',
  databases: '◫',
  webframeworks: '◻',
  other: '◎',
  os: '⊞',
}
const BAR_COLORS = {
  skill_match: 'var(--text)',
  profile_match: 'var(--accent)',
  trend_score: 'var(--text-3)',
  market_share: 'var(--text-2)',
}
const PDF_BAR_COLORS = {
  skill_match:   '#5b8dee',
  profile_match: '#9b6ddf',
  trend_score:   '#4caf82',
  market_share:  '#f0943a',
}
const PROFILE_TECH_LABELS = {
  python: 'Python', java: 'Java', c_cpp: 'C/C++', sql: 'SQL', machine_learning: 'Machine Learning',
  data_analysis: 'Data Analysis', cloud_computing: 'Cloud Computing', cybersecurity: 'Cybersecurity',
  web_development: 'Web Development', devops: 'DevOps', networking: 'Networking',
}
const cap = s => ({ sql: 'SQL', sql_server: 'SQL Server', 'sql server': 'SQL Server', mongodb: 'MongoDB', aws: 'AWS', tensorflow: 'TensorFlow', numpy: 'NumPy', pytorch: 'PyTorch' }[String(s).toLowerCase()] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : s))

const detectCourseLanguage = course => {
  if (course?.language) return course.language
  const text = `${course?.title || ''} ${course?.description || ''}`
  if (/[ӘәҒғҚқҢңӨөҰұҮүҺһІі]/.test(text)) return 'kk'
  return /[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/.test(text) ? 'ru' : 'en'
}

const COURSE_FILTER_DEFAULTS = {
  certificate: 'all',
  price: 'all',
  language: 'all',
  platform: 'all',
  level: 'all',
}
const COURSE_FILTER_KEYS = Object.keys(COURSE_FILTER_DEFAULTS)
const normalizeFilterValue = value => String(value ?? '').trim().toLowerCase()
const normalizeCourseLevel = value => {
  const text = normalizeFilterValue(value || 'Mixed')
  if (text.includes('beginner') || text.includes('нач')) return 'Beginner'
  if (text.includes('intermediate') || text.includes('сред')) return 'Intermediate'
  if (text.includes('advanced') || text.includes('продвин') || text.includes('проф')) return 'Advanced'
  return 'Mixed'
}
const courseHasCertificate = course => course?.certificate === true || normalizeFilterValue(course?.certificate) === 'true'
const coursePriceType = course => {
  if (course?.price_type) return normalizeFilterValue(course.price_type)
  const numeric = Number(course?.price)
  if (Number.isFinite(numeric)) return numeric <= 0 ? 'free' : 'paid'
  return normalizeFilterValue(course?.price || 'unknown')
}
const formatCoursePrice = (course, t) => {
  const type = coursePriceType(course)
  const labels = t.results.courseFilters || {}
  const numeric = Number(course?.price)
  if (type === 'free') return labels.free || 'Free'
  if ((type === 'paid' || numeric > 0) && Number.isFinite(numeric) && numeric > 0 && /^[A-Z]{3}$/.test(course?.currency || '')) return `${numeric.toFixed(2)} ${course.currency}`
  if (type === 'paid' || numeric > 0) return `${labels.paid || 'Paid'} · ${t.results.verifyPrice}`
  return ''
}
const normalizeCourse = course => ({
  ...course,
  language: detectCourseLanguage(course),
  level: normalizeCourseLevel(course?.level || course?.difficulty),
  price_type: coursePriceType(course),
  certificate: courseHasCertificate(course),
})
const courseMatchesFilters = (course, filters = COURSE_FILTER_DEFAULTS) => {
  const c = normalizeCourse(course)
  if (filters.certificate === 'with' && !c.certificate) return false
  if (filters.certificate === 'without' && c.certificate) return false
  if (filters.price === 'free' && c.price_type !== 'free') return false
  if (filters.price === 'paid' && c.price_type !== 'paid') return false
  if (filters.language !== 'all' && c.language !== filters.language) return false
  if (filters.platform !== 'all' && normalizeFilterValue(c.platform) !== normalizeFilterValue(filters.platform)) return false
  if (filters.level !== 'all' && c.level !== filters.level) return false
  return true
}
const filterCourses = (courses = [], filters) => courses.map(normalizeCourse).filter(course => courseMatchesFilters(course, filters))
const getCourseFilterOptions = courses => {
  const normalized = courses.map(normalizeCourse)
  return {
    languages: [...new Set(normalized.map(course => course.language).filter(Boolean))],
    platforms: [...new Set(normalized.map(course => course.platform).filter(Boolean))].sort(),
    levels: [...new Set(normalized.map(course => course.level).filter(Boolean))],
  }
}
const activeCourseFilterCount = filters => COURSE_FILTER_KEYS.filter(key => filters[key] && filters[key] !== 'all').length

const normalizeSkillKey = s => String(s || '').toLowerCase().replace(/[^a-z0-9+#]+/g, '_').replace(/^_+|_+$/g, '')
const pct = (value, max = 1) => Math.max(0, Math.min(100, Math.round((parseFloat(value || 0) / max) * 100)))
const sumSkillCount = roadmap => Object.values(roadmap || {}).reduce((total, skills) => total + (Array.isArray(skills) ? skills.length : 0), 0)
const flattenRoadmapSkills = roadmap => Object.entries(roadmap || {}).flatMap(([cat, skills]) =>
  (Array.isArray(skills) ? skills : []).map(skill => ({ cat, skill }))
)
const getProfessionRoadmapSummary = (results, profession) => {
  const all = results?.roadmaps_by_profession?.[profession]
  if (all) return all
  return { full: results?.full_roadmap || {}, gap: {} }
}
const getProfessionSkillCoverage = (results, profession) => {
  const summary = results.roadmaps_by_profession?.[profession]
  const full = summary?.full ?? (profession === results.top_profession ? results.full_roadmap : null)
  const gap = summary?.gap ?? (profession === results.top_profession && results.roadmap_with_courses
    ? Object.fromEntries(Object.entries(results.roadmap_with_courses).map(([cat, skills]) => [cat, Object.keys(skills)])) : null)
  if (full == null || gap == null) return null
  const all = flattenRoadmapSkills(full)
  const missing = new Set(flattenRoadmapSkills(gap).map(({ cat, skill }) => `${cat}::${normalizeSkillKey(skill)}`))
  return { total: all.length, known: all.filter(({ cat, skill }) => !missing.has(`${cat}::${normalizeSkillKey(skill)}`)) }
}

const mergeAudioChunks = chunks => {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const samples = new Float32Array(totalLength)
  let offset = 0
  chunks.forEach(chunk => {
    samples.set(chunk, offset)
    offset += chunk.length
  })
  return samples
}

const getAudioRms = samples => {
  if (!samples.length) return 0
  const sumSquares = samples.reduce((sum, sample) => sum + sample * sample, 0)
  return Math.sqrt(sumSquares / samples.length)
}

const encodeWav = (samples, sampleRate) => {
  const bytesPerSample = 2
  const blockAlign = bytesPerSample
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample)
  const view = new DataView(buffer)
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i += 1) view.setUint8(offset + i, string.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * bytesPerSample, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, samples.length * bytesPerSample, true)

  let offset = 44
  samples.forEach(sample => {
    const clamped = Math.max(-1, Math.min(1, sample))
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += bytesPerSample
  })

  return new Blob([view], { type: 'audio/wav' })
}

const createWavRecorder = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const AudioContext = window.AudioContext || window.webkitAudioContext
  const audioContext = new AudioContext()
  const source = audioContext.createMediaStreamSource(stream)
  const processor = audioContext.createScriptProcessor(4096, 1, 1)
  const mutedOutput = audioContext.createGain()
  const chunks = []

  mutedOutput.gain.value = 0
  processor.onaudioprocess = event => {
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)))
  }

  source.connect(processor)
  processor.connect(mutedOutput)
  mutedOutput.connect(audioContext.destination)

  return {
    stop: async () => {
      processor.disconnect()
      mutedOutput.disconnect()
      source.disconnect()
      stream.getTracks().forEach(track => track.stop())
      await audioContext.close()
      const samples = mergeAudioChunks(chunks)
      return {
        blob: encodeWav(samples, audioContext.sampleRate),
        rms: getAudioRms(samples),
      }
    },
  }
}

const DEPENDENCY_RULES = {
  fastapi: ['python'],
  django: ['python'],
  flask: ['python'],
  pandas: ['python'],
  numpy: ['python'],
  pytorch: ['python'],
  tensorflow: ['python'],
  scikit_learn: ['python'],
  spark: ['python', 'sql'],
  airflow: ['python'],
  dbt: ['sql'],
  tableau: ['sql'],
  power_bi: ['sql'],
  react: ['javascript'],
  next_js: ['javascript', 'react'],
  node_js: ['javascript'],
  kubernetes: ['docker'],
  terraform: ['cloud_computing'],
}

const ChevronIcon = ({ dir = 'left' }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    {dir === 'left'  && <path d="M15 18l-6-6 6-6"/>}
    {dir === 'right' && <path d="M9 18l6-6-6-6"/>}
    {dir === 'down'  && <path d="M6 9l6 6 6-6"/>}
    {dir === 'up'    && <path d="M18 15l-6-6-6 6"/>}
  </svg>
)

/* ─── Copy Icon ──────────────────────────────────────────────── */
const CopyIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
)
const CheckIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

/* ─── Progress Ring ──────────────────────────────────────────── */
function ProgressRing({ value, size = 64, stroke = 5, color = '#5b8dee', animKey }) {
  const [progress, setProgress] = useState(0)
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct  = Math.round(value * 100)

  useEffect(() => {
    setProgress(0)
    const t = setTimeout(() => setProgress(pct), 80)
    return () => clearTimeout(t)
  }, [pct, animKey])

  return (
    <div
      style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - circ * progress / 100}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: size < 60 ? '0.65rem' : '0.78rem',
        fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text)',
        flexDirection: 'column', lineHeight: 1.2,
      }} aria-label={formatMatchScore(value)}><span>{formatMatchPoints(value)}</span><small style={{ fontSize: '.6rem', color: 'var(--text-2)' }}>/100</small></div>
    </div>
  )
}

function SkillImpactChart({ explanation, profile, t }) {
  const [expanded, setExpanded] = useState(false)
  const isShap = !!explanation?.shap_explanations?.length
  const rawItems = isShap ? explanation.shap_explanations : explanation?.items || []
  if (!rawItems.length) return <p className={styles.methodNote}>{t.polish.explanationUnavailable}</p>
  const totalAbs = rawItems.reduce((sum, item) => sum + Math.abs(item.value || 0), 0)
  const items = rawItems.map(item => ({
    name: t.form.technicalLabels[isShap ? item.feature_name : item.feature] || t.form.soft[isShap ? item.feature_name : item.feature] || (isShap ? item.label || item.feature_name : item.skill),
    feature: isShap ? item.feature_name : item.feature,
    input: profile?.[isShap ? item.feature_name : item.feature] ?? (!isShap && typeof item.present === 'boolean' ? (item.present ? t.polish.present : t.polish.absent) : '—'),
    presence: isShap && Object.hasOwn(PROFILE_TECH_LABELS, item.feature_name) && [0, 1].includes(profile?.[item.feature_name])
      ? (profile[item.feature_name] ? t.polish.present : t.polish.absent) : null,
    value: isShap ? item.influence_percent : totalAbs > 1e-9 ? (item.value || 0) / totalAbs * 100 : 0,
  }))
  const maxAbs = Math.max(...items.map(item => Math.abs(item.value)), .001)
  const strongest = sign => items.filter(item => sign * item.value > 0).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 3)
  const leading = [...strongest(1), ...strongest(-1)]
  const rows = list => <div className={styles.skillImpactChart}>{list.map(item => <div key={item.feature || item.name} className={styles.skillImpactRow}>
    <span className={styles.skillImpactName}>{item.name}<small>{t.polish.profileValue}: {item.presence || item.input}{Object.hasOwn(t.form.soft, item.feature) && typeof item.input === 'number' && ' / 5'}</small>
    </span>
    <span className={styles.skillImpactTrack} aria-hidden="true"><span className={styles.skillImpactBaseline} />
      <i className={item.value >= 0 ? styles.skillImpactPositive : styles.skillImpactNegative}
        style={{ [item.value >= 0 ? 'left' : 'right']: '50%', width: `${Math.abs(item.value) / maxAbs * 50}%` }} />
    </span>
    <span className={styles.skillImpactValue}>{item.value > 0 ? '+' : ''}{item.value.toFixed(2)}%</span>
  </div>)}</div>
  return <div className={styles.skillExplainBlock}>
    <div className={styles.featureSummary} id="career-feature-contributions">
      {rows(expanded ? items : leading)}
      {!expanded && !leading.length && <p>{t.polish.noContributions}</p>}
    </div>
    <ul className={styles.shapLegend}>{t.review.shapSigns.map(([label, description]) => <li key={label}><strong>{label}</strong><span>{description}</span></li>)}</ul>
    <p className={styles.methodNote}>{t.review.shapLimit}</p>
    <button type="button" className={styles.featureDisclosure} aria-controls="career-feature-contributions" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? t.review.collapseFeatures : t.polish.fullFeatures} ({items.length}) <span aria-hidden="true">{expanded ? '⌃' : '⌄'}</span></button>
    <details className={styles.featureDetails}><summary>{t.review.shapHelp}</summary>
      {t.review.shapReading.map(([title, text], index) => <p className={styles.methodNote} key={title}><strong>{title} </strong>{index === 0 ? isShap ? t.polish.shapDenominator : t.review.fallbackDenominator : text}</p>)}
      {!isShap && <p className={styles.methodNote}>{t.results.shapFallback}</p>}
    </details>
  </div>
}

function ExplainabilityPanel({ profession, t, skillExplanation, profile }) {
  if (!profession) return null

  return (
    <details className={styles.explainCard} data-tour-detail="explanation">
      <summary>{t.polish.classifierExplanation}</summary>
      <SkillImpactChart explanation={skillExplanation} profile={profile} t={t}/>
    </details>
  )
}

function SkillDependencyTree({ roadmap, doneSkills, formSkills, t }) {
  const profileSkills = new Set((formSkills || []).map(normalizeSkillKey))
  const learned = new Set([
    ...(formSkills || []).map(normalizeSkillKey),
    ...Array.from(doneSkills || []).map(key => normalizeSkillKey(key.split('::')[1] || key)),
  ])
  const items = flattenRoadmapSkills(Object.fromEntries(
    Object.entries(roadmap || {}).map(([cat, skills]) => [cat, skills.map(item => item.skill)])
  ))
  const enriched = items.map(item => {
    const key = normalizeSkillKey(item.skill)
    const prerequisites = DEPENDENCY_RULES[key] || []
    const isDone = learned.has(key)
    const ready = prerequisites.every(dep => learned.has(normalizeSkillKey(dep)))
    return { ...item, key, prerequisites, isDone, ready }
  })
  const next = enriched.find(item => !item.isDone && item.ready) || enriched.find(item => !item.isDone)

  if (!enriched.length) return null

  return (
    <section className={styles.dependencyPanel}>
      <div className={styles.dependencyHeading}>
        <h3>{t.results.dependencyTree}</h3>
        {next && <small>{t.results.nextStep}: {cap(next.skill)}</small>}
      </div>
      <p className={styles.methodNote}>{t.review.dependencyShort}</p>
      <details className={styles.featureDetails}><summary>{t.review.dependencyHelp}</summary><p className={styles.methodNote}>{t.review.dependencyNote}</p></details>
      <div className={styles.dependencyTree}>
        {enriched.map(item => (
          <div key={`${item.cat}-${item.skill}`} data-skill={item.skill} className={`${styles.dependencyNode} ${item.isDone ? styles.dependencyDone : item.ready ? styles.dependencyReady : styles.dependencyLocked}`}>
            <div className={styles.dependencyNodeTop}>
              <h4>{cap(item.skill)}</h4>
              <strong>{item.isDone ? profileSkills.has(item.key) ? t.review.fromProfile : t.review.selfMarked : item.ready ? t.results.ready : t.results.locked}</strong>
            </div>
            <div className={styles.dependencyPrereq}>
              {item.prerequisites.length > 0 && <span>{t.results.prerequisites}</span>}
              <div>
                {item.prerequisites.length
                  ? item.prerequisites.map(dep => (
                    <i key={dep} className={learned.has(normalizeSkillKey(dep)) ? styles.prereqDone : ''}>{cap(dep.replace(/_/g, ' '))} — {profileSkills.has(normalizeSkillKey(dep)) ? t.review.fromProfile : learned.has(normalizeSkillKey(dep)) ? t.review.selfMarked : t.review.prerequisiteMissing}</i>
                  ))
                  : <span>{t.review.noPrerequisites}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function CourseFilters({ filters, options, onChange, onReset, loading, t }) {
  const labels = t.results.courseFilters
  const languageLabels = t.results.courseLanguages || {}
  const activeCount = activeCourseFilterCount(filters)
  const setFilter = (key, value) => onChange({ ...filters, [key]: value })
  const languageOptions = ['en', 'ru', 'kk', 'other', ...(options.languages || [])]
    .filter((value, index, arr) => arr.indexOf(value) === index)
  const levelOptions = ['Beginner', 'Intermediate', 'Advanced', 'Mixed', ...(options.levels || [])]
    .filter((value, index, arr) => arr.indexOf(value) === index)
  const platformOptions = ['Coursera', 'Stepik', 'Udemy', 'edX', 'Udacity', ...(options.platforms || [])]
    .filter(Boolean)
    .filter((value, index, arr) => arr.findIndex(item => normalizeFilterValue(item) === normalizeFilterValue(value)) === index)

  return (
    <section className={styles.courseFilterPanel} aria-busy={loading}>
      <div className={styles.compareHeader}>
        <span>{labels.title}</span>
        <small role="status">
          {loading
            ? t.review.loadingCourses
            : labels.active(activeCount)}
        </small>
      </div>
      <div className={styles.courseFilterGrid}>
        <label>
          <span>{labels.certificate}</span>
          <select value={filters.certificate} onChange={e => setFilter('certificate', e.target.value)}>
            <option value="all">{labels.all}</option>
            <option value="with">{labels.withCertificate}</option>
            <option value="without">{labels.withoutCertificate}</option>
          </select>
        </label>
        <label>
          <span>{labels.price}</span>
          <select value={filters.price} onChange={e => setFilter('price', e.target.value)}>
            <option value="all">{labels.all}</option>
            <option value="free">{labels.free}</option>
            <option value="paid">{labels.paid}</option>
          </select>
        </label>
        <label>
          <span>{labels.language}</span>
          <select value={filters.language} onChange={e => setFilter('language', e.target.value)}>
            <option value="all">{labels.all}</option>
            {languageOptions.map(value => (
              <option key={value} value={value}>{languageLabels[value] || value}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{labels.platform}</span>
          <select value={filters.platform} onChange={e => setFilter('platform', e.target.value)}>
            <option value="all">{labels.all}</option>
            {platformOptions.map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{labels.level}</span>
          <select value={filters.level} onChange={e => setFilter('level', e.target.value)}>
            <option value="all">{labels.all}</option>
            {levelOptions.map(value => (
              <option key={value} value={value}>{labels.levels?.[value] || value}</option>
            ))}
          </select>
        </label>
      </div>
      {activeCount > 0 && (
        <div className={styles.activeFilters}>
          {COURSE_FILTER_KEYS.filter(key => filters[key] !== 'all').map(key => (
            <button key={key} type="button" onClick={() => setFilter(key, 'all')}>
              {labels[key]}: {labels[filters[key]] || languageLabels[filters[key]] || labels.levels?.[filters[key]] || filters[key]}
            </button>
          ))}
          <button type="button" className={styles.resetFilters} onClick={onReset}>{labels.reset}</button>
        </div>
      )}
    </section>
  )
}

export function getCourseProviderUrl(course) {
  if (!course) return null
  if (course.url && typeof course.url === 'string' && course.url.startsWith('http')) {
    return course.url
  }
  const title = encodeURIComponent(course.title || '')
  const platform = (course.platform || '').toLowerCase().trim()
  if (platform.includes('coursera')) {
    return `https://www.coursera.org/search?query=${title}`
  }
  if (platform.includes('stepik')) {
    return `https://stepik.org/catalog/search?q=${title}`
  }
  if (platform.includes('edx')) {
    return `https://www.edx.org/search?q=${title}`
  }
  if (platform.includes('udacity')) {
    return `https://www.udacity.com/courses/all?search=${title}`
  }
  if (platform.includes('udemy')) {
    return `https://www.udemy.com/courses/search/?q=${title}`
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`${course.platform || ''} ${course.title || ''}`.trim())}`
}

function CourseCard({ course, t, onOpen, onCopy, copied }) {
  const providerUrl = getCourseProviderUrl(course)
  return (
    <div className={styles.courseWrap}>
      <button type="button" className={styles.course} onClick={() => onOpen(course)}>
        <span className={styles.coursePlatform}>{course.platform}</span>
        <span className={styles.courseTitle}>{course.title || t.review.courseUntitled}</span>
        <span className={styles.courseMeta}>
          {course.rating > 0 && <span className={styles.courseRating}>★ {course.rating}</span>}
          {course.reviews != null && (
            <span className={styles.courseReviews}>
              {Number(course.reviews).toLocaleString()} {t.results.reviews}
            </span>
          )}
          {course.hasLanguage !== false && <span className={styles.courseReviews}>{t.results.courseLanguages?.[course.language] || course.language}</span>}
          {course.hasLevel !== false && <span className={styles.courseReviews}>{t.results.courseFilters?.levels?.[course.level] || course.level}</span>}
          {formatCoursePrice(course, t) && <span className={styles.coursePrice}>{formatCoursePrice(course, t)}</span>}
        </span>
      </button>
      <div className={styles.roadmapCourseActions}>
        {providerUrl && <a href={providerUrl} target="_blank" rel="noopener noreferrer" className={styles.secondaryAction}>{course.url ? t.results.openCourse : t.results.openCourseSearch.replace('{provider}', course.platform || t.results.courseFilters.platform)}</a>}
        <button type="button" className={styles.courseCopyBtn} aria-label={`${t.results.copy}: ${course.title || t.review.courseUntitled}`} onClick={onCopy}>
        {copied ? <CheckIcon/> : <CopyIcon/>}
        </button>
      </div>
    </div>
  )
}

function RecommendedCoursePanel({ courses, filters, t, onOpen, onCopy, copiedMsg }) {
  const visible = filterCourses(courses, filters)
  return (
    <section className={styles.recommendedCoursesPanel}>
      <div className={styles.compareHeader}>
        <span>{t.results.courses}</span>
        <small>{visible.length}</small>
      </div>
      {visible.length === 0 ? (
        <div className={styles.courseEmptyState}>{t.results.courseEmptyState}</div>
      ) : (
        <div className={styles.courseCardGrid}>
          {visible.slice(0, 8).map((course, index) => (
            <div key={`${course.skill}-${course.title}-${index}`} className={styles.courseGridItem}>
              <span className={styles.courseSkillTag}>{cap(course.skill)}</span>
              <CourseCard
                course={course}
                t={t}
                onOpen={onOpen}
                copied={copiedMsg === `recommended-${index}`}
                onCopy={e => onCopy(e, course, `recommended-${index}`)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
/* ─── Vacancy trend ──────────────────────────────────────────── */
/* ─── Helpers ────────────────────────────────────────────────── */
const copyText = (text) => {
  // Modern API - works only on HTTPS/localhost
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text)
  }

  // Fallback for HTTP / local network
  const el = document.createElement('textarea')
  el.value = text
  el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0'
  document.body.appendChild(el)
  el.focus()
  el.select()
  try {
    document.execCommand('copy')
  } catch (e) {
    console.warn('Copy failed', e)
  }
  document.body.removeChild(el)
}

function orderedRows(allRows, sortBy) {
  const idx = allRows.findIndex(r => r.sortKey === sortBy)
  if (idx <= 0) return allRows
  return [allRows[idx], ...allRows.slice(0, idx), ...allRows.slice(idx + 1)]
}

const stripMarkdown = text => text
  .replace(/#{1,6}\s/g, '')
  .replace(/\*\*(.+?)\*\*/g, '$1')
  .replace(/\*(.+?)\*/g, '$1')
  .replace(/_{1,3}(.+?)_{1,3}/g, '$1')
  .replace(/- /gm, '\u2022 ')
  .replace(/\[(.+?)\]\(.+?\)/g, '$1')
  .replace(/`(.+?)`/g, '$1')
  .replace(/```[\s\S]*?```/g, '')
  .replace(/> /gm, '')
  .trim()

const isCareerChatAllowed = message => {
  const text = String(message || '').toLowerCase()
  const injection = [
    'ignore previous', 'system prompt', 'developer message', 'reveal instructions',
    'забудь инструкции', 'игнорируй инструкции', 'системный промпт', 'раскрой инструкции',
  ]
  const offTopic = [
    'bubble sort', 'write code', 'generate code', 'solve math', 'math problem', 'essay',
    'пузырьковую сортировку', 'напиши код', 'сгенерируй эссе', 'реши задачу', 'математик',
  ]
  const career = [
    'career', 'profession', 'job', 'roadmap', 'skill', 'course', 'recommendation',
    'карьер', 'професс', 'работ', 'роадмап', 'навык', 'курс', 'рекомендац',
    'мансап', 'маман', 'жұмыс', 'жоспар', 'дағды', 'курс', 'ұсыныс',
  ]
  if (injection.some(pattern => text.includes(pattern))) return false
  if (offTopic.some(pattern => text.includes(pattern)) && !career.some(pattern => text.includes(pattern))) return false
  return true
}

/* ─── Course description modal ───────────────────────────────── */
function CourseModal({ course, onClose, t }) {
  const dialog = useRef(null)
  useEffect(() => {
    const trigger = document.activeElement
    dialog.current.querySelector('button').focus()
    const handler = e => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const controls = [...dialog.current.querySelectorAll('button, a[href]')]
        const first = controls[0], last = controls[controls.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', handler)
    return () => { window.removeEventListener('keydown', handler); trigger?.focus() }
  }, [onClose])

  return (
    <div className={`${styles.modalOverlay} ${styles.roadmapCourseModal}`} onClick={onClose}>
      <div ref={dialog} className={styles.modalBox} role="dialog" aria-modal="true" aria-labelledby="learning-course-title" onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalMeta}>
            <span className={styles.modalPlatform}>{course.platform}</span>
            {course.rating > 0 && (
              <span className={styles.modalRating}>★ {course.rating}</span>
            )}
          </div>
          <button type="button" className={styles.modalClose} aria-label={t.review.closeCourse} onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <h3 id="learning-course-title" className={styles.modalTitle}>{course.title || t.review.courseUntitled}</h3>
        {course.description ? (
          <p className={styles.modalDesc}>{course.description}</p>
        ) : (
          <p className={styles.modalDescEmpty}>{t.results.noDescription}</p>
        )}
        {(() => {
          const providerUrl = getCourseProviderUrl(course)
          if (!providerUrl) return null
          const linkLabel = course.url
            ? t.results.openCourse
            : (t.results.openCourseSearch?.replace('{provider}', course.platform || 'Provider') || `${t.results.openCourse} (${course.platform})`)
          return (
            <a href={providerUrl} target="_blank" rel="noopener noreferrer" className={styles.modalLink}>
              {linkLabel} →
            </a>
          )
        })()}
        <p style={{ marginTop: 14, fontSize: '0.8rem', color: 'var(--text-3, #888)', lineHeight: 1.45 }}>
          {t.results.courseCatalogNote || t.review.roadmapNote}
        </p>
      </div>
    </div>
  )
}

/* ─── Deep Mode Button ───────────────────────────────────────── */
function DeepModeBtn({ active, onClick, disabled, lang, t }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`${styles.deepModeBtn} ${active ? styles.deepModeBtnActive : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={active ? t.results.disableDeep : t.results.enableDeep}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6L15 21H9l-.3-5.9A7 7 0 0 1 5 9a7 7 0 0 1 7-7z"/>
        <line x1="9" y1="21" x2="15" y2="21"/>
      </svg>
      <span>{t.results.thinking}</span>
      {active && (
        <span className={styles.deepModePulse}/>
      )}
    </button>
  )
}

/* ─── Scoring Formula Header ─────────────────────────────────── */
function ScoringFormulaHeader({ results, profession, t, profile }) {
  const components = getScoreBreakdown(results, profession)
  const labels = {
    profile_match: t.results.classification, skill_match: t.results.skillMatch,
    trend_score: t.review.historicalTrend, market_share: t.review.demandShare,
  }
  const descriptions = [t.results.formulaLegendProfile, t.results.formulaLegendSkill, t.results.formulaLegendTrend, t.results.formulaLegendShare]
  const hasWeights = components.every(item => item.weight != null)
  const modelInputs = results.skill_explanations?.[profession]?.shap_explanations || []
  const inputKeys = [...new Set([...Object.keys(profile || {}), ...modelInputs.map(item => item.feature_name)])]
  return (
    <section className={styles.formulaBanner} aria-label={t.review.weightedSignals}>
      <h2 className={styles.formulaTitle}>{t.review.weightedSignals}</h2>
      <p className={styles.methodNote}>{t.review.calculationShort}</p>
      {components.some(item => !item.available) && <p className={styles.methodNote}>{t.review.partialSignals}</p>}
      <div className={styles.formulaLegend}>
        {components.map(item => (
          <div key={item.key} data-signal={item.key} className={styles.signalContribution}>
            <strong><i style={{ background: BAR_COLORS[item.key] }} />{labels[item.key]}</strong>
            <b>{!item.available || item.contribution == null ? '—' : t.review.addedPoints(t.review.pointsValue(item.contribution))}</b>
          </div>
        ))}
      </div>
      <details className={styles.methodDetails}>
        <summary>{t.review.calculationTitle}</summary>
        <p>{hasWeights ? t.review.weightExplanation(components.map(item => Number((item.weight * 100).toFixed(2)))) : t.review.missingWeights}</p>
        <details className={styles.methodologyDetails}><summary>{t.review.technicalDetails}</summary>
          <section className={styles.technicalGroup} aria-label={t.review.scoreCalculation}>
            <h3>{t.review.scoreCalculation}</h3>
            {hasWeights && components.every(item => item.available) ? <code className={styles.scoreEquation}>
              {components.map(item => `${(item.value * 100).toFixed(2)} × ${item.weight.toFixed(2)}`).join(' + ')} ≈ {formatMatchScore(results.final_scores[profession])}
            </code> : <p>{hasWeights ? t.review.partialSignals : t.review.missingWeights}</p>}
            <p className={styles.tableScrollHint}>{t.review.scrollTable}</p>
            <div className={styles.methodTableWrap} tabIndex={0} role="region" aria-label={t.review.scoreCalculation}>
              <table className={styles.methodTable}>
                <thead><tr><th>{t.polish.signal}</th><th>{t.review.raw}</th><th>{t.review.index}</th><th>{t.review.weight}</th><th>{t.review.contribution}</th></tr></thead>
                <tbody>{components.map(item => <tr key={item.key}>
                  <th scope="row">{labels[item.key]}</th><td>{item.available ? <details className={styles.rawValue}>
                    <summary aria-label={`${t.review.showExactValue}: ${formatRawValue(item.raw)}`}>{formatRawValue(item.raw)}</summary><code>{String(item.raw)}</code>
                  </details> : '—'}</td><td>{item.available ? `${item.value !== 0 && Math.abs(item.value * 100) < .005 ? (item.value * 100).toPrecision(5) : (item.value * 100).toFixed(2)} / 100` : '—'}</td>
                  <td>{item.weight == null ? '—' : `${Number((item.weight * 100).toFixed(2))}%`}</td><td>{!item.available || item.contribution == null ? '—' : t.review.pointsValue(item.contribution)}</td>
                </tr>)}</tbody>
              </table>
            </div>
            <p>{t.review.normalization}</p>
            <p>{t.review.displayPrecision}</p>
          </section>
          <section className={styles.technicalGroup} aria-label={t.review.dataTitle}>
            <h3>{t.review.dataTitle}</h3>
            {components.map((item, index) => <p key={item.key}><strong>{labels[item.key]}: </strong>{descriptions[index]}</p>)}
            {components.find(item => item.key === 'market_share' && item.available) && <p>{t.review.marketShareValue(results.demand_scores[profession].market_share, Object.keys(results.demand_scores).length)}</p>}
            <p>{t.review.marketNote}</p>
            <a href="/#methodology">{t.review.sources}</a>
          </section>
          <details className={styles.technicalGroup}>
            <summary>{t.review.modelInputs}</summary>
            <p>{t.review.modelInputsNote}</p>
            <dl className={styles.evaluationInputs}><div><dt>{t.polish.classifierOutput}</dt><dd>{results.classification_scores?.[profession]?.toPrecision(5) ?? '—'}</dd></div></dl>
            <div className={styles.methodTableWrap} tabIndex={0} role="region" aria-label={t.review.modelInputs}>
              <table className={`${styles.methodTable} ${styles.inputTable}`}>
                <thead><tr><th>{t.polish.signal}</th><th>{t.review.enteredValue}</th><th>{t.review.usedByModel}</th></tr></thead>
                <tbody>{inputKeys.map(key => {
                  const input = modelInputs.find(item => item.feature_name === key)
                  const value = profile?.[key]
                  return <tr key={key}><th scope="row"><code>{key}</code></th>
                    <td>{value == null ? '—' : Array.isArray(value) ? value.join(', ') || '—' : String(value)}</td>
                    <td>{typeof input?.raw_value === 'number' ? input.raw_value.toPrecision(5) : '—'}</td>
                  </tr>
                })}</tbody>
              </table>
            </div>
          </details>
          {!!results.user_skills_ranked?.length && <details className={styles.technicalGroup}>
            <summary>{t.polish.calculatedSkills}</summary><p>{t.results.skillsTooltip}</p>
            <dl className={styles.evaluationInputs}>{results.user_skills_ranked.map((item, index) => <div key={index}><dt>{item.skill}</dt><dd>{item.tfidf_weight} · {item.status === 'General/Non-IT Token' ? t.polish.generalToken : t.polish.tokenWeight}</dd></div>)}</dl>
          </details>}
        </details>
      </details>
    </section>
  )
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function Results({ results: initialResults, formData, onBack, onRetry, onEditProfile, onNewAnalysis, onHistorySelect, openAdvisor = false }) {
  const { t, lang, llmProvider } = useApp()
  const { user } = useAuth()
  const [stateLoaded, setStateLoaded] = useState(false)
  const [persistenceError, setPersistenceError] = useState(false)
  const voiceSupported = LLM_PROVIDERS.find(p => p.id === llmProvider)?.voice
  const voiceAvailable = voiceSupported && !!navigator.mediaDevices?.getUserMedia && !!(window.AudioContext || window.webkitAudioContext)
    && (window.isSecureContext !== false || ['localhost', '127.0.0.1'].includes(window.location.hostname))

  const [results,      setResults]      = useState(initialResults)
  const [tab,          setTab]          = useState('best')
  useEffect(() => {
    const titles = { best: t.results.title, all: t.results.allScores, roadmap: t.results.roadmap, history: t.review.historyTab }
    updatePageMetadata('results', t, lang, titles[tab])
  }, [tab, t, lang])
  const careerHeading = useRef(null)
  const detailFocusRequested = useRef(false)
  useEffect(() => {
    if (tab === 'best' && detailFocusRequested.current) {
      careerHeading.current?.focus()
      detailFocusRequested.current = false
    }
  }, [tab])
  const [tourStep, setTourStep] = useState(initialResults._guided ? 0 : null)
  const resultHeading = useRef(null)
  useEffect(() => { if (tourStep === null) resultHeading.current?.focus({ preventScroll: true }) }, [tourStep, results.session_id])
  const [advisorMode, setAdvisorMode] = useState(llmProvider ? 'byok' : 'preview')
  const changeTourStep = step => {
    setTourStep(step)
    setTab(step === 2 ? 'all' : step === 3 ? 'roadmap' : 'best')
    if (step === 0 || step === 1) setSelectedProf(null)
  }
  const [doneSkills, setDoneSkills] = useState(new Set())
  const [sortBy,       setSortBy]       = useState('score')
  const [selectedProf, setSelectedProf] = useState(null)
  const [messages,     setMessages]     = useState([])
  const [input,        setInput]        = useState('')
  const [chatLoading,  setChatLoading]  = useState(false)
  const [deepMode,     setDeepMode]     = useState(false)
  const [copied,       setCopied]       = useState(null)
  const [rightOpen,    setRightOpen]    = useState(openAdvisor)
  const closeAdvisor = useCallback(() => setRightOpen(false), [])
  useEffect(() => { if (openAdvisor) setRightOpen(true) }, [openAdvisor])
  const [pdfLoading,   setPdfLoading]   = useState(false)
  const [openCats,     setOpenCats]     = useState(new Set())
  const [cardKey,      setCardKey]      = useState(0)
  const [copiedMsg,    setCopiedMsg]    = useState(null)
  const [activeCourse, setActiveCourse] = useState(null)   // ← for course modal
  const closeCourse = useCallback(() => setActiveCourse(null), [])
  const [categoryOrder, setCategoryOrder] = useState([])
  const [skillOrders, setSkillOrders] = useState({})
  const [dragItem, setDragItem] = useState(null)
  const [history, setHistory] = useState([])
  const [savedCurrent, setSavedCurrent] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceNotice, setVoiceNotice] = useState('')
  const [chatSize, setChatSize] = useState({ width: 440, height: null })
  const [courseFilters, setCourseFilters] = useState(COURSE_FILTER_DEFAULTS)
  const [filteredRoadmap, setFilteredRoadmap] = useState(null)   // ← overrides rawRoadmap courses when filters are active
  const [filterLoading,  setFilterLoading]  = useState(false)

  const aiCtaInfo = useMemo(() => {
    if (llmProvider === 'anthropic') {
      return {
        button: t.results.askClaude || 'Ask Claude',
        buttonFull: t.results.askClaudeRecommendation || 'Ask Claude about this recommendation',
        title: t.results.aiCtaTitle || 'Have questions about this recommendation?',
        subtitle: t.results.aiCtaSubtitle || 'Discuss career growth, skill gaps, or learning steps with your personal assistant.',
      }
    }
    if (llmProvider === 'gemini') {
      return {
        button: t.results.askGemini || 'Ask Gemini',
        buttonFull: t.results.askGeminiRecommendation || 'Ask Gemini about this recommendation',
        title: t.results.aiCtaTitle || 'Have questions about this recommendation?',
        subtitle: t.results.aiCtaSubtitle || 'Discuss career growth, skill gaps, or learning steps with your personal assistant.',
      }
    }
    return {
      button: t.results.askAi || 'Ask AI Advisor',
      buttonFull: t.results.askAiRecommendation || 'Ask AI Advisor about this recommendation',
      title: t.results.aiCtaTitle || 'Have questions about this recommendation?',
      subtitle: t.results.aiCtaSubtitle || 'Discuss career growth, skill gaps, or learning steps with your personal assistant.',
    }
  }, [llmProvider, t])

  const handleOpenAiAdvisor = () => {
    setRightOpen(true)
  }

  const messagesEndRef = useRef(null)
  const textareaRef    = useRef(null)
  const abortRef       = useRef(null)
  const voiceRecorderRef = useRef(null)
  const voiceAbortRef = useRef(null)
  const aiVersionRef = useRef(0)

  useEffect(() => {
    const stopAI = () => {
      aiVersionRef.current += 1
      abortRef.current?.abort()
      voiceAbortRef.current?.abort()
      const recorder = voiceRecorderRef.current
      voiceRecorderRef.current = null
      recorder?.stop().catch(() => {})
      setListening(false)
      setVoiceNotice('')
      setChatLoading(false)
      setMessages(prev => prev.map(m => ({ ...m, streaming: false })))
    }
    window.addEventListener(LLM_SETTINGS_EVENT, stopAI)
    return () => {
      aiVersionRef.current += 1
      window.removeEventListener(LLM_SETTINGS_EVENT, stopAI)
      abortRef.current?.abort()
      voiceAbortRef.current?.abort()
      voiceRecorderRef.current?.stop().catch(() => {})
    }
  }, [])

  useEffect(() => {
    setResults(initialResults)
    setSelectedProf(null)
    setSavedCurrent(false)
  }, [initialResults])

  const top_profession = results.top_profession
  const resultStorageKey = `career-result:${results.session_id || top_profession || 'local'}`
  const profLabel = name => t.professions?.[name] || name
  const catLabel = cat => t.categories?.[cat] || cat.replace(/_/g, ' ')
  const skillWord = n => t.results.skillWord ? t.results.skillWord(n) : `${n} skills`

  const ALL_SCORE_ROWS = [
    { key: 'profile_match', label: t.results.classification,  sortKey: 'profile', max: 1   },
    { key: 'skill_match',   label: t.results.skillMatch,      sortKey: 'skill',   max: 1   },
    { key: 'trend_score',   label: t.results.trend,           sortKey: 'trend',   max: 1   },
    { key: 'market_share',  label: t.results.marketShare,     sortKey: 'market',  max: 1 },
  ]

  const SORT_OPTIONS = [
    { key: 'score',   label: t.results.sortOptions.score   },
    { key: 'skill',   label: t.results.sortOptions.skill   },
    { key: 'profile', label: t.results.sortOptions.profile },
    { key: 'trend',   label: t.results.sortOptions.trend   },
    { key: 'market',  label: t.results.sortOptions.market  },
  ]

  const tabs = [
    { key: 'best',    label: t.results.tabs.best    },
    { key: 'all',     label: t.results.tabs.all     },
    { key: 'roadmap', label: t.results.tabs.roadmap },
    { key: 'history', label: t.review.historyTab },
  ]

  const allProfessions = Object.entries(results.final_scores || {}).map(([name, final_score]) => {
    const breakdown = getScoreBreakdown(results, name)
    return {
      name, final_score, breakdown, skillCoverage: getProfessionSkillCoverage(results, name),
      ...Object.fromEntries(breakdown.map(item => [item.key, item.value])),
      contributions: Object.fromEntries(breakdown.map(item => [item.key, item.contribution])),
      vacancies_per_week: results.demand_scores?.[name]?.predicted_vacancies ?? null,
    }
  })

  const rankedProfessions = [...allProfessions].sort((a, b) => (b.final_score ?? 0) - (a.final_score ?? 0))
  const professionRanks = Object.fromEntries(rankedProfessions.map((p, index) => [p.name, index + 1]))

  const sorted = [...allProfessions].sort((a, b) => {
    if (sortBy === 'score')   return (b.final_score ?? 0)  - (a.final_score ?? 0)
    if (sortBy === 'skill')   return (b.skill_match ?? 0)  - (a.skill_match ?? 0)
    if (sortBy === 'profile') return (b.profile_match ?? 0)- (a.profile_match ?? 0)
    if (sortBy === 'trend')   return (b.trend_score ?? 0)  - (a.trend_score ?? 0)
    if (sortBy === 'market')  return parseFloat(b.market_share ?? 0) - parseFloat(a.market_share ?? 0)
    return 0
  })

  const requestedProfName = selectedProf || top_profession
  const activeProf = allProfessions.find(p => p.name === requestedProfName) || rankedProfessions[0]
  const activeProfName = activeProf?.name || requestedProfName
  const advisorCareerContext = activeProfName !== top_profession ? t.review.advisorCareerContext(profLabel(activeProfName)) : null

  const rawRoadmap = results?.roadmaps_by_profession?.[activeProfName]?.roadmap_with_courses || results.roadmap_with_courses

  // filteredRoadmap (from backend) takes priority over rawRoadmap when filters are active
  const activeRoadmapSource = filteredRoadmap ?? rawRoadmap

  const roadmapAdapted = Object.fromEntries(
    Object.entries(activeRoadmapSource || {}).map(([cat, skills]) => [
      cat,
      Object.entries(skills).map(([skill, data]) => ({
        skill,
        courses: (data.courses || []).map(c => ({
          title:       c.title,
          platform:    c.platform,
          rating:      c.rating,
          reviews:     c.num_reviews ?? c.reviews ?? null,
          url:         c.course_url || null,
          description: c.description || c.short_intro || null,
          certificate: c.certificate ?? false,
          language:    c.language,
          hasLanguage: Boolean(c.language),
          hasLevel:    Boolean(c.level || c.difficulty),
          level:       c.level || c.difficulty || 'Mixed',
          difficulty:  c.difficulty || c.level || 'Mixed',
          price_type:  c.price_type || 'unknown',
          price:       c.price ?? null,
          currency:    c.currency || null,
        })),
      })),
    ])
  )

  const allRoadmapCourses = Object.entries(roadmapAdapted).flatMap(([cat, skills]) =>
    skills.flatMap(item => (item.courses || []).map(course => ({
      ...normalizeCourse(course),
      cat,
      skill: item.skill,
    })))
  )
  const courseFilterOptions = getCourseFilterOptions(allRoadmapCourses)
  const selectedSkillExplanation = results.skill_explanations?.[activeProf?.name] || null

  const orderedCategoryKeys = [...categoryOrder, ...Object.keys(roadmapAdapted).filter(cat => !categoryOrder.includes(cat))]
    .filter(cat => roadmapAdapted[cat])
  const orderedRoadmapEntries = orderedCategoryKeys.map(cat => {
    const order = skillOrders[cat] || []
    const skills = [...(roadmapAdapted[cat] || [])].sort((a, b) => {
      const ai = order.indexOf(a.skill)
      const bi = order.indexOf(b.skill)
      if (ai === -1 && bi === -1) return 0
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
    const active = skills.filter(s => !doneSkills.has(`${cat}::${s.skill}`))
    const completed = skills.filter(s => doneSkills.has(`${cat}::${s.skill}`))
    return [cat, [...active, ...completed]]
  })
  const totalRoadmapSteps = Object.values(roadmapAdapted).reduce((sum, skills) => sum + skills.length, 0)
  const doneRoadmapSteps = Array.from(doneSkills).filter(key => {
    const [cat, skill] = key.split('::')
    return roadmapAdapted[cat]?.some(item => item.skill === skill)
  }).length

  const toggleSkill = (cat, skillName) => {
  const key = `${cat}::${skillName}`
  setDoneSkills(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })
}
  useEffect(() => {
    const keys = Object.keys(roadmapAdapted)
    setOpenCats(new Set(keys))
    setCategoryOrder(keys)
    setSkillOrders(Object.fromEntries(keys.map(cat => [cat, roadmapAdapted[cat].map(item => item.skill)])))
    setDoneSkills(new Set())
    setCourseFilters(COURSE_FILTER_DEFAULTS)
    let cancelled = false
    setStateLoaded(false)
    setPersistenceError(false)
    if (results.session_id) {
      getRecommendationState(results.session_id)
        .then(state => {
          if (cancelled) return
          const progress = state.progress || {}
          if (Array.isArray(progress.doneSkills)) setDoneSkills(new Set(progress.doneSkills))
          if (Array.isArray(progress.categoryOrder) && progress.categoryOrder.length) setCategoryOrder(progress.categoryOrder)
          if (progress.skillOrders) setSkillOrders(progress.skillOrders)
          if (progress.selectedProfession) setSelectedProf(progress.selectedProfession)
          if (state.filters && Object.keys(state.filters).length) {
            setCourseFilters({ ...COURSE_FILTER_DEFAULTS, ...state.filters })
          }
          setStateLoaded(true)
        })
        .catch(() => { if (!cancelled) setPersistenceError(true) })
    } else {
      setStateLoaded(true)
    }
    return () => { cancelled = true }
  }, [resultStorageKey])

  useEffect(() => {
    if (!results.session_id || !stateLoaded) return
    const timer = setTimeout(() => {
      saveRoadmapProgress(results.session_id, {
        doneSkills: Array.from(doneSkills),
        categoryOrder,
        skillOrders,
        selectedProfession: activeProfName,
      }).catch(() => setPersistenceError(true))
    }, 350)
    return () => clearTimeout(timer)
  }, [doneSkills, categoryOrder, skillOrders, activeProfName, results.session_id, stateLoaded])

  useEffect(() => {
    if (!results.session_id || !stateLoaded) return
    const timer = setTimeout(() => {
      saveCourseFilterPreferences(results.session_id, courseFilters).catch(() => setPersistenceError(true))
    }, 350)
    return () => clearTimeout(timer)
  }, [courseFilters, results.session_id, stateLoaded])

  useEffect(() => {
    if (!user) { setHistory([]); return }
    let active = true
    getRecommendationHistory().then(data => { if (active) setHistory(data.items || []) })
      .catch(() => { if (active) setHistory([]) })
    return () => { active = false }
  }, [user])

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') {
        setRightOpen(false)
        setActiveCourse(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggleCat = cat => setOpenCats(prev => {
    const next = new Set(prev)
    next.has(cat) ? next.delete(cat) : next.add(cat)
    return next
  })

  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    aiVersionRef.current += 1
    abortRef.current?.abort()
    voiceAbortRef.current?.abort()
    voiceRecorderRef.current?.stop().catch(() => {})
    voiceRecorderRef.current = null
    setChatLoading(false); setListening(false); setVoiceNotice(''); setInput('')
    const staticMsg = t.results.initialChat
      ? t.results.initialChat(profLabel(top_profession))
      : `Your top match is ${profLabel(top_profession)}.`
    setMessages([{ role: 'assistant', content: staticMsg, streaming: false }])
  // Conversation belongs to the recommendation session, not the drawer's visibility.
  }, [results.session_id])

  useEffect(() => { return () => abortRef.current?.abort() }, [])

  /* ─── Send message ─────────────────────────────────────────── */
  const sendMessage = async (overrideMsg) => {
    const msg = (overrideMsg ?? input).trim()
    if (!llmProvider || !msg || chatLoading) return
    const version = aiVersionRef.current

    if (!isCareerChatAllowed(msg)) {
      setMessages(p => [
        ...p,
        { role: 'user', content: msg },
        { role: 'assistant', content: t.results.assistantScope, streaming: false },
      ])
      setInput('')
      return
    }

    const userMsg         = { role: 'user', content: msg }
    // The first message is the local welcome text, not a provider conversation turn.
    const turns = messages.slice(1).filter(m => m.content)
    const historySnapshot = advisorCareerContext ? [...turns.slice(-39), { role: 'user', content: advisorCareerContext }] : turns

    setMessages(p => [...p, userMsg, { role: 'assistant', content: '', streaming: true }])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setChatLoading(true)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller


    
    try {
          const response = await sendChatStream(
              {
                session_id: results.session_id,
                history: historySnapshot,
                message: msg,
                deep: deepMode,
                lang: lang,
              },
              controller.signal
            );

      if (!response.ok) throw new Error('Stream failed')

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let full     = ''
      let thoughts = ''
      let buffer   = ''

      while (true) {
        const { done, value } = await reader.read()
        if (controller.signal.aborted) return
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split(/\r?\n\r?\n/)
        buffer = parts.pop() || ''

        for (const part of parts) {
          const text = part.replace(/^data:\s*/, '').trim()
          if (!text || text === '[DONE]') continue

          const data = JSON.parse(text)
          if (data.type === 'error') {
            throw Object.assign(new Error('AI request failed.'), { code: data.code })
          }
          if (data.type === 'thought') {
            thoughts += data.content
          } else if (data.content) {
            full += data.content
          }

          setMessages(p => {
            const updated = [...p]
            updated[updated.length - 1] = {
              role: 'assistant', content: stripMarkdown(full), thoughts, streaming: true,
            }
            return updated
          })
        }
      }

      setMessages(p => {
        const updated = [...p]
        updated[updated.length - 1] = {
          role: 'assistant', content: stripMarkdown(full) || t.errors.api, thoughts, streaming: false,
        }
        return updated
      })

    } catch (err) {
      if (err.name === 'AbortError' || version !== aiVersionRef.current) return
      setMessages(p => {
        const updated = [...p]
        updated[updated.length - 1] = {
          role: 'assistant', content: t.llm.errors[err.code] || t.llm.errors.provider_unavailable, thoughts: '', streaming: false, error: true,
        }
        return updated
      })
    } finally {
      if (version === aiVersionRef.current && abortRef.current === controller) setChatLoading(false)
    }
  }

  const handleSelectProf = name => {
    setSelectedProf(name)
    setTab('best')
    setCardKey(k => k + 1)
  }

  const handleCopyRoadmap = () => {
    const lines = []
    Object.entries(roadmapAdapted).forEach(([cat, skills]) => {
      lines.push(catLabel(cat).toUpperCase())
      skills.forEach(s => {
        lines.push(`  - ${cap(s.skill)}`)
        s.courses.forEach(c => lines.push(`    ${c.title} (${c.platform})`))
      })
    })
    copyText(`${t.results.roadmap}: ${profLabel(activeProfName)}\n\n` + lines.join('\n'))
    setCopied('roadmap')
    setTimeout(() => setCopied(null), 2000)
  }

  const handleCopyCourse = (event, course, key) => {
    event.preventDefault()
    event.stopPropagation()
    const providerUrl = getCourseProviderUrl(course)
    const text = providerUrl ? `${course.title} (${course.platform}): ${providerUrl}` : `${course.title} (${course.platform})`
    copyText(text)
    setCopiedMsg(key)
    setTimeout(() => setCopiedMsg(null), 2000)
  }

  const resetCourseFilters = () => {
    setCourseFilters(COURSE_FILTER_DEFAULTS)
    setFilteredRoadmap(null)
  }

  // Convert frontend filter shape -> backend _apply_dynamic_filters shape
  const toBackendFilters = (filters) => {
    const out = {}
    if (filters.price !== 'all')           out.price_types     = [filters.price]
    if (filters.language !== 'all')        out.languages        = [filters.language]
    if (filters.platform !== 'all')        out.platforms        = [filters.platform]
    if (filters.level !== 'all')           out.levels           = [filters.level]
    if (filters.certificate === 'with')    out.has_certificate  = true
    if (filters.certificate === 'without') out.has_certificate  = false
    return out
  }

  // Flat list of gap skills (all skill keys from rawRoadmap)
  const gapSkillsList = useMemo(() => {
    return rawRoadmap
      ? Object.values(rawRoadmap).flatMap(catSkills => Object.keys(catSkills))
      : []
  }, [rawRoadmap])

  useEffect(() => {
    const isDefault = Object.keys(COURSE_FILTER_DEFAULTS).every(
      k => courseFilters[k] === COURSE_FILTER_DEFAULTS[k]
    )
    if (isDefault) {
      console.log("[CourseFilter] filters are default, resetting filtered roadmap");
      setFilteredRoadmap(null)
      return
    }
    if (!gapSkillsList.length) {
      console.log("[CourseFilter] gapSkillsList is empty, skipping filter request");
      return
    }

    let cancelled = false
    setFilterLoading(true)

    const backendFilters = toBackendFilters(courseFilters);
    console.log("[CourseFilter] sending request to backend:", {
      skills_gaps: gapSkillsList,
      filters: backendFilters,
      lang: lang
    });

    fetchFilteredCourses(
      gapSkillsList,
      backendFilters,
      lang
    )
      .then(data => {
        if (cancelled) {
          console.log("[CourseFilter] request was cancelled/superseded");
          return
        }
        console.log("[CourseFilter] received data from backend:", data);
        if (data?.courses_by_skills && rawRoadmap) {
          const merged = Object.fromEntries(
            Object.entries(rawRoadmap).map(([cat, catSkills]) => [
              cat,
              Object.fromEntries(
                Object.entries(catSkills).map(([skill, skillData]) => {
                  const backendKey = Object.keys(data.courses_by_skills || {}).find(
                    k => k.toLowerCase() === skill.toLowerCase()
                  )
                  const newCourses = backendKey ? data.courses_by_skills[backendKey] : []
                  return [
                    skill,
                    { ...skillData, courses: newCourses },
                  ]
                })
              ),
            ])
          )
          console.log("[CourseFilter] successfully merged and set filtered roadmap:", merged);
          setFilteredRoadmap(merged)
        }
      })
      .catch(err => {
        if (cancelled) return
        console.warn('[CourseFilter] backend error, fallback to client-side filtering:', err)
        setFilteredRoadmap(null)
      })
      .finally(() => { if (!cancelled) setFilterLoading(false) })

    return () => { cancelled = true }
  /* eslint-disable-next-line */
  }, [courseFilters, lang, gapSkillsList, rawRoadmap])

  const handleShare = () => {
    const text = `${t.results.selectedCareer}: ${profLabel(activeProfName)} · ${t.review.scoreTitle}: ${activeProf?.final_score != null ? formatMatchScore(activeProf.final_score) : '—'} · CareerFlow · https://careerflow.live`
    if (navigator.share) {
      navigator.share({ title: 'CareerFlow', text }).catch(() => {})
    } else {
      copyText(text)
      setCopied('share')
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const saveCurrentResult = () => {
    const entry = {
      id: `${Date.now()}-${results.session_id || top_profession}`,
      createdAt: new Date().toISOString(),
      top_profession,
      selectedProfession: activeProfName,
      results,
      progress: {
        done: Array.from(doneSkills),
        categoryOrder,
        skillOrders,
      },
    }
    const next = [entry, ...history.filter(item => item.results?.session_id !== results.session_id && item.id !== entry.id)].slice(0, 12)
    setHistory(next)
    setSavedCurrent(true)
    if (results.session_id) {
      saveRoadmapProgress(results.session_id, {
        doneSkills: Array.from(doneSkills),
        categoryOrder,
        skillOrders,
        selectedProfession: activeProfName,
      })
        .then(() => getRecommendationHistory())
        .then(data => setHistory(data.items || next))
        .catch(() => {})
    }
  }

  const openHistoryItem = item => {
    setResults(item.results)
    onHistorySelect?.({ ...item.results, _isDemo: item.results._isDemo || isDemoSession(item.results.session_id) })
    setSelectedProf(item.selectedProfession || item.top_profession)
    setDoneSkills(new Set(item.progress?.done || []))
    setCategoryOrder(item.progress?.categoryOrder || [])
    setSkillOrders(item.progress?.skillOrders || {})
    setTab('best')
    setSavedCurrent(true)
    if (item.results?.session_id) {
      getRecommendationState(item.results.session_id)
        .then(state => {
          if (state.filters) setCourseFilters({ ...COURSE_FILTER_DEFAULTS, ...state.filters })
        })
        .catch(() => {})
    }
  }

  const clearHistory = () => {
    if (!window.confirm(t.review.clearHistoryConfirm)) return
    setHistory([])
    clearRecommendationHistory().catch(() => {})
  }

  const moveCategory = (fromCat, toCat) => {
    if (!fromCat || !toCat || fromCat === toCat) return
    setCategoryOrder(prev => {
      const base = orderedCategoryKeys
      const next = [...base]
      const from = next.indexOf(fromCat)
      const to = next.indexOf(toCat)
      if (from < 0 || to < 0) return prev
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const moveSkill = (cat, fromSkill, toSkill) => {
    if (!cat || !fromSkill || !toSkill || fromSkill === toSkill) return
    setSkillOrders(prev => {
      const base = prev[cat] || roadmapAdapted[cat]?.map(item => item.skill) || []
      const next = [...base]
      const from = next.indexOf(fromSkill)
      const to = next.indexOf(toSkill)
      if (from < 0 || to < 0) return prev
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return { ...prev, [cat]: next }
    })
  }

  const resizeChatInput = () => {
    requestAnimationFrame(() => {
      if (!textareaRef.current) return
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
    })
  }

  const startVoiceInput = async () => {
    if (!llmProvider || !voiceSupported) return
    const version = aiVersionRef.current
    if (!navigator.mediaDevices?.getUserMedia || !(window.AudioContext || window.webkitAudioContext)) {
      setVoiceNotice(t.results.voiceUnsupported)
      return
    }

    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    if (window.isSecureContext === false && !isLocalhost) {
      setVoiceNotice(t.results.voiceSecureContext)
      return
    }

    try {
      const recorder = await createWavRecorder()
      if (version !== aiVersionRef.current) { await recorder.stop(); return }
      voiceRecorderRef.current = recorder
      setListening(true)
      setVoiceNotice(t.results.voiceListening)
    } catch (err) {
      if (version !== aiVersionRef.current) return
      setListening(false)
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        setVoiceNotice(t.results.voicePermission)
      } else if (err?.name === 'NotFoundError') {
        setVoiceNotice(t.results.voiceNoMic)
      } else {
        setVoiceNotice(t.results.voiceError)
      }
    }
  }

  const stopVoiceInput = async () => {
    const version = aiVersionRef.current
    const recorder = voiceRecorderRef.current
    voiceRecorderRef.current = null
    setListening(false)
    if (!recorder) return

    try {
      setVoiceNotice(t.results.voiceTranscribing)
      const audio = await recorder.stop()
      if (version !== aiVersionRef.current) return
      if (audio.rms < 0.004) {
        setVoiceNotice(t.results.voiceNoSpeech)
        return
      }
      const controller = new AbortController()
      voiceAbortRef.current = controller
      const data = await transcribeVoice(audio.blob, lang, controller.signal)
      if (version !== aiVersionRef.current) return
      const text = (data.text || '').trim()
      if (!text) {
        setVoiceNotice(t.results.voiceNoSpeech)
        return
      }
      setInput(text)
      setVoiceNotice('')
      resizeChatInput()
    } catch (err) {
      if (version !== aiVersionRef.current) return
      if (err.name !== 'AbortError') setVoiceNotice(t.llm.errors[err.code] || t.results.voiceError)
    }
  }

  const startChatResize = e => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = chatSize.width
    const onMove = event => {
      const nextWidth = Math.min(Math.max(startWidth + (startX - event.clientX), 300), Math.min(window.innerWidth - 24, 620))
      setChatSize(size => ({ ...size, width: nextWidth }))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const speakLastAnswer = () => {
    if (!window.speechSynthesis) return
    const last = [...messages].reverse().find(m => m.role === 'assistant' && m.content)
    if (!last) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(last.content)
    utterance.lang = lang === 'kk' ? 'kk-KZ' : lang === 'ru' ? 'ru-RU' : 'en-US'
    window.speechSynthesis.speak(utterance)
  }

  const handleExportPdf = () => {
  setPdfLoading(true)
  const rows = orderedRows(ALL_SCORE_ROWS, 'score')

  // Remove garbage from strings
  const clean = str => String(str || '')
    .replace(/[★✓□◎*·•]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const esc = str => clean(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const scoreLines = rows
    .filter(r => activeProf?.[r.key] != null)
    .map(r => `<div class="score-row">
      <span class="score-label">${r.label}</span>
      <div class="score-bar-wrap">
        <div class="score-bar">
          <div class="score-fill" style="width:${Math.round(parseFloat(activeProf[r.key]) / r.max * 100)}%;background:${PDF_BAR_COLORS[r.key]}"></div>
        </div>
        <span class="score-pct">${Math.round(parseFloat(activeProf[r.key]) / r.max * 100)} / 100</span>
      </div>
    </div>`).join('')

  const allScoreLines = sorted.map(p => {
    const factors = rows.map(r => `<span style="background:${PDF_BAR_COLORS[r.key]};width:${(p.contributions?.[r.key] ?? 0)}%"></span>`).join('')
    return `<div class="all-score-row">
      <span class="all-score-name">${esc(profLabel(p.name))}</span>
      <div class="all-score-track"><i style="width:${pct(p.final_score)}%"></i><b>${factors}</b></div>
      <span class="all-score-pct">${formatMatchScore(p.final_score)}</span>
    </div>`
  }).join('')

  const scoreCircles = sorted.map(p => {
    const score = pct(p.final_score)
    return `<div class="score-circle">
      <div class="circle" style="--score:${score * 3.6}deg"><span>${formatMatchPoints(p.final_score)}<small>/100</small></span></div>
      <strong>${esc(profLabel(p.name))}</strong>
    </div>`
  }).join('')

  const gapRows = sorted.map(p => {
    const summary = getProfessionRoadmapSummary(results, p.name)
    const total = sumSkillCount(summary.full)
    const gap = sumSkillCount(summary.gap)
    const known = Math.max(total - gap, 0)
    const completion = total ? Math.round(known / total * 100) : 0
    return `<div class="gap-row">
      <span>${esc(profLabel(p.name))}</span>
      <div class="gap-track"><i style="width:${completion}%"></i></div>
      <b>${known}/${total}</b>
    </div>`
  }).join('')

  const explainRows = rows
    .filter(r => activeProf?.[r.key] != null)
    .map(r => `<div class="explain-row">
      <span>${esc(r.label)}</span>
      <div><i style="width:${pct(activeProf[r.key], r.max)}%;background:${PDF_BAR_COLORS[r.key]}"></i></div>
      <b>${pct(activeProf[r.key], r.max)} / 100</b>
    </div>`)
    .join('')

  const roadmapSections = Object.entries(roadmapAdapted).map(([cat, skills]) =>
    `<div class="rm-section">
      <div class="rm-cat">
        <span>${catLabel(cat).toUpperCase()}</span>
        <span class="rm-count">${skillWord(skills.length)}</span>
      </div>
      ${skills.map(s => `<div class="rm-skill">
        <span class="rm-check">□</span>
        <div class="rm-skill-body">
          <span class="rm-skill-name">${esc(cap(s.skill))}</span>
          ${s.courses.slice(0, 2).map(c => {
            const rating = c.rating && !isNaN(parseFloat(c.rating))
              ? `<span class="rm-rating">★ ${parseFloat(c.rating).toFixed(1)}</span>`
              : ''
            const reviews = c.reviews && Number(c.reviews) > 10
              ? `<span class="rm-reviews">${Number(c.reviews).toLocaleString()} ${t.results.reviews}</span>`
              : ''
            return `<div class="rm-course">
              <span class="rm-platform">${esc(c.platform)}</span>
              <span class="rm-title">${esc(c.title)}</span>
              <span class="rm-meta">${rating}${reviews}</span>
            </div>`
          }).join('')}
        </div>
      </div>`).join('')}
    </div>`
  ).join('')


  // Username from formData
  const userName = formData?.name || formData?.fullName || ''
  const headerSub = userName
    ? `${t.results.pdfFor} ${userName} · ${new Date().toLocaleDateString()}`
    : new Date().toLocaleDateString()

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>${t.results.pdfRoadmap}: ${esc(profLabel(activeProfName))}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,Segoe UI,sans-serif;color:#1e1e1c;font-size:13px;line-height:1.5}
    .header{background:#5b8dee;color:white;padding:14px 24px;display:flex;justify-content:space-between;align-items:center}
    .header-title{font-size:15px;font-weight:700}
    .header-sub{font-size:11px;opacity:0.8}
    .body{padding:24px}
    .prof-name{font-size:22px;font-weight:800;letter-spacing:-0.03em;margin-bottom:4px}
    .prof-sub{font-size:12px;color:#888;margin-bottom:18px}
    .section-title{font-size:9px;font-weight:700;letter-spacing:0.1em;color:#999;text-transform:uppercase;font-family:monospace;margin-bottom:10px}
    .scores{margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #eee}
    .score-circles{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
    .score-circle{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #eee;border-radius:8px;break-inside:avoid}
    .circle{width:38px;height:38px;border-radius:50%;background:conic-gradient(#5b8dee var(--score),#e8edf5 0);display:grid;place-items:center;flex-shrink:0}
    .circle span{width:29px;height:29px;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:9px;font-family:monospace;font-weight:700}
    .score-circle strong{font-size:10px;line-height:1.25}
    .all-scores{display:flex;flex-direction:column;gap:7px;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid #eee}
    .all-score-row{display:grid;grid-template-columns:150px 1fr 88px;gap:10px;align-items:center}
    .all-score-name{font-size:11px;color:#444}
    .all-score-track{position:relative;height:8px;background:#edf1f7;border-radius:99px;overflow:hidden}
    .all-score-track>i{position:absolute;inset:0 auto 0 0;background:#5b8dee;border-radius:99px}
    .all-score-track>b{position:absolute;inset:0;display:flex;opacity:.55}
    .all-score-track>b span{display:block;height:100%}
    .all-score-pct{font-size:11px;font-family:monospace;text-align:right}
    .score-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
    .score-label{font-size:11px;color:#666;font-family:monospace;min-width:130px}
    .score-bar-wrap{flex:1;display:flex;align-items:center;gap:8px}
    .score-bar{flex:1;height:5px;background:#eee;border-radius:3px;overflow:hidden}
    .score-fill{height:100%;border-radius:3px}
    .score-pct{font-size:11px;font-family:monospace;color:#444;min-width:66px;text-align:right}
    .explain-copy{font-size:12px;color:#555;margin-bottom:10px}
    .explain{display:flex;flex-direction:column;gap:7px;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid #eee}
    .explain-row{display:grid;grid-template-columns:130px 1fr 34px;gap:10px;align-items:center}
    .explain-row span{font-size:11px;color:#555}
    .explain-row div{height:6px;background:#eee;border-radius:99px;overflow:hidden}
    .explain-row i{display:block;height:100%;border-radius:99px}
    .explain-row b{font-size:11px;font-family:monospace;text-align:right}
    .gap-summary{display:flex;flex-direction:column;gap:7px;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid #eee}
    .gap-row{display:grid;grid-template-columns:150px 1fr 42px;gap:10px;align-items:center}
    .gap-row span{font-size:11px}
    .gap-row b{font-size:11px;font-family:monospace;text-align:right}
    .gap-track{height:7px;background:#edf1f7;border-radius:99px;overflow:hidden}
    .gap-track i{display:block;height:100%;background:#4caf82;border-radius:99px}
    .progress-line{display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:10px;border:1px solid #eee;border-radius:8px}
    .progress-line span{font-size:12px;font-weight:600;min-width:170px}
    .progress-line i{flex:1;height:8px;background:#edf1f7;border-radius:99px;overflow:hidden}
    .progress-line b{display:block;height:100%;background:#5b8dee;border-radius:99px}
    .rm-section{margin-bottom:20px;break-inside:avoid}
    .rm-cat{font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;font-family:monospace;color:#5b8dee;background:#f0f4ff;padding:5px 10px;border-radius:4px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center}
    .rm-count{font-weight:400;opacity:0.7;font-size:9px}
    .rm-skill{display:flex;gap:8px;margin-bottom:10px;padding-left:4px}
    .rm-check{font-size:12px;color:#bbb;margin-top:1px;flex-shrink:0;font-family:monospace}
    .rm-skill-body{flex:1}
    .rm-skill-name{font-size:13px;font-weight:600;display:block;margin-bottom:4px}
    .rm-course{display:flex;gap:8px;align-items:center;margin-top:3px}
    .rm-platform{font-size:10px;font-family:monospace;color:#aaa;min-width:48px;flex-shrink:0}
    .rm-title{font-size:11px;color:#555;flex:1}
    .rm-meta{display:flex;gap:6px;align-items:center;flex-shrink:0}
    .rm-rating{font-size:10px;color:#e8a045;font-family:monospace;white-space:nowrap}
    .rm-reviews{font-size:10px;color:#bbb;font-family:monospace;white-space:nowrap}
    .footer{margin-top:32px;padding-top:12px;border-top:1px solid #eee;font-size:10px;color:#bbb;font-family:monospace}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:12mm 14mm}}
  </style></head>
  <body>
    <div class="header">
      <span class="header-title">CareerFlow - ${t.results.pdfRoadmap}</span>
      <span class="header-sub">${esc(headerSub)}</span>
    </div>
    <div class="body">
      <div class="prof-name">${esc(profLabel(activeProfName))}</div>
      <div class="prof-sub">${t.results.pdfSubtitle}</div><p>${esc(t.review.scoreNote)}</p><p>${esc(t.review.marketNote)}</p>
      <div class="section-title">${t.results.pdfAllScores}</div>
      <div class="score-circles">${scoreCircles}</div>
      <div class="all-scores">${allScoreLines}</div>
      <div class="section-title">${t.results.pdfScores}</div>
      <div class="scores">${scoreLines}</div><p>${esc(t.review.normalization)}</p>
      <div class="section-title">${t.results.pdfExplain}</div>
      <div class="explain-copy">${esc(t.results.whyTop ? t.results.whyTop(profLabel(activeProf.name)) : '')}</div>
      <div class="explain">${explainRows}</div>
      <div class="section-title">${t.results.pdfSkillGap}</div>
      <div class="gap-summary">${gapRows}</div>
      <div class="section-title">${t.results.pdfProgress}</div>
      <div class="progress-line"><span>${esc(t.results.roadmapProgress(doneRoadmapSteps, totalRoadmapSteps))}</span><i><b style="width:${totalRoadmapSteps ? Math.round(doneRoadmapSteps / totalRoadmapSteps * 100) : 0}%"></b></i></div>
      <div class="section-title">${t.results.pdfRoadmap}</div><p>${esc(t.review.roadmapNote)}</p>
      ${roadmapSections}
      <div class="footer">${t.results.pdfGenerated}</div>
    </div>
  </body></html>`

  const win = window.open('', '_blank', 'width=800,height=900')
  win.document.write(html)
  win.document.close()
  win.onload = () => { win.focus(); win.print() }
  setPdfLoading(false)
}

  const layoutClass = `${styles.layout} ${!rightOpen ? styles.layoutRightClosed : ''}`

  const gapData = results.roadmaps_by_profession?.[activeProfName]?.gap
    ?? (activeProfName === top_profession && results.roadmap_with_courses
      ? Object.fromEntries(Object.entries(results.roadmap_with_courses).map(([cat, skills]) => [cat, Object.keys(skills)]))
      : null)
  const missingSkills = gapData ? flattenRoadmapSkills(gapData) : null
  const profile = results._formData || formData || {}
  const softInputs = Object.entries(t.form.soft).filter(([key]) => typeof profile[key] === 'number')

  const animKey = `${activeProfName}${tab}${cardKey}`

  return (
    <div className={layoutClass} style={{ '--chat-w': `${chatSize.width}px` }}>
        <button type="button" className={styles.aiFab} aria-label={aiCtaInfo.buttonFull} onClick={handleOpenAiAdvisor}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span className={styles.aiFabLabel}>{aiCtaInfo.button}</span>
        </button>
      <div className={styles.main}>
        <header className={styles.resultsIntro}>
          <div data-tour-slot="continue" />
          <div className={styles.contextHeading}>
            <button className={styles.backBtn} onClick={onBack}>{t.results.back}</button>
            <h1 ref={resultHeading} tabIndex={-1}>{t.results.title}</h1>
            {(results._formData || formData)?.gpa != null && <span className={styles.profileMeta}>GPA {(results._formData || formData).gpa}</span>}
            {(results._formData || formData)?.field_of_study && <span className={styles.profileMeta}>{t.form.fields[(results._formData || formData).field_of_study] || (results._formData || formData).field_of_study}</span>}
          </div>
          <ResultsNavigation tabs={tabs} activeTab={tab} onTabChange={setTab} label={t.results.title} />
          <div className={styles.sessionNotice}>
            {(results._isDemo || isDemoSession(results.session_id)) && <span className={styles.demoBadge}>{t.review.demoLabel}</span>}
            {!user ? <p>{t.beta.guestNote} <a href="#login">{t.beta.login}</a></p>
              : (results._isDemo || isDemoSession(results.session_id)) && <p>{t.experience.temporary}</p>}
            {persistenceError && <p role="alert">{t.beta.saveError}</p>}
          </div>
        </header>
        <div className={styles.resultsTools}>
        <details className={styles.contextTools}>
          <summary>{t.review.contextTools}</summary>
          <div className={styles.contextGrid}>
        <section className={styles.profileInputs}>
          {profile.skills?.length ? <><h3>{t.review.enteredSkills}</h3><div className={styles.gapChips}>{profile.skills.map(skill => <span key={skill}>{skill}</span>)}</div></> : <p>{t.review.noSkills}</p>}
          <p><strong>{t.form.technical.label}: </strong>{Object.entries(PROFILE_TECH_LABELS).filter(([key]) => profile[key] === 1).map(([key, label]) => t.form.technicalLabels[key] || label).join(', ') || t.review.noAreas}</p>
          <p><strong>{t.polish.ratedSoftSkills}: </strong>{softInputs.map(([key, label]) => `${label} ${profile[key]}/5`).join(', ') || '—'}</p>
        </section>
          </div>
        </details>
        <div className={styles.resultActions}>
          <button type="button" hidden={tab === 'best'} className={styles.actionBtnAiSidebar} onClick={handleOpenAiAdvisor}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {aiCtaInfo.button}
          </button>
          <details className={styles.actionsDisclosure}>
          <summary>{t.polish.actions}</summary>
          <div className={styles.actionsMenu}>
          <button type="button" className={styles.actionBtn} onClick={() => setTab('history')}>{t.product.shareFeedback}</button>
          <button className={styles.actionBtn} disabled={!user || results.persistent === false || results._isDemo || !stateLoaded} onClick={saveCurrentResult}>
            <CheckIcon size={12}/>
            {savedCurrent ? t.results.savedResult : t.results.saveResult}
          </button>
          <button className={styles.actionBtn} onClick={handleCopyRoadmap}>
            {copied === 'roadmap' ? <CheckIcon size={12}/> : <CopyIcon size={12}/>}
            {copied === 'roadmap' ? t.results.copied : t.results.copyRoadmap}
          </button>
          <button className={styles.actionBtn} onClick={handleShare}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            {copied === 'share' ? t.results.copied : t.results.shareResults}
          </button>
          <button className={styles.actionBtn} onClick={handleExportPdf} disabled={pdfLoading}>
            {pdfLoading
              ? <span className={styles.spinner}/>
              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
            }
            {pdfLoading ? '...' : t.results.downloadPdf}
          </button>
          <button className={styles.actionBtnNew} onClick={() => { onNewAnalysis?.(); onRetry ? onRetry() : onBack?.() }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7-7 7 7"/>
            </svg>
            {t.results.newAnalysis}
          </button>
          </div>
          </details>
        </div>
        </div>
        <div className={tab === 'history' ? styles.historyFeedbackLayout : undefined}>
        <div className={styles.tabContent} id="results-panel" role="tabpanel" aria-labelledby={`results-tab-${tab}`} key={tab === 'all' ? 'all' : `${tab}${activeProfName}${cardKey}`}>

          {/* ─ BEST MATCH ─ */}
          {tab === 'history' && <HistoryFeedbackPanel results={results} profession={activeProfName} history={history} user={user} t={t} lang={lang} profLabel={profLabel}
            onOpen={openHistoryItem} onCurrent={() => setTab('best')} onClear={clearHistory} />}
          {tab === 'best' && activeProf && (() => {
            const activeRank = professionRanks[activeProf.name]
            return (
              <BestMatchPanel profession={activeProf} rank={activeRank} isTop={activeProf.name === top_profession}
                name={profLabel(activeProf.name)} t={t} profLabel={profLabel} headingRef={careerHeading}
                alternatives={rankedProfessions.filter(p => p.name !== activeProf.name).slice(0, 3)} ranks={professionRanks}
                onSelect={handleSelectProf} onRoadmap={() => setTab('roadmap')} onCompare={() => setTab('all')}
                aiCtaInfo={aiCtaInfo} onAdvisor={handleOpenAiAdvisor}
                incompleteProfile={Array.isArray(profile.skills) && profile.skills.length === 0 ? <p className={styles.profileNotice}>{t.review.incompleteProfile} <button type="button" className={styles.secondaryAction} onClick={() => onEditProfile ? onEditProfile(profile) : onRetry?.()}>{t.review.addSkills}</button></p> : null}
                score={<ProgressRing value={activeProf.final_score ?? 0} size={112} stroke={6}
                  color="var(--accent)" animKey={animKey} />}
                scoring={<ScoringFormulaHeader results={results} profession={activeProf.name} t={t} profile={profile} />}
                skillGap={<section className={styles.gapAssessment} aria-label={t.review.skillGaps}>
                  <h2>{t.review.skillGaps}</h2>
                  {activeProf.skillCoverage && <p>{t.review.coverageCount(activeProf.skillCoverage.known.length, activeProf.skillCoverage.total)}</p>}
                  {missingSkills == null ? <p>{t.review.gapUnavailable}</p> : <>
                    <h3>{t.review.knownSkills}</h3>
                    {activeProf.skillCoverage?.known.length ? <div className={styles.gapChips}>{activeProf.skillCoverage.known.map(({cat, skill}) => <span key={`${cat}-${skill}`}>{cap(skill)}</span>)}</div> : <p>{t.review.noSkills}</p>}
                    <h3>{t.review.missingSkills}</h3>
                    {missingSkills.length ? <div className={styles.gapChips}>{missingSkills.map(({cat, skill}) => <span key={`${cat}-${skill}`}>{cap(skill)}</span>)}</div> : <p>{t.review.gapEmpty}</p>}
                  </>}
                  <p className={styles.methodNote}>{t.review.coverageNote}</p>
                  <button type="button" className={styles.secondaryAction} onClick={() => setTab('roadmap')}>{t.results.viewFullRoadmap}</button>
                </section>}
                explanation={<ExplainabilityPanel
                profession={activeProf}
                profLabel={profLabel}
                t={t}
                skillExplanation={selectedSkillExplanation}
                profile={results._formData || formData}
                />}
              />
            )
          })()}

          {/* ─ ALL PROFESSIONS ─ */}
          {tab === 'all' && (
            <AllProfessionsPanel professions={sorted} selected={activeProf} ranks={professionRanks} topName={top_profession}
              marketTrackCount={Object.keys(results.demand_scores || {}).length}
              profLabel={profLabel} t={t} sortOptions={SORT_OPTIONS} sortBy={sortBy} onSort={setSortBy}
              onSelect={setSelectedProf} onOpenDetails={() => { detailFocusRequested.current = true; setTab('best') }}
            />
          )}

          {/* ─ ROADMAP ─ */}
          {tab === 'roadmap' && (
            <LearningRoadmapPanel
              profession={profLabel(activeProfName)} entries={orderedRoadmapEntries} total={totalRoadmapSteps} completed={doneRoadmapSteps}
              doneSkills={doneSkills} openCats={openCats} dragItem={dragItem} onDragChange={setDragItem}
              onMoveCategory={moveCategory} onMoveSkill={moveSkill} onToggleCategory={toggleCat} onToggleSkill={toggleSkill}
              catLabel={catLabel} t={t} formatSkill={cap}
              fallbackNotice={activeProfName !== top_profession && !results.roadmaps_by_profession?.[activeProfName]?.roadmap_with_courses && rawRoadmap ? t.review.roadmapFallback(profLabel(top_profession)) : null}
              dependencies={<SkillDependencyTree roadmap={roadmapAdapted} doneSkills={doneSkills} formSkills={results._formData?.skills} t={t} />}
              filters={<CourseFilters filters={courseFilters} options={courseFilterOptions} onChange={setCourseFilters} onReset={resetCourseFilters} loading={filterLoading} t={t} />}
              renderCourses={(item, cat) => {
                const visibleCourses = filterCourses(item.courses || [], courseFilters)
                return <div className={styles.courses}>
                  {!visibleCourses.length && <p className={styles.courseFallback}>{activeCourseFilterCount(courseFilters) ? t.results.courseEmptyState : t.results.noCourses}</p>}
                  {visibleCourses.map((course, index) => {
                    const copyKey = `course-${cat}-${item.skill}-${index}`
                    return <CourseCard key={`${course.title}-${index}`} course={course} t={t} onOpen={setActiveCourse} copied={copiedMsg === copyKey} onCopy={e => handleCopyCourse(e, course, copyKey)} />
                  })}
                </div>
              }}
              advisor={<div className={styles.roadmapAdvisor}><div><h3>{aiCtaInfo.title}</h3><p>{aiCtaInfo.subtitle}</p></div><button type="button" className={styles.primaryAction} onClick={handleOpenAiAdvisor}>{aiCtaInfo.button}</button></div>}
            />
          )}
        </div>
        <div className={tab === 'history' ? styles.feedbackColumn : undefined} hidden={tab !== 'history'}><Feedback sessionId={results.session_id} editorial={tab === 'history'} /></div>
        </div>
      </div>

      {/* ─ RIGHT CHAT ─ */}
      <AdvisorDrawer open={rightOpen} onClose={closeAdvisor} title={t.results.chatTitle} closeLabel={t.results.closeAiPanel}
        provider={advisorMode === 'preview' ? 'Google Gemini' : LLM_PROVIDERS.find(provider => provider.id === llmProvider)?.name || t.experience.byok}
        context={<><strong>{profLabel(activeProfName)}</strong><span>{t.review.scoreTitle}: {activeProf?.final_score != null ? formatMatchScore(activeProf.final_score) : '—'}</span></>}
        width={chatSize.width} widthLabel={t.review.advisorWidth} onResize={startChatResize} onWidthChange={width => setChatSize(size => ({ ...size, width }))}>
        <div className="advisorModes" aria-label={t.results.chatTitle}>
          <button type="button" data-mode="preview" aria-pressed={advisorMode === 'preview'} onClick={() => setAdvisorMode('preview')}>{t.experience.free}</button>
          <button type="button" data-mode="byok" aria-pressed={advisorMode === 'byok'} onClick={() => setAdvisorMode('byok')}>{t.experience.byok}</button>
        </div>
        <div className={styles.advisorPreview} hidden={advisorMode !== 'preview'}><FreePreview key={results.session_id} sessionId={results.session_id} careerContext={advisorCareerContext} onByok={() => setAdvisorMode('byok')} /></div>
        <div className={styles.advisorByok} hidden={advisorMode !== 'byok'}>
        <LLMSettings />
        {llmProvider && <>
        <div className={styles.chatMessages} role="log" aria-live="polite" aria-label={t.review.advisorConversation}>
          {llmProvider && messages.length === 0 && (
            <div className={styles.chatEmpty}>
              <span className={styles.chatEmptyIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </span>
              <span>{t.results.askAnything}</span>
            </div>
          )}
          {llmProvider && messages.map((m, i) => (
            <div key={i} className={`${styles.msg} ${m.role === 'user' ? styles.msgUser : styles.msgAi}`}>
              <div className={styles.msgOuter}>
                {m.thoughts && !m.streaming && (
                  <details className={styles.thoughtBlock}>
                    <summary>{t.results.thoughts}</summary>
                    <div className={styles.thoughtContent}>{m.thoughts}</div>
                  </details>
                )}
                <div className={`${styles.msgBubble} ${m.streaming ? styles.msgStreaming : ''}`}>
                  <span role={m.error ? 'alert' : undefined}>{i === 0 ? t.results.initialChat(profLabel(top_profession)) : m.content}</span>
                  {m.streaming && !m.content && (
                    <span className={styles.thinkingStatus}>
                      {t.results.analyzing}
                      <span className={styles.thinkingDots}><i/><i/><i/></span>
                    </span>
                  )}
                </div>
                {!m.streaming && m.content && (
                  <button
                    className={`${styles.msgCopyBtn} ${m.role === 'user' ? styles.msgCopyBtnUser : styles.msgCopyBtnAi}`}
                    title={t.results.copy}
                    aria-label={t.results.copy}
                    onClick={() => {
                      copyText(i === 0 ? t.results.initialChat(profLabel(top_profession)) : m.content)
                      setCopiedMsg(`msg-${i}`)
                      setTimeout(() => setCopiedMsg(null), 2000)
                    }}
                  >
                    {copiedMsg === `msg-${i}` ? <CheckIcon size={10}/> : <CopyIcon size={10}/>}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Suggestions */}
          {llmProvider && messages.length === 1 && messages[0]?.role === 'assistant' && !messages[0]?.streaming && (
            <div className={styles.chatSuggestions}>
              {t.results.suggestions.map(q => (
                <button type="button" key={q} className={styles.suggestion} disabled={chatLoading} onClick={() => sendMessage(q)}>{q}</button>
              ))}
            </div>
          )}

          {/* Typing */}
          {chatLoading && messages[messages.length - 1]?.content === '' && !messages[messages.length - 1]?.streaming && (
            <div className={`${styles.msg} ${styles.msgAi}`}>
              <div className={styles.msgBubble}>
                <div className={styles.typing}><span/><span/><span/></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef}/>
        </div>

        <AdvisorComposer className={styles.chatBottom} sendClassName={styles.chatSend} textareaRef={textareaRef}
          onSend={() => sendMessage()} sendLabel={t.results.chatSend} sendDisabled={!llmProvider || chatLoading || !input.trim()}
          toolbar={<div className={styles.chatToolbar}>
            <DeepModeBtn active={deepMode} disabled={!llmProvider} onClick={() => setDeepMode(v => !v)} lang={lang} t={t}/>
            <button
              type="button"
              hidden={!voiceAvailable}
              className={`${styles.voiceBtn} ${listening ? styles.voiceBtnActive : ''}`}
              onClick={listening ? stopVoiceInput : startVoiceInput}
              disabled={!llmProvider || !voiceSupported}
              aria-label={t.results.voiceRecord}
              aria-pressed={listening}
              title={listening ? t.results.voiceStop : t.results.voiceRecord}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            <button type="button" className={styles.voiceBtn} hidden={!window.speechSynthesis} disabled={!messages.some(m => m.role === 'assistant' && m.content && !m.streaming)} onClick={speakLastAnswer} title={t.results.voicePlay} aria-label={t.results.voicePlay}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            </button>
          </div>}
          status={(voiceNotice || !voiceSupported) && <div className={styles.chatScope}>{voiceNotice || t.llm.voiceGemini}</div>}
          textareaProps={{ className: styles.chatInputField, value: input, disabled: !llmProvider,
            'aria-label': t.results.chatPlaceholder, placeholder: t.results.chatPlaceholder, onChange: e => setInput(e.target.value) }}
          privacy={<p className={styles.advisorPrivacy}>{t.review.advisorByokPrivacy} <a href="/privacy">{t.experience.privacyLink}</a></p>} />
        </>}
        </div>
      </AdvisorDrawer>

      {tourStep !== null && <GuidedTour step={tourStep} onStep={changeTourStep} onClose={() => setTourStep(null)} onAdvisor={handleOpenAiAdvisor} location={tab} />}

      {/* ─ COURSE MODAL ─ */}
      {activeCourse && (
        <CourseModal course={activeCourse} onClose={closeCourse} t={t}/>
      )}

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  )
}
