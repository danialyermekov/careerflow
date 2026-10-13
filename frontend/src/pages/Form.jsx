import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { parseResume } from '../utils/api'
import styles from './Form.module.css'
import { DEMO_PROFILE } from '../utils/demoProfile'

const TECH_SKILLS = [
  { key: 'python',           label: 'Python'           },
  { key: 'java',             label: 'Java'             },
  { key: 'c_cpp',            label: 'C/C++'            },
  { key: 'sql',              label: 'SQL'              },
  { key: 'machine_learning', label: 'Machine Learning' },
  { key: 'data_analysis',    label: 'Data Analysis'    },
  { key: 'cloud_computing',  label: 'Cloud Computing'  },
  { key: 'cybersecurity',    label: 'Cybersecurity'    },
  { key: 'web_development',  label: 'Web Development'  },
  { key: 'devops',           label: 'DevOps'           },
  { key: 'networking',       label: 'Networking'       },
]

const SOFT_KEYS = ['communication', 'leadership', 'problem_solving', 'teamwork', 'adaptability']
const FIELDS    = ['Data Science', 'Computer Science', 'Software Engineering', 'AI', 'Cybersecurity']
const PROFESSION_KEYS = [
  'Data Analyst',
  'Data Engineer',
  'Data Scientist',
  'Machine Learning Engineer',
  'Business Analyst',
  'Cloud Engineer',
  'Software Engineer',
]

// Autocomplete suggestions list - add as many as you want here
const SKILL_SUGGESTIONS = [
  'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Rust', 'Kotlin', 'Swift',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
  'TensorFlow', 'PyTorch', 'Keras', 'scikit-learn', 'XGBoost', 'LightGBM', 'CatBoost',
  'Pandas', 'NumPy', 'Matplotlib', 'Seaborn',
  'Cloud Computing', 'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform',
  'DevOps', 'CI/CD', 'Git', 'Linux', 'Bash', 'Networking', 'Cybersecurity',
  'Web Development', 'React', 'Vue', 'Angular', 'FastAPI', 'Django', 'Flask', 'Node.js',
  'Spark', 'Hadoop', 'Kafka', 'Airflow', 'dbt', 'Tableau', 'Power BI', 'Excel',
  'R', 'MATLAB', 'Scala', 'Julia', 'C++', 'C#', 'Go', 'Rust', 'Kotlin', 'Swift',
  'API Design', 'REST', 'GraphQL', 'Microservices', 'System Design', 'Agile', 'Scrum',
]

const ROLE_PATTERNS = [
  'Data Scientist',
  'Data Analyst',
  'Data Engineer',
  'Business Analyst',
  'Machine Learning Engineer',
  'Software Engineer',
  'Cloud Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
]

const DEFAULT = {
  skills: [], gpa: '', field_of_study: 'Computer Science',
  python: 0, java: 0, c_cpp: 0, sql: 0, machine_learning: 0,
  data_analysis: 0, cloud_computing: 0, cybersecurity: 0,
  web_development: 0, devops: 0, networking: 0,
  communication: 3, leadership: 3, problem_solving: 3, teamwork: 3, adaptability: 3,
}

