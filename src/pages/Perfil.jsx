import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './Perfil.module.css'

function formatarData(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return '—'
  }
}

function formatarValor(v) {
  if (v == null) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Perfil() {
  const { user } = useAuth()
  const fileInputRef = useRef(null)

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [feedback, setFeedback] = useState(null) // { tipo: 'ok'|'erro', msg }

  const [cobranca, setCobranca] = useState(null)
  const [cobrancaLoading, setCobrancaLoading] = useState(true)

  // Carrega dados do usuário
  useEffect(() => {
    if (!user) return
    const meta = user.user_metadata || {}
    setNome(meta.nome || meta.full_name || '')
    setTelefone(meta.telefone || '')
    setAvatarUrl(meta.avatar_url || '')
  }, [user])

  // Carrega dados de cobrança da tabela acessos
  useEffect(() => {
    let ativo = true
    async function carregarCobranca() {
      if (!user) { setCobrancaLoading(false); return }
      const { data } = await supabase
        .from('acessos')
        .select('status, valor, paid_at, created_at, payment_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (ativo) {
        setCobranca(data || null)
        setCobrancaLoading(false)
      }
    }
    carregarCobranca()
    return () => { ativo = false }
  }, [user])

  function mostrarFeedback(tipo, msg) {
    setFeedback({ tipo, msg })
    setTimeout(() => setFeedback(null), 4000)
  }

  async function salvarPerfil() {
    setSalvando(true)
    setFeedback(null)
    const { error } = await supabase.auth.updateUser({
      data: { nome, telefone, avatar_url: avatarUrl },
    })
    setSalvando(false)
    if (error) {
      mostrarFeedback('erro', 'Não foi possível salvar. Tente novamente.')
    } else {
      mostrarFeedback('ok', 'Perfil atualizado com sucesso!')
    }
  }

  async function handleFotoSelecionada(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      mostrarFeedback('erro', 'Selecione um arquivo de imagem.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      mostrarFeedback('erro', 'A imagem deve ter no máximo 2MB.')
      return
    }

    setUploadingFoto(true)
    setFeedback(null)

    const ext = file.name.split('.').pop()
    const caminho = `${user.id}/avatar.${ext}`

    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(caminho, file, { upsert: true, cacheControl: '3600' })

    if (upErr) {
      setUploadingFoto(false)
      mostrarFeedback('erro', 'Falha ao enviar a foto. Verifique se o bucket "avatars" existe.')
      return
    }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(caminho)
    const urlComCache = `${pub.publicUrl}?t=${Date.now()}`
    setAvatarUrl(urlComCache)

    // Salva na conta imediatamente
    await supabase.auth.updateUser({ data: { avatar_url: urlComCache } })

    setUploadingFoto(false)
    mostrarFeedback('ok', 'Foto atualizada!')
  }

  function iniciais() {
    const base = nome || user?.email || '?'
    return base.trim().charAt(0).toUpperCase()
  }

  const temAcesso = cobranca?.status === 'pago' || cobranca?.status === 'ativo' || cobranca?.paid_at

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Meu perfil</h1>
        <p className={styles.subtitle}>Gerencie seus dados e veja informações da sua conta</p>
      </header>

      {feedback && (
        <div className={`${styles.feedback} ${feedback.tipo === 'ok' ? styles.feedbackOk : styles.feedbackErr}`}>
          <i className={`ti ti-${feedback.tipo === 'ok' ? 'circle-check' : 'alert-circle'}`} aria-hidden="true"></i>
          {feedback.msg}
        </div>
      )}

      {/* Card de identidade */}
      <section className={styles.card}>
        <div className={styles.avatarRow}>
          <div className={styles.avatarWrap}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Foto de perfil" className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarPlaceholder}>{iniciais()}</div>
            )}
            <button
              className={styles.avatarBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFoto}
              title="Trocar foto"
            >
              <i className={`ti ti-${uploadingFoto ? 'loader-2' : 'camera'}`} aria-hidden="true"></i>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFotoSelecionada}
              style={{ display: 'none' }}
            />
          </div>
          <div className={styles.avatarInfo}>
            <span className={styles.avatarNome}>{nome || 'Sem nome'}</span>
            <span className={styles.avatarEmail}>{user?.email}</span>
          </div>
        </div>
      </section>

      {/* Card de dados editáveis */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Dados pessoais</h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="nome">Nome</label>
          <input
            id="nome"
            className={styles.input}
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Seu nome"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="telefone">Telefone</label>
          <input
            id="telefone"
            className={styles.input}
            type="tel"
            value={telefone}
            onChange={e => setTelefone(e.target.value)}
            placeholder="(00) 00000-0000"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">E-mail</label>
          <input
            id="email"
            className={`${styles.input} ${styles.inputDisabled}`}
            type="email"
            value={user?.email || ''}
            disabled
          />
          <span className={styles.hint}>O e-mail não pode ser alterado por aqui.</span>
        </div>

        <button className={styles.btnPrimary} onClick={salvarPerfil} disabled={salvando}>
          {salvando ? (
            <><i className="ti ti-loader-2" aria-hidden="true"></i> Salvando...</>
          ) : (
            <><i className="ti ti-device-floppy" aria-hidden="true"></i> Salvar alterações</>
          )}
        </button>
      </section>

      {/* Card de plano/cobrança */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Meu plano</h2>

        {cobrancaLoading ? (
          <div className={styles.planoLoading}>
            <i className="ti ti-loader-2" aria-hidden="true"></i> Carregando...
          </div>
        ) : temAcesso ? (
          <>
            <div className={styles.planoBadge}>
              <i className="ti ti-crown" aria-hidden="true"></i> Acesso vitalício ativo
            </div>
            <div className={styles.planoGrid}>
              <div className={styles.planoItem}>
                <span className={styles.planoLabel}>Valor pago</span>
                <span className={styles.planoValue}>{formatarValor(cobranca.valor)}</span>
              </div>
              <div className={styles.planoItem}>
                <span className={styles.planoLabel}>Data do pagamento</span>
                <span className={styles.planoValue}>{formatarData(cobranca.paid_at || cobranca.created_at)}</span>
              </div>
              <div className={styles.planoItem}>
                <span className={styles.planoLabel}>Status</span>
                <span className={styles.planoValue} style={{ textTransform: 'capitalize' }}>{cobranca.status || 'pago'}</span>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.planoInativo}>
            <p>Você ainda não tem acesso vitalício.</p>
            <a href="/pagamento" className={styles.btnPrimary} style={{ marginTop: '0.75rem', display: 'inline-flex' }}>
              <i className="ti ti-rocket" aria-hidden="true"></i> Garantir acesso por R$39,90
            </a>
          </div>
        )}
      </section>
    </div>
  )
}