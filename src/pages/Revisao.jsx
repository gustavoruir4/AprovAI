import { useState, useMemo, useEffect, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { QUESTIONS } from '../lib/questions'
import styles from './Revisao.module.css'

function limparTexto(texto) {
  return texto
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/\*(.+?)\*/gs, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^---+$/gm, '')
    .replace(/^===+$/gm, '')
    .replace(/^\|(.+)\|$/gm, (match, inner) => {
      const cols = inner.split('|').map(c => c.trim()).filter(c => c && !c.match(/^-+$/))
      if (cols.length === 0) return ''
      if (cols.length === 1) return cols[0]
      return '• ' + cols.join(' – ')
    })
    .replace(/^\|[-|:\s]+\|$/gm, '')
    .replace(/^[-–]\s+/gm, '• ')
    .replace(/^>\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function ExplicacaoTexto({ texto, className }) {
  const ref = useRef(null)
  const limpo = limparTexto(texto)

  useEffect(() => {
    if (!ref.current) return
    const tryRender = () => {
      if (window.renderMathInElement) {
        window.renderMathInElement(ref.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true },
          ],
          throwOnError: false,
        })
      } else {
        setTimeout(tryRender, 100)
      }
    }
    tryRender()
  }, [limpo])

  const paragrafos = limpo.split('\n\n').filter(p => p.trim())

  return (
    <div className={className} ref={ref}>
      {paragrafos.map((p, i) => {
        const linhas = p.split('\n').filter(l => l.trim())
        if (linhas.length > 1) {
          return (
            <div key={i} style={{ marginBottom: i < paragrafos.length - 1 ? '0.85rem' : 0 }}>
              {linhas.map((linha, j) => (
                <p key={j} style={{ marginBottom: j < linhas.length - 1 ? '0.35rem' : 0 }}>{linha}</p>
              ))}
            </div>
          )
        }
        return (
          <p key={i} style={{ marginBottom: i < paragrafos.length - 1 ? '0.85rem' : 0 }}>{p}</p>
        )
      })}
    </div>
  )
}

