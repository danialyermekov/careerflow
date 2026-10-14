import { useApp } from '../context/AppContext'
import styles from '../pages/Hero.module.css'
import BrandLogo from './BrandLogo'

export default function Footer() {
  const { t } = useApp()
  return <div className="siteFooter">
    <footer className={styles.footer}>
      <div className={styles.footerBrand}><a href="/" aria-label="CareerFlow"><BrandLogo /></a><p>{t.product.footerDescription}</p><span>© 2026 CareerFlow</span></div>
      <nav aria-label={t.footer.links}>
        <section><h2>{t.product.footerProduct}</h2><ul>
          <li><a href="/about">{t.beta.about}</a></li>
          <li><a href="/changelog">{t.product.changelog}</a></li>
          <li><a href="/roadmap">{t.product.roadmap}</a></li>
        </ul></section>
        <section><h2>{t.product.footerResources}</h2><ul>
          <li><a href="https://github.com/danialyermekov/careerflow" target="_blank" rel="noopener noreferrer">GitHub</a></li>
          <li><a href="/contact">{t.beta.contact}</a></li>
          <li><a href="/privacy">{t.footer.privacy}</a></li>
          <li><a href="/terms">{t.beta.terms}</a></li>
          <li><a href="/disclaimer">{t.beta.disclaimer}</a></li>
        </ul></section>
      </nav>
    </footer>
  </div>
}
