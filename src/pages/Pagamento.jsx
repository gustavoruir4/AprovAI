import { useState } from 'react'
import styles from './Pagamento.module.css'

const PRECO = 'R$ 39,90'

const BENEFICIOS = [
  'Todas as questões e áreas liberadas',
  'Explicações ilimitadas por IA',
  'Simulados cronometrados ilimitados',
  'Revisão de erros e acompanhamento de desempenho',
  'Sem mensalidade, sem renovação',
]

function formatCPF(value) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function formatTelefone(value) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

function validarCPF(cpfDigits) {
  if (cpfDigits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpfDigits)) return false

  const calcularDigito = (base) => {
    let soma = 0
    for (let i = 0; i < base.length; i++) {
      soma += parseInt(base[i], 10) * (base.length + 1 - i)
    }
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  const base9 = cpfDigits.slice(0, 9)
  const digito1 = calcularDigito(base9)
  const digito2 = calcularDigito(base9 + digito1)

  return digito1 === parseInt(cpfDigits[9], 10) && digito2 === parseInt(cpfDigits[10], 10)
}

export default function Pagamento() {
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handlePagar() {
    setError('')

    if (!email || !email.includes('@')) {
      setError('Informe um e-mail válido.')
      return
    }
    if (!nome.trim()) {
      setError('Informe seu nome completo.')
      return
    }
    const cpfDigits = cpf.replace(/\D/g, '')
    if (!validarCPF(cpfDigits)) {
      setError('CPF inválido.')
      return
    }
    const telefoneDigits = telefone.replace(/\D/g, '')
    if (telefoneDigits.length < 10) {
      setError('Informe um WhatsApp válido, com DDD.')
      return
    }

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
          body: JSON.stringify({
            email,
            nome: nome.trim(),
            cpf: cpfDigits,
            telefone: telefoneDigits,
          }),
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

  function handleKey(e) {
    if (e.key === 'Enter') handlePagar()
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
          <p className={styles.subtitle}>Garanta seu acesso completo até o ENEM</p>
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

        <div className={styles.field}>
          <label className={styles.label}>Seu e-mail</label>
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
          <label className={styles.label}>Nome completo</label>
          <input
            className={styles.input}
            type="text"
            placeholder="Como está no seu documento"
            value={nome}
            onChange={e => setNome(e.target.value)}
            onKeyDown={handleKey}
            autoComplete="name"
          />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>CPF</label>
            <input
              className={styles.input}
              type="text"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={e => setCpf(formatCPF(e.target.value))}
              onKeyDown={handleKey}
              inputMode="numeric"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>WhatsApp</label>
            <input
              className={styles.input}
              type="text"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={e => setTelefone(formatTelefone(e.target.value))}
              onKeyDown={handleKey}
              inputMode="numeric"
            />
          </div>
        </div>

        {error && (
          <div className={styles.error}>
            <i className="ti ti-alert-circle" aria-hidden="true"></i> {error}
          </div>
        )}

        <button className={styles.submit} onClick={handlePagar} disabled={loading}>
          {loading ? (
            <span className={styles.dots}>Preparando pagamento<span>.</span><span>.</span><span>.</span></span>
          ) : (
            <>
              <i className="ti ti-credit-card" aria-hidden="true"></i> Pagar {PRECO}
            </>
          )}
        </button>

        <p className={styles.footer}>
          <i className="ti ti-lock" aria-hidden="true"></i>
          Pagamento seguro via Pix
        </p>
      </div>
    </div>
  )
}
