import styles from '../Results.module.css'
import { formatMatchScore } from '../../utils/scoring'

export default function BestMatchPanel({ profession, rank, isTop, name, t, score, scoring, visualization,
  skillGap, explanation, alternatives, profLabel, onSelect, onRoadmap, onCompare, viewMode, onViewMode,
  aiCtaInfo, onAdvisor, ranks }) {
  return <div className={styles.bestPanel}>
    <section className={styles.recommendationHero}>
      <div data-tour-slot="recommendation" />
      <div className={styles.heroGrid}>
        <div>
          <span className={styles.bestRank}>#{rank} {isTop ? t.results.bestMatch : t.results.selectedProfession}</span>
          <h2 className={styles.bestName}>{name}</h2>
          <p className={styles.summaryText}>{t.review.inspectIntro}</p>
          {profession.vacancies_per_week != null && <p className={styles.methodNote}>
            {profession.vacancies_per_week.toLocaleString()} {t.results.vacanciesWeek}
          </p>}
          <div className={styles.heroActions}>
            <button type="button" className={styles.primaryAction} onClick={onRoadmap}>{t.results.viewFullRoadmap}</button>
          </div>
        </div>
        <div className={styles.heroScore}><strong>{t.review.scoreTitle}</strong>{score}<p>{t.review.scoreNote}</p></div>
      </div>
      <div className={styles.aiRecommendationCta}>
        <div className={styles.aiRecommendationCtaText}>
          <span className={styles.aiRecommendationCtaSubtitle}>{aiCtaInfo.subtitle}</span>
        </div>
        <button type="button" className={styles.secondaryAction} aria-label={aiCtaInfo.buttonFull} onClick={onAdvisor}>{aiCtaInfo.buttonFull}</button>
      </div>
    </section>

    <div data-tour-slot="explanation">{scoring}</div>
    {explanation}

    <section aria-label={t.review.visualization}>
      <header className={styles.analysisHeading}>
        <h2>{t.review.visualization}</h2>
        <div className={styles.chartControls} role="group" aria-label={t.review.visualization}>
          {['bars', 'radar', 'gap'].map(mode => <button key={mode} type="button"
            aria-pressed={viewMode === mode} onClick={() => onViewMode(mode)}>{t.results.chartModes[mode]}</button>)}
        </div>
      </header>
      <div className={viewMode === 'gap' ? styles.analysisGrid : undefined}>
        <div className={styles.visualizationPanel}>
          {viewMode === 'bars' && <div className={styles.chartLegend}>
            {[['profile_match', t.results.classification], ['skill_match', t.results.skillMatch], ['trend_score', t.results.trend], ['market_share', t.results.marketShare]].map(([key, label]) => <span key={key} data-signal={key}><i />{label}</span>)}
          </div>}
          {visualization}
        </div>
        {viewMode === 'gap' && skillGap}
      </div>
    </section>
    <section className={styles.alternatives} aria-label={t.review.alternatives}>
      <header className={styles.analysisHeading}><h2>{t.review.alternatives}</h2>
        <button type="button" className={styles.secondaryAction} onClick={onCompare}>{t.results.compareAll}</button>
      </header>
      <div className={styles.alternativeGrid}>{alternatives.map(p => <button key={p.name} type="button" onClick={() => onSelect(p.name)}>
        <span className={styles.alternativeRank}>#{ranks[p.name]}</span>
        <span>{profLabel(p.name)}</span><strong>{formatMatchScore(p.final_score)}</strong>
        <span className={styles.alternativeTrack} aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, (p.final_score ?? 0) * 100))}%` }} /></span>
      </button>)}</div>
    </section>
  </div>
}
