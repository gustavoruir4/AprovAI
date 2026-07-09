import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import styles from './Pagamento.module.css'

const PRECO = 'R$ 39,90'

const BENEFICIOS = [
  'Todas as questões e áreas liberadas',
  'Explicações ilimitadas por IA',
  'Simulados cronometrados ilimitados',
  'Revisão de erros e acompanhamento de desempenho',
  'Sem mensalidade, sem renovação',
]

export default function Pagamento() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handlePagar() {
    if (!user) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pagamento`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ user_id: user.id, email: user.email }),
        }
      )
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Não foi possível iniciar o pagamento.')
      window.location.href = data.url
    } catch (err) {
      setError(err.message || 'Algo deu errado. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true"></div>

      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoMark}>
            <i className="ti ti-school" aria-hidden="true"></i>
          </div>
          <h1 className={styles.title}>Estuda<span>ENEM</span></h1>
          <p className={styles.subtitle}>Finalize seu acesso e comece a estudar agora</p>
        </div>

        <div className={styles.resumo}>
          <div className={styles.resumoLinha}>
            <span className={styles.resumoItem}>EstudaENEM — Acesso Completo</span>
            <span className={styles.resumoPreco}>{PRECO}</span>
          </div>
          <p className={styles.resumoDesc}>Pagamento único, acesso completo à plataforma até o ENEM.</p>
        </div>

        <ul className={styles.beneficios}>
          {BENEFICIOS.map(b => (
            <li key={b}>
              <i className="ti ti-check" aria-hidden="true"></i> {b}
            </li>
          ))}
        </ul>

        {error && (
          <div className={styles.error}>
            <i className="ti ti-alert-circle" aria-hidden="true"></i> {error}
          </div>
        )}

        {user ? (
          <button className={styles.submit} onClick={handlePagar} disabled={loading}>
            {loading ? (
              <span className={styles.dots}>Preparando pagamento<span>.</span><span>.</span><span>.</span></span>
            ) : (
              <>
                <i className="ti ti-credit-card" aria-hidden="true"></i> Pagar com PIX ou Cartão
              </>
            )}
          </button>
        ) : (
          <>
            <p className={styles.loginPrompt}>Crie uma conta ou entre para continuar com o pagamento.</p>
            <Link to="/login" className={styles.submit}>
              <i className="ti ti-login" aria-hidden="true"></i> Entrar ou criar conta
            </Link>
          </>
        )}

        <p className={styles.footer}>
          <i className="ti ti-lock" aria-hidden="true"></i>
          Pagamento seguro via Pix ou cartão
        </p>
      </div>
    </div>
  )
}
