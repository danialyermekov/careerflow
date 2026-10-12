import { useRef } from 'react'
import styles from '../Results.module.css'
import { formatMatchScore } from '../../utils/scoring'

export default function AllProfessionsPanel({ professions, selected, ranks, topName, profLabel, t,
  sortOptions, sortBy, onSort, onSelect, onRoadmap, scoring, comparisons, missingSkills, partialSignals }) {
  const detailHeading = useRef(null)
  const labels = { profile_match: t.results.classification, skill_match: t.results.skillMatch, trend_score: t.results.trend, market_share: t.results.marketShare }
  const showDetails = () => {
    detailHeading.current?.focus({ preventScroll: true })
    detailHeading.current?.scrollIntoView({ block: 'start' })
  }
  return <section className={styles.allPanel} aria-label={t.results.tabs.all}>
    <div data-tour-slot="comparison" />
    <header className={styles.careerHeading}>
      <h2>{t.review.rankingTitle}</h2><p>{t.review.rankingIntro}</p>
      <span>{t.review.trackCount(professions.length)}</span>
    </header>
    <div className={styles.careerToolbar}>
      <div className={styles.careerSort} role="group" aria-label={t.results.sortBy}>
        <span>{t.results.sortBy}</span>
        {sortOptions.map(({ key, label }) => <button key={key} type="button" data-sort={key}
          aria-pressed={sortBy === key} onClick={() => onSort(key)}>{label}</button>)}
      </div>
      <div className={styles.chartLegend}>
        {(selected?.breakdown || []).map(item => <span key={item.key} data-signal={item.key}><i />{labels[item.key]} ({item.weight == null ? '—' : `${Math.round(item.weight * 100)}%`})</span>)}
      </div>
    </div>
    {!professions.length ? <p className={styles.methodNote}>{t.review.rankingEmpty}</p> : <>
      <div className={styles.careerMasterDetail}>
        <ol className={styles.careerRanking} aria-label={t.review.rankingTitle}>
          {professions.map(p => <li key={p.name} className={`${styles.careerRow} ${selected?.name === p.name ? styles.careerRowSelected : ''}`}>
            <button type="button" className={styles.careerSelect} data-profession={p.name}
              aria-pressed={selected?.name === p.name} aria-controls="selected-career-details" onClick={() => onSelect(p.name)}>
              <span className={styles.careerRowHeading}>
                <span className={styles.careerRank}>#{ranks[p.name]}</span>
                <span className={styles.careerName}>{profLabel(p.name)} {p.name === topName && <span className={styles.careerTopBadge}>{t.results.bestMatch}</span>}</span>
                <strong className={styles.careerScore}>{p.final_score == null ? '—' : formatMatchScore(p.final_score)}</strong>
              </span>
              <span className={styles.careerTrack} aria-hidden="true">
                <span className={styles.careerScoreFill} style={{ width: `${Math.max(0, Math.min(100, (p.final_score || 0) * 100))}%` }} />
                <span className={styles.careerSignalSegments}>{p.breakdown.filter(item => item.contribution != null).map(item => <span key={item.key} data-signal={item.key} style={{ width: `${item.contribution}%` }} />)}</span>
              </span>
              <span className={styles.careerRowMeta}>
                <span>{p.breakdown.every(item => item.contribution != null) ? `${p.breakdown.map(item => item.contribution.toFixed(2)).join(' + ')} ${t.review.contribution}` : t.review.missingWeights}</span>
                <span>{p.skillCoverage ? t.review.coverageCount(p.skillCoverage.known.length, p.skillCoverage.total) : t.review.gapUnavailable}</span>
              </span>
            </button>
            {selected?.name === p.name && <button type="button" className={styles.rankingDetailLink} onClick={showDetails}>{t.review.viewCareerDetails}</button>}
          </li>)}
        </ol>
        {selected && <section className={styles.selectedCareer} id="selected-career-details" aria-label={t.results.selectedProfession}>
          <header className={styles.careerDetailHeading}>
            <div><h3 ref={detailHeading} tabIndex={-1} aria-live="polite">{profLabel(selected.name)}</h3>
              <p className={styles.careerDetailRank}>#{ranks[selected.name]} · {selected.name === topName ? t.results.bestMatch : t.results.selectedProfession}</p></div>
            <div><strong className={styles.careerScore}>{selected.final_score == null ? '—' : formatMatchScore(selected.final_score)}</strong><p>{t.review.scoreTitle}</p></div>
          </header>
          <p className={styles.methodNote}>{t.review.scoreNote}</p>
          {partialSignals && <p className={styles.methodNote}>{t.review.partialSignals}</p>}
          {scoring}
          <section className={styles.careerCoverage} aria-label={t.review.roadmapCoverage}>
            <h4>{t.review.roadmapCoverage}</h4>
            <p>{selected.skillCoverage ? t.review.coverageCount(selected.skillCoverage.known.length, selected.skillCoverage.total) : t.review.gapUnavailable}</p>
            {selected.skillCoverage && <div className={`${styles.gapChips} ${styles.careerKnownSkills}`}>{selected.skillCoverage.known.map(({ cat, skill }) => <span key={`${cat}-${skill}`}>{skill.charAt(0).toUpperCase() + skill.slice(1)}</span>)}</div>}
            <h4>{t.review.missingSkills}</h4>
            <div className={styles.careerMissingSkills}>{missingSkills == null ? <p>{t.review.gapUnavailable}</p> : !missingSkills.length ? <p>{t.review.gapEmpty}</p>
              : <div className={styles.gapChips}>{missingSkills.map(({ cat, skill }) => <span key={`${cat}-${skill}`}>{skill.charAt(0).toUpperCase() + skill.slice(1)}</span>)}</div>}</div>
            <p className={styles.methodNote}>{t.review.coverageNote}</p>
          </section>
          <button type="button" className={styles.primaryAction} onClick={onRoadmap}>{t.results.viewFullRoadmap}</button>
          <p className={styles.methodNote}>{t.review.marketNote}</p>
        </section>}
      </div>
      <details className={styles.careerComparisons}><summary>{t.review.additionalComparisons}</summary>{comparisons}</details>
    </>}
  </section>
}
