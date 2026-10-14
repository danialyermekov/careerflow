import styles from '../Results.module.css'

export default function ResultsNavigation({ tabs, activeTab, onTabChange, label }) {
  const handleKey = (event, index) => {
    let next
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = tabs.length - 1
    if (next == null) return
    event.preventDefault()
    onTabChange(tabs[next].key)
    event.currentTarget.parentElement.children[next].focus()
  }
  return <div className={styles.tabs} role="tablist" aria-label={label}>
    {tabs.map(({ key, label }, index) => <button key={key} type="button" role="tab"
      id={`results-tab-${key}`} aria-controls="results-panel" aria-selected={activeTab === key}
      tabIndex={activeTab === key ? 0 : -1}
      className={`${styles.tab} ${activeTab === key ? styles.tabActive : ''}`}
      onKeyDown={event => handleKey(event, index)} onClick={() => onTabChange(key)}>{label}</button>)}
  </div>
}
