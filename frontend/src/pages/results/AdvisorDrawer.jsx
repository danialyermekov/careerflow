import { useEffect, useRef } from 'react'
import styles from '../Results.module.css'

export default function AdvisorDrawer({ open, onClose, title, closeLabel, provider, context, setupOnly, width, onResize, onWidthChange, widthLabel, children }) {
  const dialog = useRef(null)
  const visited = useRef(false)
  if (open) visited.current = true
  useEffect(() => {
    if (!open) return
    const node = dialog.current
    const trigger = document.activeElement
    const overflow = document.body.style.overflow
    if (node.showModal) node.showModal()
    else node.setAttribute('open', '')
    document.body.style.overflow = 'hidden'
    const close = node.querySelector('.' + styles.chatCloseBtn)
    close.focus()
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
      if (event.key !== 'Tab') return
      const controls = [...node.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex="0"]')]
        .filter(el => el.tabIndex !== -1 && !el.closest('[hidden]') && getComputedStyle(el).display !== 'none' && (!el.closest('details:not([open])') || el.tagName === 'SUMMARY'))
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (node.close) node.close()
      else node.removeAttribute('open')
      document.body.style.overflow = overflow
      if (trigger?.isConnected) trigger.focus()
    }
  }, [open, onClose])

  return <dialog ref={dialog} className={styles.advisorModal} aria-modal="true" aria-labelledby="advisor-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <button type="button" className={styles.advisorBackdrop} tabIndex={-1} aria-label={closeLabel} onClick={onClose} />
    {visited.current && <aside className={styles.chatSidebar} data-setup-only={setupOnly || undefined} style={{ width }}>
      <div className={styles.chatHeader}>
        <div><h2 id="advisor-title" className={styles.chatTitle}>{title}</h2><p className={styles.advisorProvider}>{provider}</p></div>
        <button type="button" className={styles.chatCloseBtn} aria-label={closeLabel} title={closeLabel} onClick={onClose}>×</button>
      </div>
      <div className={styles.advisorContext}>{context}</div>
      <span className={styles.chatResizeHandle} role="separator" tabIndex={0} aria-label={widthLabel} aria-orientation="vertical" aria-valuemin={300} aria-valuemax={620} aria-valuenow={width} onMouseDown={onResize}
        onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); onWidthChange(Math.max(300, Math.min(620, width + (event.key === 'ArrowLeft' ? 20 : -20)))) } }} />
      {children}
    </aside>}
  </dialog>
}
