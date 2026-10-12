import styles from './AdvisorComposer.module.css'

// State, send validation and provider capabilities stay with each caller.
export default function AdvisorComposer({ className = '', sendClassName = '', textareaRef, textareaProps, onSend,
  sendDisabled, sendLabel, consent, toolbar, status, privacy }) {
  return <form data-advisor-composer className={`${styles.composer} ${className}`}
    onSubmit={event => { event.preventDefault(); onSend() }}>
    {consent}
    {toolbar}
    {status}
    <div className={styles.inputRow}>
      <textarea {...textareaProps} ref={textareaRef} rows={2}
        onChange={event => {
          textareaProps.onChange(event)
          event.currentTarget.style.height = 'auto'
          event.currentTarget.style.height = Math.min(event.currentTarget.scrollHeight, 160) + 'px'
        }}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onSend() }
        }} />
      <button type="submit" className={`${styles.send} ${sendClassName}`} aria-label={sendLabel} disabled={sendDisabled}>{sendLabel}</button>
    </div>
    {privacy}
  </form>
}
