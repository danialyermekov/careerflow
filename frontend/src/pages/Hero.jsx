import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { DEMO_PROFILE } from '../utils/demoProfile'
import styles from './Hero.module.css'

const tracks = ['Data Analyst', 'Software Engineer', 'Machine Learning Engineer', 'Cloud Engineer', 'Data Scientist', 'Data Engineer', 'Business Analyst']

export default function Hero({ onStart, onDemo, demoLoading = false, error = '' }) {
  const { t } = useApp()
  const [demoSource, setDemoSource] = useState('hero')
  const launchDemo = source => { setDemoSource(source); onDemo() }
  const demoButton = source => <>
    <button className={`${styles.secondaryCta} ${styles.demoCta}`} onClick={() => launchDemo(source)} disabled={demoLoading}
      aria-label={demoLoading ? t.experience.preparingDemo : t.experience.liveDemo}>
      <span aria-hidden="true" style={{ visibility: demoLoading ? 'hidden' : 'visible' }}>{t.experience.liveDemo}</span>
      <span aria-hidden="true" style={{ visibility: demoLoading ? 'visible' : 'hidden' }}>{t.experience.preparingDemo}</span>
      {demoLoading && <i className={styles.busyLine} aria-hidden="true" />}
    </button>
    {error && demoSource === source && <div className={styles.demoError}><p role="alert">{error}</p><button className={styles.secondaryCta} onClick={() => launchDemo(source)}>{t.product.retry}</button></div>}
  </>
  useEffect(() => {
    const section = document.getElementById(window.location.hash.slice(1))
    if (!section) return
    const frame = requestAnimationFrame(() => { section.focus({ preventScroll: true }); section.scrollIntoView({ block: 'start' }) })
    return () => cancelAnimationFrame(frame)
  }, [])
  const scrollToSection = event => {
    event.preventDefault()
    const target = document.getElementById(event.currentTarget.hash.slice(1))
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: 'start' })
  }

  return <>
    <span className="visuallyHidden" role="status">{demoLoading ? t.experience.preparingDemo : ''}</span>
    <div className={styles.landing} aria-busy={demoLoading}>
    <section className={styles.hero}>
      <h1 className={styles.title}>{t.hero.titleStart}{t.hero.titleEnd}</h1>
      <p className={styles.subtitle}>{t.hero.subtitle}</p>
      <div className={styles.ctaGroup}>
        <button className={styles.cta} onClick={onStart}>{t.review.start}</button>
        {demoButton('hero')}
      </div>
      <a className={styles.methodologyLink} href="#methodology" onClick={scrollToSection}>{t.hero.methodology}</a>
      <p className={styles.accessNote}>{t.hero.recommendationAccess}</p>
      <p className={styles.guestNote}>{t.hero.guestNote}</p>
      <div className={styles.metrics}>
        {[t.hero.trackCount, '2023', t.hero.signalCount, t.hero.guestAccess].map((value, index) => <div key={value}>
          <strong>{value}</strong><span>{t.hero.metricDescriptions[index]}</span>
        </div>)}
      </div>
    </section>

    <section className={styles.section} id="how-it-works">
      <div className={styles.container}>
        <header className={styles.sectionHeader}><h2>{t.review.howTitle}</h2><p>{t.review.howIntro}</p></header>
        <ol className={styles.flow}>{t.review.steps.map(([title, text], index) => <li key={title}>
          <span className={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{text}</p>
        </li>)}</ol>
      </div>
    </section>

    <section className={`${styles.section} ${styles.shaded}`} id="interactive-preview">
      <div className={styles.container}>
        <header className={styles.sectionHeader}><h2>{t.hero.previewTitle}</h2><p>{t.hero.previewIntro}</p></header>
        <div className={styles.preview}>
          <div className={styles.previewHeader}>
            <div><strong>{t.hero.sampleProfile}</strong><p>{t.hero.demoInput}</p></div>
            <span className={styles.badge}>GPA: {DEMO_PROFILE.gpa} / 4.0</span>
            <div className={styles.chips}>{DEMO_PROFILE.skills.map(skill => <span key={skill}>{skill}</span>)}</div>
          </div>
          <div className={styles.previewBody}>
            <div>
              <div className={styles.recommendation}>
                <span className={styles.badge}>{t.review.scoreTitle}</span>
                <h3>{t.hero.previewPending}</h3><p>{t.hero.previewNote}</p>
                {demoButton('preview')}
              </div>
            </div>
            <aside className={styles.previewRoadmap}>
              <h3>{t.hero.roadmapPreview}</h3><p>{t.review.roadmapMethod}</p>
              <ol>{t.review.roadmapSteps.map((step, index) => <li key={step}><span className={styles.badge}>0{index + 1}</span><strong>{step}</strong></li>)}</ol>
              <p className={styles.note}>{t.hero.noAiKey}</p>
              <button className={styles.secondaryCta} onClick={onStart}>{t.review.start}</button>
            </aside>
          </div>
        </div>
      </div>
    </section>

    <section className={styles.section} id="scoring-engine">
      <div className={styles.container}>
        <header className={styles.sectionHeader}><h2>{t.review.inspectTitle}</h2><p>{t.review.inspectIntro}</p></header>
        <div className={styles.signalGrid}>{t.review.signals.map(([title, text], index) => <article className={styles.infoCard} key={title}>
          <span className={styles.badge}>0{index + 1}</span><h3>{title}</h3><p>{text}</p>
        </article>)}</div>
        <p className={styles.note}>{t.review.inspectNote}</p>
      </div>
    </section>

    <section className={`${styles.section} ${styles.shaded}`} id="career-tracks" tabIndex={-1}>
      <div className={styles.container}>
        <header className={styles.sectionHeader}><h2>{t.hero.tracksTitle}</h2><p>{t.review.tracksNote}</p></header>
        <div className={styles.trackGrid}>{tracks.map((track, index) => <article className={styles.infoCard} key={track}>
          <span className={styles.trackIndex}>0{index + 1}</span><h3>{t.professions[track]}</h3><p>{t.hero.trackDescriptions[index]}</p>
        </article>)}</div>
      </div>
    </section>

    <section className={styles.section} id="methodology" tabIndex={-1}>
      <div className={styles.container}>
        <header className={styles.sectionHeader}><h2>{t.review.dataTitle}</h2><p>{t.review.sourceNote}</p></header>
        <div className={styles.dataGrid}>
          <article className={styles.infoCard}><h3>{t.review.jobsTitle}</h3><p>{t.review.jobsText}</p><a href="https://huggingface.co/datasets/lukebarousse/data_jobs" target="_blank" rel="noopener noreferrer">Data Jobs · Hugging Face ↗</a></article>
          <article className={styles.infoCard}><h3>{t.review.profileTitle}</h3><p>{t.review.profileText}</p><a href="https://www.kaggle.com/datasets/hafsaatm/career-path-recommendation" target="_blank" rel="noopener noreferrer">Career Path Recommendation · Kaggle ↗</a></article>
          <article className={styles.infoCard}><h3>{t.hero.privacyTitle}</h3><p>{t.hero.privacyText}</p><a href="/privacy">{t.beta.fullPrivacy}</a></article>
        </div>
      </div>
    </section>

    <section className={styles.section} id="learning-roadmap">
      <div className={styles.container}>
        <header className={styles.sectionHeader}><h2>{t.review.roadmapTitle}</h2><p>{t.review.roadmapText}</p></header>
        <ol className={styles.roadmapFlow}>{t.review.roadmapSteps.map((step, index) => <li key={step}><span className={styles.stepNumber}>0{index + 1}</span><h3>{step}</h3></li>)}</ol>
        <p className={styles.note}>{t.review.roadmapNote}</p>
      </div>
    </section>

    <section className={styles.closing}>
      <div className={styles.finalCta}>
        <h2>{t.review.ctaTitle}</h2><p>{t.review.ctaText}</p>
        <div className={styles.ctaGroup}>
          <button className={styles.cta} onClick={onStart}>{t.review.start}</button>
          {demoButton('closing')}
          <a className={styles.secondaryCta} href="#career-tracks" onClick={scrollToSection}>{t.hero.tracksTitle}</a>
        </div>
        <p className={styles.note}>{t.experience.byokText}</p>
      </div>
    </section>
  </div></>
}
