import { useApp } from '../context/AppContext'
export default function PublicPage({ page }) {
  const { t } = useApp()
  const text = t.beta
  return <main className="betaPage">
    <article className={`betaCard ${page === 'contact' ? '' : 'legalContent'}`}>
      <h1>{text[page]}</h1>
      {(page === 'contact' ? [text.contactText] : text[`${page}Text`]).map((p, index) => <section key={p} className="legalSection">{page !== 'contact' && <h2>{t.beta[`${page}Headings`][index]}</h2>}<p>{(page === 'privacy' && index === 2 ? t.product.feedbackPrivacy : p).split('contact@careerflow.live').map((part, i) => <span key={i}>{i > 0 && <a href="mailto:contact@careerflow.live">contact@careerflow.live</a>}{part}</span>)}</p></section>)}
      {page === 'privacy' && <p>{t.experience.privacy}</p>}
      {page === 'terms' && <p>{t.experience.contact} <a href="mailto:contact@careerflow.live">contact@careerflow.live</a></p>}
      {page === 'contact' && <>
        <p><a href="https://github.com/danialyermekov/Career-Recommendation-System" target="_blank" rel="noopener noreferrer">GitHub</a></p>
      </>}
      {page === 'contact' && <>
        <p><a href="mailto:contact@careerflow.live">contact@careerflow.live</a></p>
        <p><a href="https://www.linkedin.com/in/danial-yermekov/" target="_blank" rel="noopener noreferrer">LinkedIn · Danial Yermekov</a></p>
        <p><a href="https://github.com/danialyermekov/Career-Recommendation-System/issues" target="_blank" rel="noopener noreferrer">{text.issues}</a></p>
        <a href="/feedback">{t.product.feedback}</a>
      </>}
    </article>
  </main>
}
