import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './Perfil.module.css'

const AREA_ORDER = ['Matemática', 'Ciências da Natureza', 'Ciências Humanas', 'Linguagens']

export default function Perfil() {
  const { user } = useAuth()
  const [respostas, setRespostas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase.from('respostas').select('*').eq('user_id', user.id).then(({ data }) => {
      setRespostas(data || [])
      setLoading(false)
    })
  }, [user])

  if (loading) return <div className={styles.loading}>Carregando...</div>

  const total = respostas.length
  const acertos = respostas.filter(r => r.correta).length
  const erros = total - acertos
  const pct = total > 0 ? Math.round((acertos / total) * 100) : 0

  const byArea = {}
  respostas.forEach(r => {
    if (!byArea[r.area]) byArea[r.area] = { c: 0, t: 0 }
    byArea[r.area].t++
    if (r.correta) byArea[r.area].c++
  })

  const byAssunto = {}
  respostas.forEach(r => {
    if (!byAssunto[r.assunto]) byAssunto[r.assunto] = { c: 0, t: 0 }
    byAssunto[r.assunto].t++
    if (r.correta) byAssunto[r.assunto].c++
  })
  const assuntosSorted = Object.entries(byAssunto).sort((a, b) => b[1].t - a[1].t)

  const areasSorted = Object.entries(byArea).sort(
    (a, b) => AREA_ORDER.indexOf(a[0]) - AREA_ORDER.indexOf(b[0])
  )

  if (total === 0) {
    return (
      <div className={styles.empty}>
        <i className="ti ti-chart-bar" aria-hidden="true"></i>
        <p>Responda algumas questões para ver suas estatísticas aqui.</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Desempenho</h1>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Respondidas</div>
          <div className={styles.statValue}>{total}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Acertos</div>
          <div className={`${styles.statValue} ${styles.green}`}>{acertos}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Erros</div>
          <div className={`${styles.statValue} ${styles.red}`}>{erros}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Taxa de acerto</div>
          <div className={`${styles.statValue} ${styles.purple}`}>{pct}%</div>
        </div>
      </div>

      <div className={styles.block}>
        <div className={styles.blockTitle}>Desempenho por área</div>
        <div className={styles.bars}>
          {areasSorted.map(([area, { c, t }]) => {
            const p = Math.round((c / t) * 100)
            return (
              <div className={styles.barRow} key={area}>
                <div className={styles.barLabel}>{area}</div>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} data-area={area} style={{ width: p + '%' }}></div>
                </div>
                <div className={styles.barPct}>{p}%</div>
                <div className={styles.barCount}>{c}/{t}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className={styles.block}>
        <div className={styles.blockTitle}>Desempenho por assunto</div>
        <div className={styles.assuntos}>
          {assuntosSorted.map(([assunto, { c, t }]) => {
            const p = Math.round((c / t) * 100)
            const cor = p >= 60 ? 'var(--green-text)' : p >= 40 ? 'var(--yellow)' : 'var(--red-text)'
            return (
              <div className={styles.assuntoRow} key={assunto}>
                <span className={styles.assuntoName}>{assunto}</span>
                <span className={styles.assuntoPct} style={{ color: cor }}>{p}%</span>
                <span className={styles.assuntoCount}>{c}/{t}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
