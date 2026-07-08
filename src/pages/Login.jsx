import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import styles from './Login.module.css'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('entrar')
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
    if (mode === 'criar' && password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'entrar') {
        const { error } = await signIn(email, password)
        if (error) throw error
        navigate('/app/questoes')
      } else {
        const { error } = await signUp(email, password, nome)
        if (error) throw error
        setSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
      }
    } catch (err) {
      setError(traduzErro(err.message))
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  function switchMode(m) {
    setMode(m)
    setError('')
    setSuccess('')
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
          <p className={styles.subtitle}>Questões reais com correção e explicação por IA</p>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'entrar' ? styles.tabActive : ''}`}
            onClick={() => switchMode('entrar')}
          >
            Entrar
          </button>
          <button
            className={`${styles.tab} ${mode === 'criar' ? styles.tabActive : ''}`}
            onClick={() => switchMode('criar')}
          >
            Criar conta
          </button>
        </div>

        <div className={styles.form}>
          {mode === 'criar' && (
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
          )}

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
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKey}
              autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
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

          <button
            className={styles.submit}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <span className={styles.dots}>Aguarde<span>.</span><span>.</span><span>.</span></span>
            ) : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </div>

        <p className={styles.footer}>
          <i className="ti ti-infinity" aria-hidden="true"></i>
          Acesso completo até o ENEM · pagamento único de R$25
        </p>
      </div>
    </div>
  )
}

function traduzErro(msg = '') {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.'
  if (m.includes('already registered')) return 'Esse e-mail já tem uma conta. Faça login.'
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.'
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde um momento.'
  return msg || 'Algo deu errado. Tente novamente.'
}
