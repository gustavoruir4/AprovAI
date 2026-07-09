import { Link } from 'react-router-dom'
import styles from './PagamentoErro.module.css'

export default function PagamentoErro() {
  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true"></div>

      <div className={styles.card}>
        <div className={styles.icon}>
          <i className="ti ti-mood-sad" aria-hidden="true"></i>
        </div>
        <h1 className={styles.title}>Ops, algo deu errado com seu pagamento</h1>
        <p className={styles.subtitle}>
          Não foi possível concluir sua compra. Nenhum valor foi cobrado — você pode tentar novamente.
        </p>

        <Link to="/pagamento" className={styles.submit}>
          <i className="ti ti-refresh" aria-hidden="true"></i> Tentar novamente
        </Link>
      </div>
    </div>
  )
}
