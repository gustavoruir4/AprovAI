import { Link } from 'react-router-dom'
import styles from './TrialFinalizado.module.css'

// Datas oficiais dos vestibulares 2026 cobertos pela plataforma
const PROVAS_DATAS = [
  { nome: 'ENEM', data: '2026-11-08' },
  { nome: 'FUVEST', data: '2026-11-01' },
  { nome: 'UNICAMP', data: '2026-10-18' },
  { nome: 'UNESP', data: '2026-11-22' },
]

function diasAte(dataISO) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const alvo = new Date(`${dataISO}T00:00:00`)
  const diffMs = alvo.getTime() - hoje.getTime()
  return Math.max(0, Math.ceil(diffMs / 86400000))
}

export default function TrialFinalizado({ sessionStats, areaStats }) {
  const totalRespondidas = sessionStats.acertos + sessionStats.erros
  const taxaAcerto = totalRespondidas > 0 ? Math.round((sessionStats.acertos / totalRespondidas) * 100) : 0

  const areasComDados = Object.entries(areaStats)
    .map(([area, { acertos, erros }]) => ({
      area,
      total: acertos + erros,
      taxa: acertos + erros > 0 ? acertos / (acertos + erros) : 0,
    }))
    .filter(a => a.total > 0)

  const piorArea = areasComDados.length > 0
    ? [...areasComDados].sort((a, b) => a.taxa - b.taxa)[0]
    : null
  const melhorArea = areasComDados.length > 0
    ? [...areasComDados].sort((a, b) => b.taxa - a.taxa)[0]
    : null

  let frase
  if (melhorArea && piorArea && melhorArea.area !== piorArea.area && melhorArea.taxa > piorArea.taxa) {
    frase = `Você está indo bem em ${melhorArea.area}, mas ${piorArea.area} precisa de atenção. Continue praticando antes que seja tarde.`
  } else if (piorArea) {
    frase = `Seu aproveitamento em ${piorArea.area} foi de ${Math.round(piorArea.taxa * 100)}%. Continue praticando pra consolidar esse resultado.`
  } else {
    frase = 'Continue praticando pra construir uma base sólida antes da prova.'
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerIcon}><i className="ti ti-lock" aria-hidden="true"></i></div>
        <h1 className={styles.headerTitle}>Você usou suas 20 questões grátis!</h1>
        <p className={styles.headerSub}>Esperamos que tenha gostado. Aqui está um resumo do que você fez.</p>
      </div>

      {/* 1. Resumo de desempenho */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{totalRespondidas}</div>
          <div className={styles.statLabel}>Respondidas</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: 'var(--green-text)' }}>{sessionStats.acertos}</div>
          <div className={styles.statLabel}>Acertos</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue} style={{ color: 'var(--purple-bright)' }}>{taxaAcerto}%</div>
          <div className={styles.statLabel}>Taxa de acerto</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statValue} ${styles.statValueArea}`} style={{ color: 'var(--red-text)' }}>
            {piorArea ? piorArea.area : '—'}
          </div>
          <div className={styles.statLabel}>Ponto de atenção</div>
        </div>
      </div>

      {/* 2. Frase de continuidade */}
      <p className={styles.fraseContinuidade}>{frase}</p>

      {/* 3. Contagem regressiva pros vestibulares */}
      <div className={styles.provasGrid}>
        {PROVAS_DATAS.map(p => (
          <div className={styles.provaCard} key={p.nome}>
            <div className={styles.provaDias}>{diasAte(p.data)}</div>
            <div className={styles.provaLabel}>dias para o {p.nome}</div>
          </div>
        ))}
      </div>

      {/* 4. Comparação de preço */}
      <div className={styles.comparacao}>
        <div className={styles.comparacaoItem}>
          <span className={styles.comparacaoLabel}>Cursinho presencial</span>
          <span className={styles.comparacaoValor}>R$800<span>/mês</span></span>
        </div>
        <i className={`ti ti-arrow-right ${styles.comparacaoSeta}`} aria-hidden="true"></i>
        <div className={styles.comparacaoItem}>
          <span className={styles.comparacaoLabel}>
            <span className={styles.logoAprov}>Aprov</span><span className={styles.logoAI}>AI</span>
          </span>
          <span className={`${styles.comparacaoValor} ${styles.comparacaoValorDestaque}`}>R$39,90<span>uma única vez</span></span>
        </div>
      </div>

      {/* 5. Card de oferta */}
      <div className={styles.ofertaCard}>
        <span className={styles.ofertaBadge}><span className={styles.fireEmoji}>🔥</span> Oferta de lançamento</span>
        <div className={styles.ofertaPrecos}>
          <span className={styles.ofertaPrecoAntigo}>de R$69,90 por</span>
          <div className={styles.ofertaPrecoAtual}><span className={styles.ofertaMoeda}>R$</span>39,90</div>
        </div>
        <ul className={styles.ofertaLista}>
          <li><i className="ti ti-check" aria-hidden="true"></i> Todas as questões e áreas liberadas</li>
          <li><i className="ti ti-check" aria-hidden="true"></i> Explicações ilimitadas por IA</li>
          <li><i className="ti ti-check" aria-hidden="true"></i> Simulados cronometrados ilimitados</li>
          <li><i className="ti ti-check" aria-hidden="true"></i> Revisão de erros e acompanhamento de desempenho</li>
          <li><i className="ti ti-check" aria-hidden="true"></i> Sem mensalidade, sem renovação</li>
        </ul>
        <Link to="/pagamento" className={styles.ofertaCta}>
          <i className="ti ti-rocket" aria-hidden="true"></i> Garantir meu acesso vitalício
        </Link>
        <span className={styles.ofertaSafe}>PIX aprovado na hora ou cartão de crédito</span>
      </div>

      {/* 6. Objeções */}
      <div className={styles.objecoes}>
        <p className={styles.objecao}><strong>E se eu não gostar?</strong> Sem problema — é pagamento único, sem renovação automática.</p>
        <p className={styles.objecao}><strong>Funciona no celular?</strong> Sim, funciona em qualquer dispositivo.</p>
      </div>
    </div>
  )
}
