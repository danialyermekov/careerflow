import { createContext, useContext, useState, useEffect } from 'react'
import { translations } from '../i18n'
import { getLLMSettings, LLM_SETTINGS_EVENT } from '../utils/llmSettings'

const AppContext = createContext()
const LANGS = ['ru', 'en', 'kk']

const safeGet = (key, fallback) => {
  try { return localStorage.getItem(key) || fallback }
  catch { return fallback }
}
const safeSave = (key, val) => {
  try { localStorage.setItem(key, val) } catch {}
}

export function AppProvider({ children, initialLanguage }) {
  // Only public metadata enters React context; the secret stays in module memory.
  const [llmProvider, setLLMProvider] = useState(() => getLLMSettings()?.provider || null)
  useEffect(() => {
    const refresh = () => setLLMProvider(getLLMSettings()?.provider || null)
    window.addEventListener(LLM_SETTINGS_EVENT, refresh)
    return () => {
      window.removeEventListener(LLM_SETTINGS_EVENT, refresh)
    }
  }, [])
  const [theme, setTheme] = useState(() => safeGet('theme', 'light') === 'dark' ? 'dark' : 'light')
  const [lang,  setLang]  = useState(() => {
    if (initialLanguage) return initialLanguage
    const stored = safeGet('lang', 'en')
    return translations[stored] ? stored : 'en'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#07090d' : '#FBFBFA')
    safeSave('theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang)
    safeSave('lang', lang)
  }, [lang])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  const toggleLang  = () => setLang(l => {
    const idx = LANGS.indexOf(l)
    return LANGS[(idx + 1) % LANGS.length] || 'ru'
  })
  const setLanguage = nextLang => {
    if (translations[nextLang]) setLang(nextLang)
  }

  const t = translations[lang] || translations.ru

  return (
    <AppContext.Provider value={{ theme, toggleTheme, lang, toggleLang, setLanguage, t, llmProvider }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
