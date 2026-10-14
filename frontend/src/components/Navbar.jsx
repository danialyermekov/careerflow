import { useId, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import styles from './Navbar.module.css'
import { useAuth } from '../context/AuthContext'
import BrandLogo from './BrandLogo'

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5"/>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
)

const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

export default function Navbar({ onLogoClick }) {
  const { theme, toggleTheme, lang, setLanguage, t } = useApp()
  const { user, loading } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsButton = useRef(null)
  const settingsId = useId()
  const languages = [
    { key: 'en', label: 'EN' },
    { key: 'ru', label: 'RU' },
    { key: 'kk', label: 'KZ' },
  ]

  return (
    <nav className={styles.nav} aria-label={t.nav.title} onKeyDown={event => {
      if (event.key === 'Escape' && settingsOpen) {
        event.preventDefault()
        setSettingsOpen(false)
        settingsButton.current?.focus()
      }
    }} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setSettingsOpen(false)
    }}>
      <div className={styles.inner}>
        <a className={styles.logo} href="/" onClick={event => { if (onLogoClick) { event.preventDefault(); onLogoClick() } }} aria-label={t.nav.title}>
          <BrandLogo />
        </a>
        <div className={styles.actions}>
          <a className={styles.accountLink} href={user ? '/#account' : '/#login'} onClick={() => {
            if (!user && !['#login', '#account'].includes(window.location.hash)) sessionStorage.setItem('careerflow-auth-return', window.location.hash || window.location.pathname)
          }}>{loading ? t.beta.loading : user ? t.beta.account : t.beta.login}</a>
          <button type="button" ref={settingsButton} className={`${styles.iconBtn} ${styles.settingsBtn}`}
            aria-label={t.nav.settings} aria-expanded={settingsOpen} aria-controls={settingsId}
            onClick={() => setSettingsOpen(open => !open)}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className={styles.preferences} id={settingsId} data-open={settingsOpen}>
          <a className={styles.feedbackLink} href="/feedback">{t.product.feedbackNav}</a>
          <button className={styles.iconBtn} onClick={toggleTheme} title={t.nav.themeToggle || t.nav.theme} aria-label={t.nav.themeToggle || t.nav.theme} aria-pressed={theme === 'dark'}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <div className={styles.langGroup} role="group" aria-label={t.nav.language || 'Language'}>
            {languages.map(item => (
              <button
                key={item.key}
                className={`${styles.langBtn} ${lang === item.key ? styles.langBtnActive : ''}`}
                onClick={() => setLanguage(item.key)}
                aria-pressed={lang === item.key}
              >
                {item.label}
              </button>
            ))}
          </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