async function getExplanation(question) {
  const { data: cached } = await supabase
    .from('explicacoes')
    .select('explicacao')
    .eq('question_id', question.id)
    .single()

  if (cached?.explicacao) return cached.explicacao

  const opcaoCorreta = question.opcoes.find(o => o.letra === question.correta)

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/explicacao`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        question_id: question.id,
        enunciado: question.enunciado,
        correta: question.correta,
        opcao_correta_texto: opcaoCorreta?.texto || '',
      })
    }
  )

  const data = await res.json()
  const explicacao = data.explicacao || ''

  if (explicacao) {
    await supabase.from('explicacoes').insert({ question_id: question.id, explicacao })
  }

  return explicacao
}

const AREA_ICONS = {
  'Matemática': 'ti-math-symbols',
  'Ciências da Natureza': 'ti-flask',
  'Ciências Humanas': 'ti-books',
  'Linguagens': 'ti-language',
}

export default function Revisao() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [pendentes, setPendentes] = useState([])
  const [stage, setStage] = useState('list') // list | reviewing | finished
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [sessionStats, setSessionStats] = useState({ acertos: 0, erros: 0 })

  const questionsById = useMemo(() => new Map(QUESTIONS.map(q => [q.id, q])), [])

  useEffect(() => {
    if (!user) return
    supabase
      .from('respostas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const ultimaPorQuestao = new Map()
        ;(data || []).forEach(r => ultimaPorQuestao.set(r.question_id, r))

        const errosPendentes = [...ultimaPorQuestao.values()]
          .filter(r => !r.correta)
          .map(r => questionsById.get(r.question_id))
          .filter(Boolean)

        setPendentes(errosPendentes)
        setLoading(false)
      })
  }, [user, questionsById])

  const q = pendentes[qIndex] || null
  const total = pendentes.length

  function iniciarRevisao() {
    setQIndex(0)
    setSelected(null)
    setAnswered(false)
    setAiText('')
    setSessionStats({ acertos: 0, erros: 0 })
    setStage('reviewing')
  }

  async function handleAnswer() {
    if (!selected || !q) return
    const isCorrect = selected === q.correta
    setAnswered(true)
    setSessionStats(prev => ({
      acertos: prev.acertos + (isCorrect ? 1 : 0),
      erros: prev.erros + (isCorrect ? 0 : 1),
    }))

    if (user) {
      await supabase.from('respostas').insert({
        user_id: user.id,
        question_id: q.id,
        area: q.area,
        assunto: q.assunto,
        prova: q.prova,
        ano: q.ano,
        correta: isCorrect,
        resposta_dada: selected,
      })
    }

    setAiLoading(true)
    try {
      const text = await getExplanation(q)
      setAiText(text || 'Não foi possível gerar a explicação.')
    } catch {
      setAiText('Não foi possível gerar a explicação. Tente novamente.')
    }
    setAiLoading(false)
  }

  function nextQuestion() {
    setSelected(null)
    setAnswered(false)
    setAiText('')
    setAiLoading(false)

    if (qIndex + 1 >= total) {
      setStage('finished')
      return
    }
    setQIndex(qIndex + 1)
  }

  if (loading) return <div className={styles.loading}>Carregando...</div>

  // ── Sem erros pendentes ──
  if (stage === 'list' && total === 0) {
    return (
      <div className={styles.empty}>
        <i className="ti ti-mood-smile" aria-hidden="true"></i>
        <p>Você não tem erros pendentes para revisar. Continue praticando!</p>
      </div>
    )
  }

  // ── Tela de listagem ──
  if (stage === 'list') {
    return (
      <div className={styles.page}>
        <div className={styles.introCard}>
          <div className={styles.introIcon}><i className="ti ti-refresh-dot" aria-hidden="true"></i></div>
          <h1 className={styles.introTitle}>Revisão de erros</h1>
          <p className={styles.introSub}>
            Você tem <strong>{total}</strong> {total === 1 ? 'questão' : 'questões'} que errou e ainda não acertou. Revise-as agora.
          </p>
          <button className={styles.btnPrimary} onClick={iniciarRevisao}>
            <i className="ti ti-player-play" aria-hidden="true"></i> Começar revisão
          </button>
        </div>

        <div className={styles.list}>
          {pendentes.map(item => (
            <div className={styles.item} key={item.id}>
              <div className={styles.itemInfo}>
                <div className={styles.itemAssunto}>{item.assunto}</div>
                <div className={styles.itemMeta}>
                  <span className={styles.metaArea} data-area={item.area}>{item.area}</span>
                  <span className={styles.dot}>·</span>
                  {item.prova} {item.ano}
                </div>
              </div>
              <span className={`${styles.badge} ${styles.badgeRed}`}>
                <i className="ti ti-x" aria-hidden="true"></i> Erro
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Tela de conclusão ──
  if (stage === 'finished') {
    const pct = total > 0 ? Math.round((sessionStats.acertos / total) * 100) : 0
    return (
      <div className={styles.finishWrap}>
        <div className={styles.finishCard}>
          <div className={styles.finishIcon}>
            <i className="ti ti-confetti" aria-hidden="true"></i>
          </div>
          <h2 className={styles.finishTitle}>Revisão concluída!</h2>
          <p className={styles.finishSub}>Veja quantas você corrigiu nesta rodada</p>

          <div className={styles.finishStats}>
            <div className={styles.finishStat}>
              <div className={styles.finishStatValue} style={{ color: 'var(--green-text)' }}>{sessionStats.acertos}</div>
              <div className={styles.finishStatLabel}>Corrigidas</div>
            </div>
            <div className={styles.finishDivider}></div>
            <div className={styles.finishStat}>
              <div className={styles.finishStatValue} style={{ color: 'var(--red-text)' }}>{sessionStats.erros}</div>
              <div className={styles.finishStatLabel}>Ainda erradas</div>
            </div>
            <div className={styles.finishDivider}></div>
            <div className={styles.finishStat}>
              <div className={styles.finishStatValue} style={{ color: 'var(--purple-bright)' }}>{pct}%</div>
              <div className={styles.finishStatLabel}>Aproveitamento</div>
            </div>
          </div>

          <button className={styles.btnPrimary} onClick={() => window.location.reload()}>
            <i className="ti ti-refresh" aria-hidden="true"></i> Atualizar lista
          </button>
        </div>
      </div>
    )
  }

  // ── Tela de prática ──
  if (!q) return null

  return (
    <div className={styles.page}>
      <div className={styles.progressWrap}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${(qIndex / total) * 100}%` }}></div>
        </div>
        <span className={styles.progressText}>
          <strong>{qIndex}</strong> de {total} revisadas
        </span>
      </div>

      <div className={styles.card}>
        <div className={styles.meta}>
          <span className={`${styles.badge} ${styles.badgeProva}`}>
            <i className="ti ti-calendar" aria-hidden="true"></i> {q.prova} {q.ano}
          </span>
          <span className={styles.badgeArea} data-area={q.area}>
            <i className={`ti ${AREA_ICONS[q.area] || 'ti-book'}`} aria-hidden="true"></i> {q.area}
          </span>
          <span className={styles.badgeAssunto}>{q.assunto}</span>
        </div>

        <p className={styles.enunciado}>{q.enunciado}</p>

        <div className={styles.options}>
          {q.opcoes.map(op => {
            let cls = styles.option
            if (answered) {
              if (op.letra === q.correta) cls += ` ${styles.optionCorrect}`
              else if (op.letra === selected) cls += ` ${styles.optionWrong}`
            } else if (op.letra === selected) {
              cls += ` ${styles.optionSelected}`
            }
            return (
              <button
                key={op.letra}
                className={cls}
                onClick={() => !answered && setSelected(op.letra)}
                disabled={answered}
              >
                <span className={styles.letra}>{op.letra}</span>
                <span className={styles.opText}>{op.texto}</span>
                {answered && op.letra === q.correta && (
                  <i className={`ti ti-check ${styles.opIcon}`} style={{ color: 'var(--green-text)' }} aria-hidden="true"></i>
                )}
                {answered && op.letra === selected && op.letra !== q.correta && (
                  <i className={`ti ti-x ${styles.opIcon}`} style={{ color: 'var(--red-text)' }} aria-hidden="true"></i>
                )}
              </button>
            )
          })}
        </div>

        {answered && (
          <div className={styles.explicacaoBox}>
            <div className={styles.explicacaoHeader}>
              <i className="ti ti-sparkles" aria-hidden="true"></i>
              <span>Explicação da IA</span>
              {selected === q.correta ? (
                <span className={`${styles.resultTag} ${styles.resultOk}`}>
                  <i className="ti ti-circle-check" aria-hidden="true"></i> Você acertou
                </span>
              ) : (
                <span className={`${styles.resultTag} ${styles.resultErr}`}>
                  <i className="ti ti-circle-x" aria-hidden="true"></i> Você errou
                </span>
              )}
            </div>
            {aiLoading ? (
              <div className={styles.dots}>
                Carregando explicação<span>.</span><span>.</span><span>.</span>
              </div>
            ) : (
              <ExplicacaoTexto texto={aiText} className={styles.aiText} />
            )}
          </div>
        )}

        <div className={styles.actions}>
          {!answered ? (
            <button className={styles.btnPrimary} onClick={handleAnswer} disabled={!selected}>
              Confirmar resposta
            </button>
          ) : (
            <button className={styles.btnPrimary} onClick={nextQuestion}>
              {qIndex + 1 >= total ? 'Concluir revisão' : 'Próxima questão'} <i className="ti ti-arrow-right" aria-hidden="true"></i>
            </button>
          )}
          <span className={styles.counter}>{qIndex + 1} / {total}</span>
        </div>
      </div>
    </div>
  )
}
