import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './Admin.module.css'

const ADMIN_EMAIL = 'gustavoruir4@gmail.com'

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [usuarios, setUsuarios] = useState([])
  const [respostas, setRespostas] = useState([])
  const [explicacoes, setExplicacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [userSelecionado, setUserSelecionado] = useState(null)
  const [userStats, setUserStats] = useState(null)

  // Bloqueia acesso se não for admin
  useEffect(() => {
    if (user && user.email !== ADMIN_EMAIL) {
      navigate('/')
    }
  }, [user])

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) {
      carregarDados()
    }
  }, [user])

  async function carregarDados() {
    setLoading(true)

    const { data: respostasData } = await supabase
      .from('respostas')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: explicacoesData } = await supabase
      .from('explicacoes')
      .select('question_id, created_at')

    setRespostas(respostasData || [])
    setExplicacoes(explicacoesData || [])

    // Agrupa usuários a partir das respostas
    const usersMap = {}
    ;(respostasData || []).forEach(r => {
      if (!usersMap[r.user_id]) {
        usersMap[r.user_id] = {
          user_id: r.user_id,
          total: 0,
          acertos: 0,
          ultima: r.created_at,
        }
      }
      usersMap[r.user_id].total++
      if (r.correta) usersMap[r.user_id].acertos++
    })
    setUsuarios(Object.values(usersMap))
    setLoading(false)
  }

  async function limparMinhasStats() {
    if (!confirm('Apagar todo o seu histórico de respostas?')) return
    await supabase.from('respostas').delete().eq('user_id', user.id)
    setMsg('Seu histórico foi apagado.')
    carregarDados()
  }

  async function limparStatsUsuario(userId) {
    if (!confirm('Apagar todo o histórico deste usuário?')) return
    await supabase.from('respostas').delete().eq('user_id', userId)
    setMsg('Histórico do usuário apagado.')
    setUserSelecionado(null)
    setUserStats(null)
    carregarDados()
  }

  async function verStatsUsuario(userId) {
    setUserSelecionado(userId)
    const respostasUser = respostas.filter(r => r.user_id === userId)
    const total = respostasUser.length
    const acertos = respostasUser.filter(r => r.correta).length

    const byArea = {}
    respostasUser.forEach(r => {
      if (!byArea[r.area]) byArea[r.area] = { c: 0, t: 0 }
      byArea[r.area].t++
      if (r.correta) byArea[r.area].c++
    })

    setUserStats({ total, acertos, byArea, historico: respostasUser.slice(0, 10) })
  }

  async function limparCacheExplicacoes() {
    if (!confirm('Apagar todas as explicações em cache? Elas serão geradas novamente quando necessário.')) return
    await supabase.from('explicacoes').delete().neq('question_id', 0)
    setMsg('Cache de explicações apagado.')
    carregarDados()
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return <div className={styles.loading}>Carregando painel...</div>

  const totalRespostas = respostas.length
  const totalAcertos = respostas.filter(r => r.correta).length
  const taxaGeral = totalRespostas > 0 ? Math.round((totalAcertos / totalRespostas) * 100) : 0

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Painel de Administração</h1>
        <span className={styles.badge}>Admin</span>
      </div>

      {msg && (
        <div className={styles.msgBox}>
          <i className="ti ti-circle-check" aria-hidden="true"></i> {msg}
          <button onClick={() => setMsg('')} className={styles.msgClose}>×</button>
        </div>
      )}

      {/* Cards de resumo */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Usuários ativos</div>
          <div className={styles.statValue}>{usuarios.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total de respostas</div>
          <div className={styles.statValue}>{totalRespostas}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Taxa de acerto geral</div>
          <div className={styles.statValue} style={{color: taxaGeral >= 60 ? '#1D9E75' : '#E24B4A'}}>{taxaGeral}%</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Explicações em cache</div>
          <div className={styles.statValue}>{explicacoes.length}</div>
        </div>
      </div>

      {/* Ações rápidas */}
      <div className={styles.block}>
        <div className={styles.blockTitle}>Ações rápidas</div>
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={limparMinhasStats}>
            <i className="ti ti-trash" aria-hidden="true"></i> Limpar minhas stats
          </button>
          <button className={`${styles.btn} ${styles.btnWarning}`} onClick={limparCacheExplicacoes}>
            <i className="ti ti-refresh" aria-hidden="true"></i> Limpar cache de explicações
          </button>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={carregarDados}>
            <i className="ti ti-reload" aria-hidden="true"></i> Atualizar dados
          </button>
        </div>
      </div>

      {/* Lista de usuários */}
      <div className={styles.block}>
        <div className={styles.blockTitle}>Usuários ({usuarios.length})</div>
        {usuarios.length === 0 ? (
          <p className={styles.empty}>Nenhum usuário com respostas ainda.</p>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>ID do usuário</span>
              <span>Questões</span>
              <span>Acertos</span>
              <span>Taxa</span>
              <span>Ações</span>
            </div>
            {usuarios.map(u => {
              const taxa = u.total > 0 ? Math.round((u.acertos / u.total) * 100) : 0
              const isMe = u.user_id === user.id
              return (
                <div className={`${styles.tableRow} ${isMe ? styles.tableRowMe : ''}`} key={u.user_id}>
                  <span className={styles.userId}>
                    {u.user_id.slice(0, 8)}...
                    {isMe && <span className={styles.meTag}>você</span>}
                  </span>
                  <span>{u.total}</span>
                  <span style={{color:'#1D9E75'}}>{u.acertos}</span>
                  <span style={{color: taxa >= 60 ? '#1D9E75' : '#E24B4A'}}>{taxa}%</span>
                  <span className={styles.rowActions}>
                    <button className={styles.btnSm} onClick={() => verStatsUsuario(u.user_id)}>
                      <i className="ti ti-eye" aria-hidden="true"></i> Ver
                    </button>
                    <button className={`${styles.btnSm} ${styles.btnSmDanger}`} onClick={() => limparStatsUsuario(u.user_id)}>
                      <i className="ti ti-trash" aria-hidden="true"></i> Limpar
                    </button>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Stats do usuário selecionado */}
      {userSelecionado && userStats && (
        <div className={styles.block}>
          <div className={styles.blockTitleRow}>
            <div className={styles.blockTitle}>Stats do usuário: {userSelecionado.slice(0, 8)}...</div>
            <button className={styles.btnGhostSm} onClick={() => { setUserSelecionado(null); setUserStats(null) }}>Fechar</button>
          </div>

          <div className={styles.userStatsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total</div>
              <div className={styles.statValue}>{userStats.total}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Acertos</div>
              <div className={styles.statValue} style={{color:'#1D9E75'}}>{userStats.acertos}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Erros</div>
              <div className={styles.statValue} style={{color:'#E24B4A'}}>{userStats.total - userStats.acertos}</div>
            </div>
          </div>

          <div className={styles.blockSubTitle}>Por área</div>
          {Object.entries(userStats.byArea).map(([area, {c, t}]) => {
            const p = Math.round((c/t)*100)
            return (
              <div className={styles.barRow} key={area}>
                <div className={styles.barLabel}>{area}</div>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{width: p+'%', background: p >= 60 ? '#1D9E75' : '#E24B4A'}}></div>
                </div>
                <div className={styles.barPct}>{p}%</div>
              </div>
            )
          })}

          <div className={styles.blockSubTitle} style={{marginTop:'1rem'}}>Últimas 10 respostas</div>
          {userStats.historico.map((r, i) => (
            <div className={styles.histItem} key={i}>
              <div>
                <div className={styles.histAssunto}>{r.assunto}</div>
                <div className={styles.histMeta}>{r.area} · {r.prova} {r.ano} · {formatDate(r.created_at)}</div>
              </div>
              {r.correta
                ? <span className={`${styles.tag} ${styles.tagGreen}`}>Acerto</span>
                : <span className={`${styles.tag} ${styles.tagRed}`}>Erro</span>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
