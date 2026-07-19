import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './TesteGratis.module.css'

export default function TesteGratis() {
  const { signUp, signIn } = useAuth()
  const navigate = useNavigate()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit() {
    setError('')
    setSuccess('')

    if (!email || !password) {
      setError('Preencha e-mail e senha.')
      return
    }
    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      const { data, error: signUpError } = await signUp(email, password, nome)
      if (signUpError) throw signUpError

      // Se o projeto exigir confirmação de e-mail, a sessão pode não vir na hora.
      // Entramos explicitamente primeiro para garantir uma sessão autenticada
      // antes de gravar a linha de trial: a RLS de testes_gratis exige
      // auth.uid() = user_id, e sem sessão o insert falha (silenciosamente,
      // se o erro não for checado) e o usuário cai sem trial dentro do app,
      // sendo mandado pro /pagamento pelo usePagamentoGuard.
      const { data: signInData, error: signInError } = await signIn(email, password)
      if (signInError) {
        setSuccess('Conta criada! Confirme seu e-mail para começar o teste grátis.')
        return
      }

      // Cria a linha de trial (começa em 0). A RLS só deixa criar com 0.
      const novoUserId = signInData?.user?.id ?? data?.user?.id
      if (novoUserId) {
        const { error: trialError } = await supabase
          .from('testes_gratis')
          .insert({ user_id: novoUserId, questoes_usadas: 0 })
        // 23505 = linha já existe (ex.: clique duplo). Qualquer outro erro
        // bloqueia o fluxo, senão o usuário seria mandado pro app sem trial.
        if (trialError && trialError.code !== '23505') throw trialError
      }

      setSuccess('Conta criada! Redirecionando para suas 20 questões grátis...')
      setTimeout(() => navigate('/app/questoes'), 1000)
    } catch (err) {
      setError(traduzErro(err.message))
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true"></div>

      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.freeBadge}>
            <i className="ti ti-gift" aria-hidden="true"></i> 20 questões grátis
          </span>
          <h1 className={styles.title}>Comece seu teste grátis</h1>
          <p className={styles.subtitle}>
            Sem cartão, sem pegadinha. Crie sua conta e resolva 20 questões completas,
            com explicação da IA em cada uma.
          </p>
        </div>

        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Nome</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Como quer ser chamado"
              value={nome}
              onChange={e => setNome(e.target.value)}
              onKeyDown={handleKey}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>E-mail</label>
            <input
              className={styles.input}
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKey}
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Senha</label>
            <input
              className={styles.input}
              type="password"
              placeholder="mínimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKey}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className={styles.error}>
              <i className="ti ti-alert-circle" aria-hidden="true"></i> {error}
            </div>
          )}
          {success && (
            <div className={styles.success}>
              <i className="ti ti-circle-check" aria-hidden="true"></i> {success}
            </div>
          )}

          <button className={styles.submit} onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <span className={styles.dots}>Criando<span>.</span><span>.</span><span>.</span></span>
            ) : (
              <><i className="ti ti-player-play" aria-hidden="true"></i> Começar as 20 questões grátis</>
            )}
          </button>
        </div>

        <p className={styles.footer}>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
        <p className={styles.upsell}>
          Quer acesso ilimitado? <Link to="/pagamento">Ver o acesso vitalício por R$39,90</Link>
        </p>
      </div>
    </div>
  )
}

function traduzErro(msg = '') {
  const m = (msg || '').toLowerCase()
  if (m.includes('already registered')) return 'Esse e-mail já tem uma conta. Faça login para continuar.'
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde um momento.'
  if (m.includes('invalid') && m.includes('email')) return 'E-mail inválido.'
  return msg || 'Algo deu errado. Tente novamente.'
}
