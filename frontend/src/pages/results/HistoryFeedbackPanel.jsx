import { formatMatchScore } from '../../utils/scoring'
import { isDemoSession } from '../../utils/demoProfile'
import styles from '../Results.module.css'

function HistoryRecord({ record, current, selectedProfession, t, lang, profLabel, onOpen }) {
  const result = record.results
  const name = record.top_profession || result.top_profession || record.selectedProfession
  const viewed = selectedProfession || record.selectedProfession
  const profile = result._formData
  const score = result.final_scores?.[name]
  const date = record.createdAt && new Date(record.createdAt)
  const hasDate = date && !Number.isNaN(date.getTime())
  return <article className={`${styles.historyRecord} ${current ? styles.historyCurrent : ''}`}>
    <div className={styles.historyRecordMeta}>
      <strong>{current ? t.review.currentRecommendation : t.review.previousRecommendation}</strong>
      {(result._isDemo || isDemoSession(result.session_id)) && <span>{t.review.demoLabel}</span>}
      {result.session_id && <span>#{result.session_id.slice(0, 8)}</span>}
    </div>
    <div className={styles.historyRecordHeading}>
      <div><h3>{profLabel(name)}</h3>
        {hasDate && <time dateTime={date.toISOString()}>{date.toLocaleString(lang === 'kk' ? 'kk-KZ' : lang === 'ru' ? 'ru-RU' : 'en-GB', { dateStyle: 'medium', timeStyle: 'medium' })}</time>}
      </div>
      <div className={styles.historyRecordScore}><span>{t.review.scoreTitle}</span><strong>{typeof score === 'number' ? formatMatchScore(score) : '—'}</strong></div>
    </div>
    {viewed && viewed !== name && <p>{t.review.viewingAlternative(profLabel(viewed))}</p>}
    {profile && <div className={styles.historyProfile}>
      {Array.isArray(profile.skills) && <span>{profile.skills.length} {t.review.historySkills}</span>}
      {profile.field_of_study && <span>{t.form.fields[profile.field_of_study] || profile.field_of_study}</span>}
      {profile.gpa != null && <span>GPA {profile.gpa}</span>}
    </div>}
    <button type="button" className={current ? styles.primaryAction : styles.secondaryAction} onClick={onOpen}>{current ? t.review.viewResults : t.review.inspectRun}</button>
  </article>
}

export default function HistoryFeedbackPanel({ results, profession, history, user, t, lang, profLabel, onOpen, onCurrent, onClear }) {
  const saved = history.find(item => results.session_id && item.results?.session_id === results.session_id)
  const previous = history.filter(item => item.results && item !== saved)
  return <section className={styles.historyPanel} aria-labelledby="history-title">
    <header><h2 id="history-title">{t.results.historyTitle}</h2><p>{t.review.historyPrivacy}</p></header>
    <HistoryRecord record={{ results, createdAt: saved?.createdAt || results.created_at }} current selectedProfession={profession} t={t} lang={lang} profLabel={profLabel} onOpen={onCurrent} />
    <h3 className={styles.historyPreviousTitle}>{t.review.previousRecommendation}</h3>
    {previous.length ? previous.map(item => <HistoryRecord key={item.id} record={item} t={t} lang={lang} profLabel={profLabel} onOpen={() => onOpen(item)} />) : <p>{t.results.noHistory}</p>}
    {user && history.length > 0 && <button type="button" className={styles.historyClear} onClick={onClear}>{t.results.clearHistory}</button>}
  </section>
}
