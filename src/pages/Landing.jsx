import { Link } from 'react-router-dom'
import { QUESTIONS } from '../lib/questions'
import styles from './Landing.module.css'

const FEATURES = [
  {
    icon: 'ti-clipboard-list',
    title: 'Questões com correção por IA',
    desc: 'Responda questões reais do ENEM, FUVEST, UNICAMP e UNESP e receba uma explicação gerada por IA na hora, direto ao ponto.',
  },
  {
    icon: 'ti-clock-play',
    title: 'Simulado cronometrado',
    desc: 'Monte um simulado com tempo e número de questões à sua escolha e treine sob a mesma pressão do dia da prova.',
  },
  {
    icon: 'ti-refresh-dot',
    title: 'Revisão de erros',
    desc: 'Toda questão que você errou fica separada em um modo só de revisão, até você realmente dominar o assunto.',
  },
  {
    icon: 'ti-chart-bar',
    title: 'Acompanhamento de desempenho',
    desc: 'Veja sua taxa de acerto por área e por assunto, e descubra exatamente onde focar seus estudos.',
  },
]

const AREAS = [
  { nome: 'Matemática', icone: 'ti-math-symbols', cor: 'mat' },
  { nome: 'Ciências da Natureza', icone: 'ti-flask', cor: 'nat' },
  { nome: 'Ciências Humanas', icone: 'ti-books', cor: 'hum' },
  { nome: 'Linguagens', icone: 'ti-language', cor: 'lin' },
]

const PASSOS = [
  { numero: '1', titulo: 'Crie sua conta', desc: 'Cadastro rápido com e-mail e senha, sem burocracia.' },
  { numero: '2', titulo: 'Escolha seu modo de estudo', desc: 'Pratique por área, monte um simulado ou revise seus erros.' },
  { numero: '3', titulo: 'Evolua com a IA', desc: 'Entenda cada questão com explicações claras e acompanhe seu progresso.' },
]

export default function Landing() {
  const totalQuestoes = QUESTIONS.length

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <span className={styles.logoMark}>
              <i className="ti ti-school" aria-hidden="true"></i>
            </span>
            Estuda<span className={styles.logoAccent}>ENEM</span>
          </div>
          <div className={styles.navActions}>
            <Link to="/login" className={styles.navLogin}>Entrar</Link>
            <Link to="/login" className={styles.navCta}>Começar agora</Link>
          </div>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true"></div>
        <span className={styles.heroBadge}>
          <i className="ti ti-sparkles" aria-hidden="true"></i> Correção e explicação por IA em cada questão
        </span>
        <h1 className={styles.heroTitle}>
          Estude para o ENEM com <span>questões reais</span> e feedback inteligente
        </h1>
        <p className={styles.heroSub}>
          Pratique com questões de provas anteriores, monte simulados cronometrados e revise
          seus erros até dominar cada assunto — tudo em um só lugar.
        </p>
        <div className={styles.heroActions}>
          <Link to="/login" className={styles.btnPrimary}>
            <i className="ti ti-rocket" aria-hidden="true"></i> Começar agora
          </Link>
          <a href="#precos" className={styles.btnSecondary}>Ver preço</a>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <div className={styles.heroStatValue}>{totalQuestoes}+</div>
            <div className={styles.heroStatLabel}>Questões reais</div>
          </div>
          <div className={styles.heroStatDivider}></div>
          <div className={styles.heroStat}>
            <div className={styles.heroStatValue}>4</div>
            <div className={styles.heroStatLabel}>Áreas do conhecimento</div>
          </div>
          <div className={styles.heroStatDivider}></div>
          <div className={styles.heroStat}>
            <div className={styles.heroStatValue}>24/7</div>
            <div className={styles.heroStatLabel}>Explicações por IA</div>
          </div>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Tudo que você precisa para estudar melhor</h2>
          <p className={styles.sectionSub}>Quatro modos de estudo pensados para cada etapa da sua preparação.</p>
        </div>
        <div className={styles.featuresGrid}>
          {FEATURES.map(f => (
            <div className={styles.featureCard} key={f.title}>
              <div className={styles.featureIcon}>
                <i className={`ti ${f.icon}`} aria-hidden="true"></i>
              </div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Todas as áreas do ENEM</h2>
          <p className={styles.sectionSub}>Questões organizadas por área e por assunto, prontas para você filtrar.</p>
        </div>
        <div className={styles.areasGrid}>
          {AREAS.map(a => (
            <div className={styles.areaCard} data-cor={a.cor} key={a.nome}>
              <i className={`ti ${a.icone}`} aria-hidden="true"></i>
              <span>{a.nome}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Como funciona</h2>
          <p className={styles.sectionSub}>Em três passos simples você já está estudando.</p>
        </div>
        <div className={styles.passosGrid}>
          {PASSOS.map(p => (
            <div className={styles.passoCard} key={p.numero}>
              <div className={styles.passoNumero}>{p.numero}</div>
              <h3 className={styles.passoTitulo}>{p.titulo}</h3>
              <p className={styles.passoDesc}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="precos" className={styles.pricingSection}>
        <div className={styles.pricingCard}>
          <span className={styles.pricingBadge}>Pagamento único</span>
          <div className={styles.pricingValue}>
            <span className={styles.pricingCurrency}>R$</span>25
          </div>
          <p className={styles.pricingSub}>Acesso completo até o ENEM</p>
          <ul className={styles.pricingList}>
            <li><i className="ti ti-check" aria-hidden="true"></i> Todas as questões e áreas liberadas</li>
            <li><i className="ti ti-check" aria-hidden="true"></i> Explicações ilimitadas por IA</li>
            <li><i className="ti ti-check" aria-hidden="true"></i> Simulados cronometrados ilimitados</li>
            <li><i className="ti ti-check" aria-hidden="true"></i> Revisão de erros e acompanhamento de desempenho</li>
            <li><i className="ti ti-check" aria-hidden="true"></i> Sem mensalidade, sem renovação</li>
          </ul>
          <Link to="/login" className={styles.pricingCta}>
            <i className="ti ti-rocket" aria-hidden="true"></i> Quero começar agora
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          Estuda<span className={styles.logoAccent}>ENEM</span>
        </div>
        <p className={styles.footerText}>Estude com questões reais e feedback inteligente por IA.</p>
      </footer>
    </div>
  )
}
