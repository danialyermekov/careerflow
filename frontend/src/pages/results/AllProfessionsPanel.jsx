import styles from '../Results.module.css'
import { formatMatchScore } from '../../utils/scoring'

export default function AllProfessionsPanel({ professions, selected, ranks, topName, profLabel, t,
  sortOptions, sortBy, onSort, onSelect, onOpenDetails, marketTrackCount }) {
  const criterion = { skill: 'skill_match', profile: 'profile_match', trend: 'trend_score', market: 'market_share' }[sortBy]
  const sortLabel = sortOptions.find(option => option.key === sortBy)?.label
  const secondary = profession => {
    if (!criterion) return profession.skillCoverage
      ? t.review.coverageCount(profession.skillCoverage.known.length, profession.skillCoverage.total) : t.review.gapUnavailable
    const signal = profession.breakdown.find(item => item.key === criterion)
    if (!signal.available) return `${sortLabel}: —`
    return sortBy === 'market' ? t.review.marketShareValue(signal.raw, marketTrackCount)
      : `${sortLabel} · ${t.review.index}: ${(signal.value * 100).toFixed(1)} / 100`
  }
  return <section className={styles.allPanel} aria-label={t.results.tabs.all}>
    <div data-tour-slot="comparison" />
    <header className={styles.careerHeading}>
      <h2>{t.review.rankingTitle}</h2><p>{t.review.rankingIntro}</p>
    </header>
    <div className={styles.careerToolbar}>
      <div className={styles.careerSort} role="group" aria-label={t.results.sortBy}>
        <span>{t.results.sortBy}</span>
        {sortOptions.map(({ key, label }) => <button key={key} type="button" data-sort={key}
          aria-pressed={sortBy === key} onClick={() => onSort(key)}>{label}</button>)}
      </div>
      <span>{t.results.sortedBy(sortLabel)}{sortBy !== 'score' && ` · ${t.review.rankNote}`}</span>
      {selected && <button type="button" className={styles.primaryAction} onClick={onOpenDetails}>{t.review.openCareer(profLabel(selected.name))}</button>}
    </div>
    {!professions.length ? <p className={styles.methodNote}>{t.review.rankingEmpty}</p> :
      <ol className={styles.careerRanking} aria-label={t.review.rankingTitle}>
        {professions.map(profession => <li key={profession.name} className={`${styles.careerRow} ${selected?.name === profession.name ? styles.careerRowSelected : ''}`}>
          <button type="button" className={styles.careerSelect} data-profession={profession.name}
            aria-pressed={selected?.name === profession.name} onClick={() => onSelect(profession.name)}>
            <span className={styles.careerRowHeading}>
              <span className={styles.careerRank} aria-label={`${t.results.overallRank} ${ranks[profession.name]}`}>#{ranks[profession.name]}</span>
              <span className={styles.careerName}>{profLabel(profession.name)} {profession.name === topName && <span className={styles.careerTopBadge}>{t.results.bestMatch}</span>}</span>
              <strong className={styles.careerScore}>{profession.final_score == null ? '—' : formatMatchScore(profession.final_score)}</strong>
            </span>
            <span className={styles.careerRowMeta}>{secondary(profession)}</span>
          </button>
        </li>)}
      </ol>}
  </section>
}
