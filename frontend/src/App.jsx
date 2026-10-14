import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AppProvider, useApp } from './context/AppContext'
import Navbar from './components/Navbar'
import Hero from './pages/Hero'
import Form from './pages/Form'
import { getRecommendation, getRecommendationState } from './utils/api'
import { DEMO_PROFILE, rememberDemoSession, isDemoSession } from './utils/demoProfile'
import './index.css'
import './beta.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import PublicPage from './pages/PublicPage'
import Account, { Login } from './pages/Account'
import Footer from './components/Footer'
import About from './pages/About'
import Changelog from './pages/Changelog'
import ProductRoadmap from './pages/ProductRoadmap'
import FeedbackPage from './pages/FeedbackPage'
import { updatePageMetadata } from './utils/seo'

const publicPages = ['about', 'contact', 'privacy', 'terms', 'disclaimer', 'feedback', 'changelog', 'roadmap']
const Results = lazy(() => import('./pages/Results'))

function AppInner() {
  const { t, lang } = useApp()
  const { loading: authLoading } = useAuth()
  const [page, setPage] = useState(() => {
    const hash = window.location.hash.slice(1)
    const path = window.location.pathname.replace(/^\/|\/$/g, '')
    if (publicPages.includes(hash)) return hash
    if (hash.startsWith('results/')) return 'results'
    return !['profile', 'login', 'account'].includes(hash) && !hash.startsWith('results/') && publicPages.includes(path) ? path : 'hero'
  })
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [demo, setDemo] = useState(false)
  const [profileDraft, setProfileDraft] = useState(null)
  const [advisorRequested, setAdvisorRequested] = useState(false)
  const pendingRequest = useRef(null)
  // Changing language updates request errors without restarting routing.
  const requestText = useRef(t)
  requestText.current = t
  const reducedMotion = useReducedMotion()
  const cancelPendingRequest = () => { pendingRequest.current = null; setLoading(false) }
  useEffect(() => () => { pendingRequest.current = null }, [])

  useEffect(() => {
    let cancelled = false
    const route = async () => {
      cancelPendingRequest()
      const hash = window.location.hash
      if (authLoading) return
      const publicPage = hash.slice(1)
      if ([...publicPages, 'login', 'account'].includes(publicPage)) { setPage(publicPage); return }
      if (hash === '#profile') { setPage('form'); return }
      const sessionId = hash.match(/^#results\/([a-zA-Z0-9-]+)$/)?.[1]
      if (!sessionId) {
        const pathPage = window.location.pathname.replace(/^\/|\/$/g, '')
        setPage(publicPages.includes(pathPage) ? pathPage : 'hero'); return
      }
      if (results?.session_id === sessionId) { setPage('results'); return }
      const request = {}
      pendingRequest.current = request
      setLoading(true)
      try {
        const state = await getRecommendationState(sessionId)
        if (!cancelled && pendingRequest.current === request && window.location.hash === hash) {
          setResults({ ...state.results, _isDemo: isDemoSession(sessionId) })
          setPage('results')
        }
      } catch {
        if (!cancelled && pendingRequest.current === request && window.location.hash === hash) { setError(requestText.current.errors.api); setPage('form') }
      } finally {
        if (!cancelled && pendingRequest.current === request) cancelPendingRequest()
      }
    }
    route()
    window.addEventListener('hashchange', route)
    window.addEventListener('popstate', route)
    return () => { cancelled = true; window.removeEventListener('hashchange', route); window.removeEventListener('popstate', route) }
  }, [results, authLoading])

  useEffect(() => {
    if (page !== 'results' || !results) updatePageMetadata(page, t, lang)
  }, [page, results, t, lang])

  useEffect(() => { window.scrollTo(0, 0) }, [page])

  const handleStart = () => { cancelPendingRequest(); setProfileDraft(null); setDemo(false); setError(''); window.history.pushState({}, '', '/#profile'); setPage('form') }
  const handleEditProfile = profile => { handleStart(); setProfileDraft(profile) }
  const handleDemo = () => { if (pendingRequest.current) return; setDemo(true); handleSubmit({ ...DEMO_PROFILE, lang }, true, true) }
  const handleBack = () => { cancelPendingRequest(); setError(''); window.history.pushState({}, '', '/'); setPage('hero') }
  const showResult = data => {
    cancelPendingRequest()
    setResults(data)
    window.history.pushState({}, '', `/#results/${data.session_id}`)
    setPage('results')
  }
  const exploreAdvisor = () => {
    setAdvisorRequested(true)
    if (results) showResult(results)
    else handleStart()
  }

  const handleSubmit = async (profile, isDemo = false, guided = false) => {
    if (pendingRequest.current) return
    const request = {}
    const routeUrl = window.location.href
    pendingRequest.current = request
    setLoading(true)
    setError('')
    try {
      const data = await getRecommendation(profile, { demo: isDemo })
      if (pendingRequest.current !== request || window.location.href !== routeUrl) return
      if (isDemo) rememberDemoSession(data.session_id)
      showResult({ ...data, _formData: profile, _isDemo: isDemo, _guided: guided })
    } catch (e) {
      if (pendingRequest.current === request && window.location.href === routeUrl) {
        const text = requestText.current
        setError(isDemo ? e.status === 429 ? text.experience.demoBusy : text.experience.demoFailed : text.errors.api)
      }
    } finally {
      if (pendingRequest.current === request) cancelPendingRequest()
    }
  }

  const pageVariants = reducedMotion ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } } : {
    initial: { opacity: 0, scale: 0.975, y: 18, filter: 'blur(10px)' },
    animate: { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, scale: 1.025, y: -18, filter: 'blur(10px)' },
  }

  return (
    <div className="appShell">

      <Navbar onLogoClick={handleBack} />
      {(authLoading || (loading && page !== 'hero' && page !== 'form')) && <p className="routeLoading" role="status">{t.beta.loading}</p>}
      {['contact', 'privacy', 'terms', 'disclaimer'].includes(page) && <PublicPage page={page} />}
      {page === 'about' && <About onExploreAdvisor={exploreAdvisor} />}
      {page === 'feedback' && <FeedbackPage />}
      {page === 'changelog' && <Changelog />}
      {page === 'roadmap' && <ProductRoadmap />}
      {page === 'login' && <Login />}
      {page === 'account' && <Account />}

      <AnimatePresence mode="wait">
        {page === 'hero' && (
          <motion.main
            key="hero"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            <Hero onStart={handleStart} onDemo={handleDemo} demoLoading={loading} error={error} />
          </motion.main>
        )}

        {page === 'form' && (
          <motion.main
            key="form"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            {error && (
              <div className="appError">
                {error}
              </div>
            )}
            {advisorRequested && <p className="advisorFlowNote" role="status">{t.product.aiNext}</p>}
            <Form onSubmit={handleSubmit} loading={loading} initialDemo={demo} initialProfile={profileDraft} />
          </motion.main>
        )}

        {page === 'results' && results && (
          <motion.main
            key="results"
            variants={{ initial: { opacity: reducedMotion ? 1 : 0 }, animate: { opacity: 1 }, exit: { opacity: 1 } }}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
          >
            <Suspense fallback={<p className="routeLoading" role="status" aria-busy="true">{t.beta.loading}</p>}>
              <Results results={results} onBack={handleBack} onRetry={handleStart} onEditProfile={handleEditProfile} onHistorySelect={showResult} openAdvisor={advisorRequested} />
            </Suspense>
          </motion.main>
        )}
      </AnimatePresence>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AuthProvider><AuthenticatedApp /></AuthProvider>
    </AppProvider>
  )
}

function AuthenticatedApp() {
  const { user } = useAuth()
  return <AppInner key={user?.id || 'guest'} />
}
