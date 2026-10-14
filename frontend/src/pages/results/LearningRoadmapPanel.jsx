import { useState, useRef, useLayoutEffect } from 'react'
import styles from '../Results.module.css'

function ReorderControls({ name, previous, next, onMove, t }) {
  const controls = useRef(null)
  const movedButton = useRef(null)
  useLayoutEffect(() => {
    const button = movedButton.current
    if (button?.disabled && (document.activeElement === button || document.activeElement === document.body)) controls.current.querySelector('button:not(:disabled)')?.focus()
    movedButton.current = null
  })
  const move = (e, target) => {
    if (document.activeElement === e.currentTarget) movedButton.current = e.currentTarget
    onMove(target)
  }
  return <div ref={controls} className={styles.roadmapReorder}>
    <span className={styles.roadmapDragHandle} data-drag-handle title={t.results.dragHint} aria-hidden="true">⠿</span>
    <button type="button" disabled={!previous} aria-label={t.review.moveUp(name)} title={t.review.moveUp(name)} onClick={e => move(e, previous)}>↑</button>
    <button type="button" disabled={!next} aria-label={t.review.moveDown(name)} title={t.review.moveDown(name)} onClick={e => move(e, next)}>↓</button>
  </div>
}

export default function LearningRoadmapPanel({ profession, entries, total, completed, doneSkills, openCats, dragItem,
  onDragChange, onMoveCategory, onMoveSkill, onToggleCategory, onToggleSkill, catLabel, t, formatSkill, fallbackNotice, dependencies, filters, renderCourses, advisor }) {
  const [dropTarget, setDropTarget] = useState(null)
  const percentage = total ? Math.round(completed / total * 100) : 0
  const itemKey = item => `${item.type}::${item.cat}::${item.skill || ''}`
  const clearDrag = () => { onDragChange(null); setDropTarget(null) }
  const dragProps = item => ({
    draggable: true,
    onDragStart: e => {
      e.stopPropagation()
      if (e.target.closest('button, input, a, select')) { e.preventDefault(); return }
      if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', itemKey(item)) }
      onDragChange(item)
    },
    onDragOver: e => {
      e.stopPropagation()
      if (dragItem?.type !== item.type || (item.type === 'skill' && dragItem.cat !== item.cat)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
      setDropTarget(itemKey(item))
    },
    onDrop: e => {
      e.preventDefault(); e.stopPropagation()
      if (item.type === 'category' && dragItem?.type === 'category') onMoveCategory(dragItem.cat, item.cat)
      if (item.type === 'skill' && dragItem?.type === 'skill' && dragItem.cat === item.cat) onMoveSkill(item.cat, dragItem.skill, item.skill)
      clearDrag()
    },
    onDragEnd: clearDrag,
  })
  const dragClass = item => `${dragItem && itemKey(dragItem) === itemKey(item) ? styles.roadmapDragging : ''} ${dropTarget === itemKey(item) ? styles.roadmapDropTarget : ''}`

  return <section className={styles.learningPanel} aria-labelledby="learning-roadmap-title">
    <div data-tour-slot="roadmap" />
    <header className={styles.roadmapOverview}>
      <div><h2 id="learning-roadmap-title" className={styles.roadmapHint}>{t.review.learningTitle(profession)}</h2><p>{t.review.roadmapMethod}</p></div>
    </header>
    {fallbackNotice && <p className={styles.methodNote}>{fallbackNotice}</p>}
    <section className={styles.roadmapProgressPanel} aria-label={t.review.manualProgress}>
      <div className={styles.roadmapProgressHeading}><strong>{t.results.roadmapProgress(completed, total)} · {t.review.stepsRemaining(total - completed)}</strong><span>{percentage}%</span></div>
      <div className={styles.roadmapProgressTrack} role="progressbar" aria-label={t.review.manualProgress} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percentage} aria-valuetext={t.results.roadmapProgress(completed, total)}>
        <i style={{ width: `${percentage}%` }} />
      </div>
      <p>{t.review.manualProgress}</p>
      {dependencies}
    </section>
    <p className={styles.dragHint}>{t.results.dragHint} {t.review.keyboardReorder}</p>
    {filters}
    {!total && <p className={styles.courseEmptyState}>{t.review.learningEmpty}</p>}
    <div className={styles.roadmap}>
      {entries.map(([cat, skills], categoryIndex) => {
        const isOpen = openCats.has(cat)
        const doneCount = skills.filter(item => doneSkills.has(`${cat}::${item.skill}`)).length
        const category = { type: 'category', cat }
        const contentId = `learning-category-${encodeURIComponent(cat)}`
        return <section key={cat} data-category={cat} className={`${styles.roadmapCat} ${dragClass(category)}`} {...dragProps(category)}>
          <div className={styles.roadmapCategoryHeader}>
            <ReorderControls name={catLabel(cat)} previous={entries[categoryIndex - 1]?.[0]} next={entries[categoryIndex + 1]?.[0]} onMove={target => onMoveCategory(cat, target)} t={t} />
            <h3><button type="button" className={styles.catHeader} onClick={() => onToggleCategory(cat)} aria-expanded={isOpen} aria-controls={contentId}>
              <span className={styles.catName}>{catLabel(cat)}</span>
              <span className={styles.catCount}>{t.review.stepsRemaining(skills.length - doneCount)} · {doneCount}/{skills.length}</span>
              <svg className={styles.disclosureChevron} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </button></h3>
          </div>
          {isOpen && <div id={contentId} className={styles.skillList}>
            {skills.map((item, index) => {
              const isDone = doneSkills.has(`${cat}::${item.skill}`)
              const skillDrag = { type: 'skill', cat, skill: item.skill }
              const sameStatus = neighbor => neighbor && doneSkills.has(`${cat}::${neighbor.skill}`) === isDone ? neighbor.skill : null
              return <div key={item.skill} data-skill={item.skill} className={`${styles.skillItemWrap} ${dragClass(skillDrag)}`} {...dragProps(skillDrag)}>
                {isDone && (index === 0 || !doneSkills.has(`${cat}::${skills[index - 1].skill}`)) && <div className={styles.completedDivider}>{t.results.completedSteps}</div>}
                <div className={`${styles.skillItem} ${isDone ? styles.roadmapSkillDone : ''}`}>
                  <div className={styles.skillTopRow}>
                    <ReorderControls name={formatSkill(item.skill)} previous={sameStatus(skills[index - 1])} next={sameStatus(skills[index + 1])} onMove={target => onMoveSkill(cat, item.skill, target)} t={t} />
                    <label className={styles.skillCompletion}><input type="checkbox" aria-label={formatSkill(item.skill)} checked={isDone} onChange={() => onToggleSkill(cat, item.skill)} /><span className={styles.skillName}>{formatSkill(item.skill)}</span></label>
                    {isDone && <span className={styles.roadmapStatus}>{t.review.selfMarked}</span>}
                  </div>
                  {!isDone && renderCourses(item, cat)}
                </div>
              </div>
            })}
          </div>}
        </section>
      })}
    </div>
    <p className={styles.methodNote}>{t.review.roadmapNote}</p>
    {advisor}
  </section>
}