export default function Form({ onSubmit, loading, initialDemo = false, initialProfile }) {
  const { t, lang } = useApp()
  const [form,       setForm]       = useState(() => initialProfile ? { ...DEFAULT, ...initialProfile } : initialDemo ? { ...DEMO_PROFILE, skills: [...DEMO_PROFILE.skills] } : DEFAULT)
  const [isDemo, setIsDemo] = useState(initialDemo)
  const [skillInput, setSkillInput] = useState('')
  const [errors,     setErrors]     = useState({})
  const [acVisible,  setAcVisible]  = useState(false)  // autocomplete dropdown
  const [acIndex,    setAcIndex]    = useState(-1)      // selected item in dropdown
  const [parsedResume, setParsedResume] = useState({ skills: [], role: '', fileName: '' })
  const [resumeNotice, setResumeNotice] = useState('')
  const [resumeLoading, setResumeLoading] = useState(false)

  const acRef      = useRef(null)
  const inputRef   = useRef(null)
  const resumeRef  = useRef(null)

  // Close dropdown when clicked outside
  useEffect(() => {
    const handler = e => {
      if (acRef.current && !acRef.current.contains(e.target)) {
        setAcVisible(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Filtered suggestions
  const acFiltered = skillInput.trim().length >= 1
    ? SKILL_SUGGESTIONS.filter(s =>
        s.toLowerCase().includes(skillInput.toLowerCase()) &&
        !form.skills.map(x => x.toLowerCase()).includes(s.toLowerCase())
      ).slice(0, 8)
    : []

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const addSkill = (raw) => {
    const s = raw.trim()
    if (s && !form.skills.map(x => x.toLowerCase()).includes(s.toLowerCase())) {
      set('skills', [...form.skills, s])
    }
    setSkillInput('')
    setAcVisible(false)
    setAcIndex(-1)
    inputRef.current?.focus()
  }

  const mergeSkills = (skills) => {
    const current = new Set(form.skills.map(x => x.toLowerCase()))
    const next = [...form.skills]
    skills.forEach(skill => {
      if (!current.has(skill.toLowerCase())) {
        current.add(skill.toLowerCase())
        next.push(skill)
      }
    })
    set('skills', next)
  }

  const removeSkill = (s) => set('skills', form.skills.filter(x => x !== s))

  const handleSkillKey = (e) => {
    if (acVisible && acFiltered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setAcIndex(i => Math.min(i + 1, acFiltered.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setAcIndex(i => Math.max(i - 1, -1))
        return
      }
      if (e.key === 'Enter' && acIndex >= 0) {
        e.preventDefault()
        addSkill(acFiltered[acIndex])
        return
      }
      if (e.key === 'Escape') {
        setAcVisible(false)
        setAcIndex(-1)
        return
      }
    }
    if (['Enter', ',', 'Tab'].includes(e.key)) {
      if (e.key === 'Tab' && !skillInput.trim()) return
      e.preventDefault()
      if (skillInput.trim()) addSkill(skillInput)
    }
    if (e.key === 'Backspace' && !skillInput && form.skills.length) {
      set('skills', form.skills.slice(0, -1))
    }
  }

  const handleSkillInput = (e) => {
    setSkillInput(e.target.value)
    setAcVisible(true)
    setAcIndex(-1)
  }

  const validate = () => {
    const e = {}
    if (!form.gpa || Number(form.gpa) < 2 || Number(form.gpa) > 4) e.gpa = t.errors.gpa
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({ ...form, gpa: Number(form.gpa), lang }, isDemo)
  }

  const parseResumeText = (text) => {
    const normalized = text.replace(/\s+/g, ' ')
    const safeRules = [
      ['Python', /\bpython\b/i],
      ['JavaScript', /\bjavascript\b|\bjs\b/i],
      ['TypeScript', /\btypescript\b|\bts\b/i],
      ['Java', /\bjava\b/i],
      ['C++', /\bc\+\+\b|\bcpp\b/i],
      ['C#', /\bc#\b|\bcsharp\b/i],
      ['Go', /\bgolang\b|\bgo\s+(developer|engineer|language|programming)\b/i],
      ['R', /\br\s+(programming|language)\b|\brstudio\b|\btidyverse\b|\bggplot2\b|\bdplyr\b/i],
      ['SQL', /\bsql\b/i],
      ['PostgreSQL', /\bpostgresql\b|\bpostgres\b/i],
      ['MySQL', /\bmysql\b/i],
      ['MongoDB', /\bmongodb\b|\bmongo\b/i],
      ['Machine Learning', /\bmachine\s+learning\b|\bml\b/i],
      ['Data Analysis', /\bdata\s+analysis\b|\banalytics\b/i],
      ['Pandas', /\bpandas\b/i],
      ['NumPy', /\bnumpy\b/i],
      ['scikit-learn', /\bscikit[-\s]?learn\b|\bsklearn\b/i],
      ['TensorFlow', /\btensorflow\b/i],
      ['PyTorch', /\bpytorch\b/i],
      ['React', /\breact(?:\.js|js)?\b/i],
      ['FastAPI', /\bfastapi\b/i],
      ['Django', /\bdjango\b/i],
      ['Flask', /\bflask\b/i],
      ['Docker', /\bdocker\b/i],
      ['Kubernetes', /\bkubernetes\b|\bk8s\b/i],
      ['AWS', /\baws\b|\bamazon\s+web\s+services\b/i],
      ['Azure', /\bazure\b/i],
      ['GCP', /\bgcp\b|\bgoogle\s+cloud\b/i],
      ['DevOps', /\bdevops\b|\bci\/cd\b|\bci\s*cd\b/i],
      ['Git', /\bgit\b|\bgithub\b|\bgitlab\b/i],
      ['Linux', /\blinux\b/i],
      ['Networking', /\bnetworking\b|\btcp\/ip\b/i],
      ['Cybersecurity', /\bcybersecurity\b|\binformation\s+security\b/i],
      ['Tableau', /\btableau\b/i],
      ['Power BI', /\bpower\s*bi\b/i],
      ['Excel', /\bexcel\b/i],
      ['Airflow', /\bairflow\b/i],
      ['Spark', /\bspark\b|\bpyspark\b/i],
      ['Kafka', /\bkafka\b/i],
      ['REST', /\brest(?:ful)?\b/i],
      ['GraphQL', /\bgraphql\b/i],
    ]
    const detectedSkills = safeRules.filter(([, regex]) => regex.test(normalized)).map(([skill]) => skill)
    const detectedRole = ROLE_PATTERNS.find(role => new RegExp(role.replace(/\s+/g, '\\s+'), 'i').test(normalized)) || ''
    return { detectedSkills, detectedRole }
  }

  const handleResumeUpload = async (file) => {
    if (!file) return
    setResumeNotice('')
    setResumeLoading(true)
    try {
      const parsed = await parseResume(file)
      const detectedSkills = parsed.skills || []
      const detectedRole = parsed.role || ''
      setParsedResume({ skills: detectedSkills, role: detectedRole, fileName: file.name })
      if (detectedSkills.length) mergeSkills(detectedSkills)
      if (detectedRole && FIELDS.includes(detectedRole)) set('field_of_study', detectedRole)
      if (!detectedSkills.length) setResumeNotice(t.form.resume.unsupported)
    } catch (error) {
      const reader = new FileReader()
      reader.onload = () => {
        const text = String(reader.result || '')
        const { detectedSkills, detectedRole } = parseResumeText(text)
        setParsedResume({ skills: detectedSkills, role: detectedRole, fileName: file.name })
        if (detectedSkills.length) mergeSkills(detectedSkills)
        if (!detectedSkills.length) setResumeNotice(t.form.resume.unsupported)
      }
      reader.onerror = () => setResumeNotice(t.form.resume.unsupported)
      reader.onloadend = () => setResumeLoading(false)
      reader.readAsText(file)
      return
    }
    setResumeLoading(false)
  }

  const clearParsedResume = () => {
    setParsedResume({ skills: [], role: '', fileName: '' })
    setResumeNotice('')
    if (resumeRef.current) resumeRef.current.value = ''
  }

  const techChecked  = TECH_SKILLS.filter(s => form[s.key] === 1).length
  const softAvg      = SOFT_KEYS.reduce((a, k) => a + form[k], 0) / SOFT_KEYS.length
  const hasGpa       = form.gpa !== '' && Number(form.gpa) >= 2 && Number(form.gpa) <= 4

  const useDemo = () => {
    setForm({ ...DEMO_PROFILE, skills: [...DEMO_PROFILE.skills] })
    setIsDemo(true)
    setErrors({})
    setSkillInput('')
    clearParsedResume()
  }

  return (
    <div className={styles.pageLayout}>
      <div className={styles.formMain}>
        <div className={styles.wrap}>
          <div className={styles.header}>
            <p className={styles.step}>{t.form.step}</p>
            <h1 className={styles.title}>{t.form.title}</h1>
            <p className={styles.subtitle}>{t.form.subtitle}</p>
            <div className={styles.demoActions}>
              <button type="button" className={styles.demoButton} disabled={loading} onClick={useDemo}>{t.review.demo}</button>
            </div>
            {isDemo && <div className={styles.demoNotice} role="status">
              <strong>{t.review.demoLabel}</strong><p>{t.review.demoHint}</p>
              {t.review.demoSharedWarning && <p className={styles.requirementNote} style={{ marginTop: 6, color: 'var(--warning)' }}>{t.review.demoSharedWarning}</p>}
            </div>}
          </div>

          <form id="career-profile" className={styles.form} onSubmit={handleSubmit}>

            <section className={styles.section}>
              <h2 className={styles.sectionLabel}>{t.form.personal.label}</h2>
              <p className={styles.hint}>{t.form.academicHint}</p>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="profile-gpa">{t.form.personal.gpa} *</label>
                  <input className={`${styles.input} ${errors.gpa ? styles.error : ''}`}
                    id="profile-gpa" name="gpa" required type="number" min="2" max="4" step="0.1"
                    value={form.gpa} placeholder="3.5" aria-invalid={!!errors.gpa} aria-describedby="gpa-hint gpa-error"
                    onChange={e => set('gpa', e.target.value)} />
                  <p id="gpa-hint" className={styles.hint}>{t.review.required}</p>
                  <span id="gpa-error" className={styles.errorMsg} role={errors.gpa ? 'alert' : undefined}>{errors.gpa}</span>
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="profile-field">{t.form.personal.field}</label>
                  <select id="profile-field" name="field_of_study" className={styles.select} value={form.field_of_study} onChange={e => set('field_of_study', e.target.value)}>
                    {FIELDS.map(f => <option key={f} value={f}>{t.form.fields[f]}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* ── Custom Skills with Autocomplete ── */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}><h2 className={styles.sectionLabel}>{t.form.skills.label}</h2><span className={styles.badge}>{form.skills.length} {t.form.selected}</span></div>
              <p className={styles.hint}>{t.form.skillsDescription}</p>
              <div className={styles.tagsInputWrap} ref={acRef}>
                <div
                  className={`${styles.tagsInput} ${errors.skills ? styles.error : ''}`}
                  onClick={() => inputRef.current?.focus()}
                >
                  <input
                    ref={inputRef}
                    role="combobox" aria-expanded={acVisible && acFiltered.length > 0} aria-controls="skill-suggestions"
                    aria-autocomplete="list" aria-activedescendant={acVisible && acIndex >= 0 ? `skill-option-${acIndex}` : undefined}
                    aria-label={t.form.skills.label}
                    className={styles.tagsInner}
                    value={skillInput}
                    onChange={handleSkillInput}
                    onKeyDown={handleSkillKey}
                    onFocus={() => skillInput.trim() && setAcVisible(true)}
                    onBlur={() => setTimeout(() => setAcVisible(false), 150)}
                    placeholder={form.skills.length ? '' : t.form.skills.placeholder}
                    autoComplete="off"
                  />
                  <button type="button" className={styles.addButton} onClick={() => addSkill(skillInput)}>{t.form.addSkill}</button>
                </div>

                {/* Autocomplete dropdown */}
                {acVisible && acFiltered.length > 0 && (
                  <div className={styles.acDropdown} id="skill-suggestions" role="listbox" aria-label={t.form.skills.label}>
                    {acFiltered.map((s, i) => (
                      <button
                        key={s}
                        type="button"
                        id={`skill-option-${i}`} role="option" aria-selected={i === acIndex} tabIndex={-1}
                        className={`${styles.acItem} ${i === acIndex ? styles.acItemActive : ''}`}
                        onMouseDown={e => { e.preventDefault(); addSkill(s) }}
                        onMouseEnter={() => setAcIndex(i)}
                      >
                        <span className={styles.acItemText}>{s}</span>
                        {/* highlight matching part */}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.tags}>
                {form.skills.map(s => <span key={s} className={styles.tag}>{s}
                  <button type="button" className={styles.tagX} onClick={() => removeSkill(s)} aria-label={`${t.review.removeSkill}: ${s}`}>×</button>
                </span>)}
              </div>

              {/* Quick suggestions - popular skills */}
              <div className={styles.skillQuick}>
                {['Python', 'SQL', 'React','Git','PostgreSQL'].map(s => {
                  const already = form.skills.map(x => x.toLowerCase()).includes(s.toLowerCase())
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`${styles.skillQuickBtn} ${already ? styles.skillQuickBtnAdded : ''}`}
                      onClick={() => already ? removeSkill(form.skills.find(x => x.toLowerCase() === s.toLowerCase())) : addSkill(s)}
                    >
                      {already ? '✓ ' : '+ '}{s}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Technical Skills ── */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}><h2 className={styles.sectionLabel}>{t.form.technical.label}</h2><span className={styles.badge}>{techChecked} / 11</span></div>
              <p className={styles.hint}>{t.form.knowledgeDescription}</p>
              <div className={styles.checkGrid}>
                {TECH_SKILLS.map(({ key, label }) => (
                  <label key={key} className={styles.checkItem}>
                    <input
                      type="checkbox" name={key} className={styles.checkbox}
                      checked={form[key] === 1}
                      onChange={e => set(key, e.target.checked ? 1 : 0)}
                    />
                    <span className={styles.checkLabel}>{t.form.technicalLabels[key] || label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ── Soft Skills ── */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}><h2 className={styles.sectionLabel}>{t.form.soft.label}</h2><span className={styles.badge}>{t.form.average} {softAvg.toFixed(1)} / 5</span></div>
              <p className={styles.hint}>{t.form.softDescription}</p>
              <div className={styles.softGrid}>
                {SOFT_KEYS.map(key => (
                  <div key={key} className={styles.softItem}>
                    <span className={styles.softLabel}>{t.form.soft[key]}</span>
                    <div className={styles.stars}>
                      {[1,2,3,4,5].map(n => (
                        <button
                          key={n} type="button"
                           className={`${styles.star} ${form[key] === n ? styles.starOn : ''}`}
                          onClick={() => set(key, n)}
                          aria-label={`${t.form.soft[key]}: ${n} / 5`}
                          aria-pressed={form[key] === n}
                         >{n}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <section className={`${styles.section} ${styles.resumeBox}`} aria-busy={resumeLoading}>
              <h2 className={styles.sectionLabel}>{t.form.resume.label}</h2>
              <p className={styles.hint}>{t.form.resume.hint}</p>
              <input ref={resumeRef} className={styles.resumeInput} type="file" aria-label={t.form.resume.upload}
                accept=".pdf,.txt,.doc,.docx,text/plain,application/pdf" onChange={e => handleResumeUpload(e.target.files?.[0])} />
              <button type="button" className={styles.resumeUploadBtn} disabled={resumeLoading} onClick={() => resumeRef.current?.click()}>
                {resumeLoading && <span className={styles.spinner} />}
                {resumeLoading ? t.form.submitting : (parsedResume.fileName || t.form.resume.upload)}
              </button>
              {(parsedResume.skills.length > 0 || parsedResume.role || resumeNotice) && <div className={styles.resumeParsed} role="status">
                {parsedResume.role && <p>{t.form.resume.role}: <strong>{parsedResume.role}</strong></p>}
                <div className={styles.resumeParsedHeader}><span>{t.form.resume.parsed}</span><button type="button" onClick={clearParsedResume}>{t.form.resume.clear}</button></div>
                <div className={styles.tags}>{parsedResume.skills.map(skill => <span key={skill} className={styles.tag}>{skill}</span>)}</div>
                {parsedResume.skills.length > 0 && <p className={styles.hint}>{t.form.importReview}</p>}
                {!parsedResume.skills.length && <p>{resumeNotice || t.form.resume.empty}</p>}
              </div>}
            </section>

            <div className={styles.actions}>
            <button type="button" className={styles.resetButton} disabled={loading || resumeLoading} onClick={() => { setForm(DEFAULT); setIsDemo(false); setErrors({}); setSkillInput(''); setAcVisible(false); setAcIndex(-1); clearParsedResume() }}>{t.form.reset}</button>
            <button type="submit" className={styles.submit} disabled={loading} aria-busy={loading}>
              {loading && <span className={styles.spinner}/>}
              {loading ? t.form.submitting : t.form.submit}
            </button>
            </div>
            <p className={styles.hint}>{hasGpa ? t.review.ready : t.review.required}<br />{t.review.optional}</p>
          </form>
        </div>
      </div>

      {/* The former side guide stays available without a second column. */}
      <details className={styles.guide}>
        <summary>{t.form.guide.title}</summary>
        <div className={styles.chatBody}>
          <div className={styles.chatMsg}>
            <div className={styles.chatBubble}>{t.form.guide.msg1}</div>
          </div>
          <div className={styles.chatMsg}>
            <div className={styles.chatBubble}>{t.form.guide.msg2}</div>
          </div>
          <div className={styles.chatMsg}>
            <div className={styles.chatBubble}>
              <strong>{t.form.guide.professionsTitle}</strong>
              <ul className={styles.chatList}>
                {PROFESSION_KEYS.map(prof => (
                  <li key={prof}>{t.professions?.[prof] || prof}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className={styles.chatMsg}>
            <div className={styles.chatBubble}>
              <strong>{t.form.guide.scoringTitle}</strong>
              <div className={styles.formula}>
                {t.form.guide.scoring.map(({ label, sub }, i) => (
                  <div key={i} className={styles.formulaStep}>
                    <div className={styles.formulaStepNum}>{i + 1}</div>
                    <div className={styles.formulaStepBody}>
                      <span className={styles.formulaStepLabel}>{label}</span>
                      <span className={styles.formulaStepSub}>{sub}</span>
                    </div>
                  </div>
                ))}
                <div className={styles.formulaFooter}>
                  <span className={styles.formulaArrow}>↑</span>
                  <span className={styles.formulaResult}>{t.form.guide.finalScore}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p>{t.review.progressHint}</p>
        <p>{t.review.skillsHint}</p><p>{t.review.technicalHint}</p><p>{t.review.softHint}</p>
        <ul>{t.form.tips.map(tip => <li key={tip}>{tip}</li>)}</ul>
      </details>
    </div>
  )
}
